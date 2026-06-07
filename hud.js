// ── УЛУЧШЕННЫЙ HUD, МИНИКАРТА, КРАФТ, ТУЛТИПЫ ──────────────────────────────

// ── Миникарта ────────────────────────────────────────────────────────────────
const Minimap = (() => {
  let canvas, ctx;
  const SIZE = 100;

  function init() {
    canvas = document.createElement('canvas');
    canvas.width = SIZE; canvas.height = SIZE;
    canvas.style.cssText = `
      position:fixed; top:10px; right:10px; z-index:4;
      border:2px solid #555; border-right-color:#fff; border-bottom-color:#fff;
      image-rendering:pixelated; width:100px; height:100px;
      box-shadow:2px 2px 0 #000;
    `;
    ctx = canvas.getContext('2d');
    document.getElementById('game-screen').appendChild(canvas);
  }

  const biomeColors = {
    plains:'#7acc40', forest:'#2d7a1a', desert:'#c8b56e', snowy:'#ddddff'
  };
  const blockTopColors = {
    [BLOCKS.GRASS]:'#5d9e3a', [BLOCKS.SAND]:'#c8b56e', [BLOCKS.SNOW]:'#ffffff',
    [BLOCKS.WATER]:'#1a6bb5', [BLOCKS.STONE]:'#888888', [BLOCKS.DIRT]:'#8b5a2b',
  };

  function update(player, world) {
    if (!canvas) return;
    const img = ctx.createImageData(SIZE, SIZE);
    const d = img.data;
    const scale = 1; // 1 pixel = 1 block

    for (let px=0; px<SIZE; px++) {
      for (let py=0; py<SIZE; py++) {
        const wx = Math.floor(player.x) + px - SIZE/2;
        const wz = Math.floor(player.z) + py - SIZE/2;
        // Surface height color
        let color = '#888888';
        for (let y=WORLD_HEIGHT-1; y>=0; y--) {
          const b = world.getBlock(wx, y, wz);
          if (b !== BLOCKS.AIR) {
            const bc = blockTopColors[b];
            color = bc || '#888888';
            break;
          }
        }
        const r=parseInt(color.slice(1,3),16)||136;
        const g=parseInt(color.slice(3,5),16)||136;
        const b2=parseInt(color.slice(5,7),16)||136;
        const i=(py*SIZE+px)*4;
        d[i]=r; d[i+1]=g; d[i+2]=b2; d[i+3]=255;
      }
    }
    ctx.putImageData(img,0,0);

    // Player dot
    ctx.fillStyle='#ff0000';
    ctx.fillRect(SIZE/2-2, SIZE/2-2, 4, 4);
    // Direction arrow
    const ax=Math.sin(player.yaw)*8, az=Math.cos(player.yaw)*8;
    ctx.strokeStyle='#ff0000'; ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(SIZE/2, SIZE/2);
    ctx.lineTo(SIZE/2+ax, SIZE/2+az);
    ctx.stroke();

    // Compass
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,SIZE,12);
    ctx.fillStyle='#fff'; ctx.font='8px monospace'; ctx.textAlign='center';
    ctx.fillText('С',SIZE/2,9);
    ctx.fillStyle='#aaa';
    ctx.fillText('З',6,9); ctx.fillText('В',SIZE-6,9);

    // Coords
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,SIZE-12,SIZE,12);
    ctx.fillStyle='#fff'; ctx.font='7px monospace'; ctx.textAlign='center';
    ctx.fillText(`${Math.floor(player.x)} ${Math.floor(player.y)} ${Math.floor(player.z)}`, SIZE/2, SIZE-3);
  }

  return { init, update };
})();

