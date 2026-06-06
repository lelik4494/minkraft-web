let world, player, renderer;
let gameRunning = false;
let lastTime = 0;
let animFrame;

// --- UI helpers ---
function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }
function el(id) { return document.getElementById(id); }

// --- Menu setup ---
el('btn-play').onclick = () => { hide('menu'); startGame(); };
el('btn-options').onclick = () => alert('Настройки: Render Distance = 12, FOV = 60°');
el('btn-lang').onclick = () => alert('Язык: Русский ✓');
el('btn-quit').onclick = () => alert('В браузерной версии выход недоступен 😊');

// --- Start Game ---
function startGame() {
  show('game-screen');
  world = new World();
  const canvas = el('gameCanvas');
  renderer = new Renderer(canvas, world);
  player = new Player(world);

  buildHUD();
  buildInventoryGrid();
  requestPointerLock();

  // Pointer lock events
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      player.lock();
    } else {
      player.unlock();
    }
  });

  canvas.onclick = () => { if (!document.pointerLockElement) requestPointerLock(); };

  // Right-click place block
  canvas.addEventListener('mousedown', e => {
    if (e.button === 2 && gameRunning) {
      const eye = player.getEyePos();
      const dir = player.getLookDir();
      const ray = world.raycast(eye.x, eye.y, eye.z, dir.dx, dir.dy, dir.dz);
      player.placeBlock(ray);
      updateHUD();
    }
  });

  gameRunning = true;
  lastTime = performance.now();
  animFrame = requestAnimationFrame(gameLoop);

  // Keyboard for pause/inventory
  document.addEventListener('keydown', onGameKey);
}

function requestPointerLock() {
  el('gameCanvas').requestPointerLock();
}

function onGameKey(e) {
  if (!gameRunning) return;
  if (e.code === 'Escape') {
    if (!el('pause-menu').classList.contains('hidden')) {
      resumeGame();
    } else if (!el('inventory-screen').classList.contains('hidden')) {
      hide('inventory-screen');
      requestPointerLock();
    } else {
      pauseGame();
    }
  }
  if (e.code === 'KeyE') {
    if (!el('inventory-screen').classList.contains('hidden')) {
      hide('inventory-screen');
      requestPointerLock();
    } else {
      document.exitPointerLock();
      show('inventory-screen');
    }
  }
  if (e.code === 'KeyF3') {
    el('debug-info').style.display = el('debug-info').style.display === 'none' ? 'block' : 'none';
  }
}

function pauseGame() {
  document.exitPointerLock();
  show('pause-menu');
}
function resumeGame() {
  hide('pause-menu');
  requestPointerLock();
}
el('btn-resume').onclick = resumeGame;
el('btn-back-menu').onclick = () => {
  hide('game-screen');
  hide('pause-menu');
  show('menu');
  gameRunning = false;
  cancelAnimationFrame(animFrame);
  document.exitPointerLock();
  document.removeEventListener('keydown', onGameKey);
};
el('btn-close-inv').onclick = () => { hide('inventory-screen'); requestPointerLock(); };

// --- Game Loop ---
function gameLoop(now) {
  if (!gameRunning) return;
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  // Don't update if paused
  const paused = !el('pause-menu').classList.contains('hidden') || !el('inventory-screen').classList.contains('hidden');
  if (!paused) {
    player.update(dt);

    // Raycast
    const eye = player.getEyePos();
    const dir = player.getLookDir();
    const ray = world.raycast(eye.x, eye.y, eye.z, dir.dx, dir.dy, dir.dz);

    // Block breaking
    player.handleBreaking(dt, ray);
    updateHUD();
    updateDebug(ray);

    // Render
    renderer.render(player, ray);
    drawBreakOverlay(ray, player.breakProgress);
    drawBlockOutline(ray, player, renderer);
  }

  animFrame = requestAnimationFrame(gameLoop);
}