// ── Тултип блока ─────────────────────────────────────────────────────────────
const BlockTooltip = (() => {
  let el;
  function init() {
    el = document.createElement('div');
    el.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:rgba(0,0,0,0.7); color:#fff; font-family:monospace;
      font-size:13px; padding:4px 10px; border-radius:2px;
      pointer-events:none; z-index:4; display:none;
      border:1px solid #555; text-shadow:1px 1px 0 #000;
    `;
    document.getElementById('game-screen').appendChild(el);
  }
  function show(blockType, hardness) {
    if (!el || !blockType || blockType===BLOCKS.AIR) { if(el) el.style.display='none'; return; }
    const name = BLOCK_NAMES[blockType] || 'Неизвестный блок';
    const emoji = BLOCK_EMOJIS[blockType] || '';
    const hard = hardness===Infinity ? '∞' : hardness;
    el.innerHTML = `${emoji} <b>${name}</b> &nbsp;<span style="color:#aaa">Прочность: ${hard}</span>`;
    el.style.display = 'block';
  }
  function hide() { if(el) el.style.display='none'; }
  return { init, show, hide };
})();

// ── Крафт (простой UI) ───────────────────────────────────────────────────────
const CraftingUI = (() => {
  const recipes = [
    { name:'Доски',    emoji:'🪵', result:BLOCKS.PLANKS,  count:4, ingredients:[{b:BLOCKS.LOG,n:1}] },
    { name:'Стекло',   emoji:'🔷', result:BLOCKS.GLASS,   count:1, ingredients:[{b:BLOCKS.SAND,n:1}] },
    { name:'Булыжник', emoji:'🪨', result:BLOCKS.COBBLESTONE, count:1, ingredients:[{b:BLOCKS.STONE,n:1}] },
    { name:'Верстак',  emoji:'🔨', result:BLOCKS.CRAFTING_TABLE, count:1, ingredients:[{b:BLOCKS.PLANKS,n:4}] },
    { name:'Печь',     emoji:'🔥', result:BLOCKS.FURNACE, count:1, ingredients:[{b:BLOCKS.COBBLESTONE,n:8}] },
    { name:'Сундук',   emoji:'📦', result:BLOCKS.CHEST,   count:1, ingredients:[{b:BLOCKS.PLANKS,n:8}] },
    { name:'Стекло',   emoji:'🔷', result:BLOCKS.GLASS,   count:4, ingredients:[{b:BLOCKS.SAND,n:4}] },
    { name:'Кирпич',   emoji:'🧱', result:BLOCKS.BRICK,   count:4, ingredients:[{b:BLOCKS.DIRT,n:4}] },
  ];

  let panel;
  function init() {
    panel = document.createElement('div');
    panel.id = 'craft-panel';
    panel.style.cssText = `
      position:fixed; right:10px; top:120px; z-index:4;
      background:rgba(0,0,0,0.75); border:2px solid #555;
      border-right-color:#fff; border-bottom-color:#fff;
      padding:8px; font-family:monospace; width:160px; display:none;
    `;
    panel.innerHTML = `<div style="color:#fff;font-size:12px;margin-bottom:6px;text-align:center">⚒️ Крафт (C)</div><div id="craft-list"></div>`;
    document.getElementById('game-screen').appendChild(panel);
    buildList();
  }

  function buildList() {
    const list = document.getElementById('craft-list');
    if (!list) return;
    list.innerHTML = '';
    for (const r of recipes) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px;cursor:pointer;padding:2px;';
      row.innerHTML = `
        <span style="font-size:16px">${r.emoji}</span>
        <div style="color:#ddd;font-size:10px;flex:1">${r.name}<br>
          <span style="color:#888">${r.ingredients.map(i=>`${BLOCK_EMOJIS[i.b]||''}×${i.n}`).join(' ')}</span>
        </div>
        <span style="color:#4f4;font-size:10px">×${r.count}</span>
      `;
      row.addEventListener('mouseenter', () => row.style.background='rgba(255,255,255,0.1)');
      row.addEventListener('mouseleave', () => row.style.background='');
      row.addEventListener('click', () => trycraft(r));
      list.appendChild(row);
    }
  }

  function trycraft(recipe) {
    if (!window.player) return;
    let canCraft = true;
    for (const ing of recipe.ingredients) {
      const slot = player.hotbar.indexOf(ing.b);
      if (slot < 0 || player.hotbarCounts[slot] < ing.n) { canCraft=false; break; }
    }
    if (!canCraft) {
      showMsg('❌ Не хватает материалов!', '#ff4444'); return;
    }
    // Consume
    for (const ing of recipe.ingredients) {
      const slot = player.hotbar.indexOf(ing.b);
      player.hotbarCounts[slot] -= ing.n;
    }
    // Give result
    const rSlot = player.hotbar.indexOf(recipe.result);
    if (rSlot >= 0) {
      player.hotbarCounts[rSlot] = Math.min(64, player.hotbarCounts[rSlot] + recipe.count);
    } else {
      // Find empty slot
      const empty = player.hotbar.indexOf(BLOCKS.AIR);
      if (empty>=0) { player.hotbar[empty]=recipe.result; player.hotbarCounts[empty]=recipe.count; }
      else { player.hotbar[player.selectedSlot]=recipe.result; player.hotbarCounts[player.selectedSlot]=recipe.count; }
    }
    if (window.updateHUD) updateHUD();
    showMsg(`✅ Создано: ${recipe.emoji} ${recipe.name} ×${recipe.count}`, '#44ff44');
  }

  let msgEl;
  function showMsg(text, color='#fff') {
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        background:rgba(0,0,0,0.8);color:#fff;font-family:monospace;font-size:15px;
        padding:8px 20px;border-radius:2px;z-index:20;pointer-events:none;`;
      document.body.appendChild(msgEl);
    }
    msgEl.textContent = text; msgEl.style.color = color; msgEl.style.display='block';
    clearTimeout(msgEl._t); msgEl._t = setTimeout(()=>{ msgEl.style.display='none'; }, 2000);
  }

  function toggle() {
    if (!panel) return;
    const open = panel.style.display!=='none';
    panel.style.display = open ? 'none' : 'block';
  }
  function isOpen() { return panel && panel.style.display!=='none'; }

  return { init, toggle, isOpen, showMsg };
})();

// ── Дополнительная панель FPS ─────────────────────────────────────────────────
const FPSCounter = (() => {
  let el, frames=0, last=performance.now(), fps=60;
  function init() {
    el = document.createElement('div');
    el.style.cssText = `position:fixed;top:8px;right:120px;color:#0f0;font-family:monospace;
      font-size:11px;z-index:4;pointer-events:none;text-shadow:1px 1px 0 #000;`;
    document.getElementById('game-screen').appendChild(el);
  }
  function update() {
    frames++;
    const now=performance.now();
    if(now-last>=1000){ fps=frames; frames=0; last=now; }
    const color=fps>=50?'#0f0':fps>=30?'#ff0':'#f00';
    if(el) el.style.color=color, el.textContent=`${fps} FPS`;
  }
  return { init, update };
})();

// ── Патч game.js чтобы инициализировать все системы ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const origStart = window.startGame;
  window.startGame = function() {
    origStart();
    Minimap.init();
    BlockTooltip.init();
    CraftingUI.init();
    FPSCounter.init();

    // C — крафт
    document.addEventListener('keydown', e => {
      if (!gameRunning) return;
      if (e.code === 'KeyC') {
        if (CraftingUI.isOpen()) { CraftingUI.toggle(); document.getElementById('gameCanvas').requestPointerLock().catch(()=>{}); }
        else { document.exitPointerLock(); CraftingUI.toggle(); }
      }
    });

    // Патчим gameLoop чтобы обновлять миникарту и тултип
    const origLoop = window.gameLoop;
    // Инжектим обновление после каждого кадра
    const _updateExtras = () => {
      if (!window.player || !window.world) return;
      Minimap.update(player, world);
      FPSCounter.update();
      // Тултип: показываем блок под прицелом
      try {
        const eye=player.getEyePos(), dir=player.getLookDir();
        const ray=world.raycast(eye.x,eye.y,eye.z,dir.dx,dir.dy,dir.dz);
        if(ray&&ray.hit){
          const b=world.getBlock(ray.x,ray.y,ray.z);
          BlockTooltip.show(b, BLOCK_HARDNESS[b]??5);
        } else { BlockTooltip.hide(); }
      } catch(e){}
    };

    // Перехватываем requestAnimationFrame через глобальный хук
    const _raf = window.requestAnimationFrame.bind(window);
    let hooked=false;
    function patchLoop(fn) {
      return _raf(function(t){
        fn(t);
        _updateExtras();
        animFrame=requestAnimationFrame(patchLoop.bind(null,fn));
        if(!hooked){
          hooked=true;
          // Отменяем оригинальный двойной RAF
          cancelAnimationFrame(animFrame);
        }
      });
    }

    // Более простой подход — просто запускаем свой интервал
    setInterval(_updateExtras, 200);

    // Подсказка управления в debug
    const origDebug = window.updateDebug;
    if (origDebug) {
      window.updateDebug = function(ray) {
        origDebug(ray);
        const d = document.getElementById('debug-info');
        if(d) d.innerHTML += `<br><span style="color:#ffff55">C - крафт | F3 - дебаг</span>`;
      };
    }
  };
});