// --- Draw block selection outline on canvas ---
function drawBlockOutline(ray, player, renderer) {
  if (!ray || !ray.hit) return;
  const ctx = renderer.ctx;
  const { x, y, z } = ray;
  const eye = player.getEyePos();
  const corners = [
    [x,y,z],[x+1,y,z],[x+1,y,z+1],[x,y,z+1],
    [x,y+1,z],[x+1,y+1,z],[x+1,y+1,z+1],[x,y+1,z+1],
  ];
  const proj = corners.map(([cx,cy,cz]) =>
    renderer.project(cx, cy, cz, eye.x, eye.y, eye.z, player.yaw, player.pitch)
  );
  if (proj.some(p => !p)) return;
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
  for (const [a,b] of edges) {
    if (!proj[a] || !proj[b]) continue;
    ctx.beginPath();
    ctx.moveTo(proj[a].sx, proj[a].sy);
    ctx.lineTo(proj[b].sx, proj[b].sy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// --- Break progress overlay ---
function drawBreakOverlay(ray, progress) {
  if (!ray || !ray.hit || progress <= 0) return;
  const canvas = el('gameCanvas');
  const ctx = renderer.ctx;
  const eye = player.getEyePos();
  const {x, y, z} = ray;
  const center = renderer.project(x+0.5, y+0.5, z+0.5, eye.x, eye.y, eye.z, player.yaw, player.pitch);
  if (!center) return;
  const size = Math.max(5, 80 / center.dist);
  ctx.fillStyle = `rgba(0,0,0,${0.4 * progress})`;
  ctx.fillRect(center.sx - size/2, center.sy - size/2, size * progress, size);
}

// --- HUD ---
function buildHUD() {
  const hotbar = el('hotbar');
  hotbar.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot' + (i === player.selectedSlot ? ' selected' : '');
    slot.id = `hslot-${i}`;
    slot.onclick = () => { player.selectedSlot = i; updateHUD(); };
    hotbar.appendChild(slot);
  }

  const hpBar = el('health-bar');
  hpBar.innerHTML = '';
  for (let i=0;i<10;i++) {
    const h = document.createElement('span');
    h.className = 'heart'; h.innerHTML = '❤️'; hpBar.appendChild(h);
  }
  const hunBar = el('hunger-bar');
  hunBar.innerHTML = '';
  for (let i=0;i<10;i++) {
    const f = document.createElement('span');
    f.className = 'food-icon'; f.innerHTML = '🍗'; hunBar.appendChild(f);
  }
  el('xp-bar').innerHTML = '<div id="xp-fill"></div>';
  updateHUD();
}

function updateHUD() {
  for (let i = 0; i < 9; i++) {
    const slot = el(`hslot-${i}`);
    if (!slot) continue;
    slot.className = 'hotbar-slot' + (i === player.selectedSlot ? ' selected' : '');
    const b = player.hotbar[i];
    const emoji = b ? (BLOCK_EMOJIS[b] || '📦') : '';
    const count = player.hotbarCounts[i] || 0;
    slot.innerHTML = `<span>${emoji}</span>${count > 1 ? `<span class="slot-count">${count}</span>` : ''}`;
  }
  // Update XP bar
  const xpFill = el('xp-fill');
  if (xpFill) xpFill.style.width = Math.min(100, player.xp % 100) + '%';
}

function buildInventoryGrid() {
  const grid = el('inv-grid');
  grid.innerHTML = '';
  const allBlocks = Object.values(BLOCKS).filter(b => b !== BLOCKS.AIR && b !== BLOCKS.BEDROCK);
  for (const b of allBlocks) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    slot.title = BLOCK_NAMES[b] || '';
    slot.innerHTML = BLOCK_EMOJIS[b] || '?';
    slot.onclick = () => {
      player.hotbar[player.selectedSlot] = b;
      player.hotbarCounts[player.selectedSlot] = 64;
      updateHUD();
    };
    grid.appendChild(slot);
  }
}

function updateDebug(ray) {
  const biome = world.getBiome(Math.floor(player.x), Math.floor(player.z));
  const b = ray && ray.hit ? BLOCK_NAMES[world.getBlock(ray.x, ray.y, ray.z)] : '';
  el('debug-info').innerHTML = `
    <b>Minecraft 1.20.1</b><br>
    XYZ: ${player.x.toFixed(1)} / ${player.y.toFixed(1)} / ${player.z.toFixed(1)}<br>
    Yaw: ${(player.yaw * 180/Math.PI).toFixed(1)}° Pitch: ${(player.pitch * 180/Math.PI).toFixed(1)}°<br>
    Biome: ${biome}<br>
    ${b ? `Block: ${b}` : ''}<br>
    Blocks: ${world.modified.size} changed<br>
    <span style="color:#aaffaa">F3 - debug | E - inventory | Esc - pause</span>
  `;
}
