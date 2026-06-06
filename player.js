class Player {
  constructor(world) {
    this.world = world;
    // Spawn position
    this.x = 0;
    this.y = SEA_LEVEL + 5;
    this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.inWater = false;

    // Inventory / hotbar
    this.hotbar = [...DEFAULT_HOTBAR];
    this.hotbarCounts = new Array(9).fill(64);
    this.selectedSlot = 0;

    // Health & hunger
    this.health = 20;
    this.maxHealth = 20;
    this.hunger = 20;
    this.maxHunger = 20;
    this.xp = 0;
    this.xpLevel = 0;

    // Breaking
    this.breaking = false;
    this.breakProgress = 0;
    this.breakTarget = null;

    // Input state
    this.keys = {};
    this.mouseButtons = {};
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;

    this.setupInput();
    this.findSpawnHeight();
  }

  findSpawnHeight() {
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
      if (this.world.getBlock(0, y, 0) !== BLOCKS.AIR) {
        this.y = y + 2;
        break;
      }
    }
  }

  setupInput() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
      // Hotbar selection
      if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.replace('Digit','')) - 1;
        if (n >= 0 && n <= 8) this.selectedSlot = n;
      }
    });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });

    document.addEventListener('mousedown', e => {
      if (!this.locked) return;
      this.mouseButtons[e.button] = true;
      if (e.button === 0) { this.breaking = true; this.breakProgress = 0; }
    });
    document.addEventListener('mouseup', e => {
      this.mouseButtons[e.button] = false;
      if (e.button === 0) { this.breaking = false; this.breakProgress = 0; this.breakTarget = null; }
    });
    document.addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    document.addEventListener('wheel', e => {
      this.selectedSlot = (this.selectedSlot + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  lock() { this.locked = true; }
  unlock() { this.locked = false; }

  getEyePos() { return { x: this.x, y: this.y + 1.6, z: this.z }; }

  getLookDir() {
    const dx = Math.sin(this.yaw) * Math.cos(this.pitch);
    const dy = -Math.sin(this.pitch);
    const dz = Math.cos(this.yaw) * Math.cos(this.pitch);
    return { dx, dy, dz };
  }

  update(dt) {
    // Mouse look
    const sens = 0.002;
    this.yaw += this.mouseDX * sens;
    this.pitch -= this.mouseDY * sens;
    this.pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, this.pitch));
    this.mouseDX = 0; this.mouseDY = 0;

    // Movement
    const speed = (this.keys['ShiftLeft'] ? 5 : 4.3) * dt;
    const flySpeed = 8 * dt;
    const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);

    let mx = 0, mz = 0;
    if (this.keys['KeyW']) { mx += sinY; mz += cosY; }
    if (this.keys['KeyS']) { mx -= sinY; mz -= cosY; }
    if (this.keys['KeyA']) { mx -= cosY; mz += sinY; }
    if (this.keys['KeyD']) { mx += cosY; mz -= sinY; }
    const len = Math.sqrt(mx*mx+mz*mz);
    if (len > 0) { mx/=len; mz/=len; }
    this.vx = mx * speed * 20;
    this.vz = mz * speed * 20;

    // Jump
    if (this.keys['Space'] && this.onGround) {
      this.vy = 8;
      this.onGround = false;
    }
    if (this.keys['Space'] && this.inWater) {
      this.vy = 3;
    }

    // Gravity
    const gravity = this.inWater ? 2 : 20;
    this.vy -= gravity * dt;
    if (this.inWater) this.vy = Math.max(this.vy, -2);

    // Apply movement
    this.moveWithCollision(this.vx * dt, this.vy * dt, this.vz * dt);

    // Water check
    const wx = Math.floor(this.x), wy = Math.floor(this.y + 0.5), wz = Math.floor(this.z);
    this.inWater = this.world.getBlock(wx, wy, wz) === BLOCKS.WATER;
  }

  moveWithCollision(dx, dy, dz) {
    const W = 0.3, H = 1.8;
    // Y first
    this.y += dy;
    if (this.checkCollision(W, H)) {
      if (dy < 0) this.onGround = true;
      this.y -= dy;
      this.y = Math.round(this.y * 10) / 10;
      this.vy = 0;
    } else {
      this.onGround = false;
    }
    // X
    this.x += dx;
    if (this.checkCollision(W, H)) { this.x -= dx; this.vx = 0; }
    // Z
    this.z += dz;
    if (this.checkCollision(W, H)) { this.z -= dz; this.vz = 0; }

    // Void
    if (this.y < -5) { this.y = SEA_LEVEL + 10; this.vy = 0; this.health = 20; }
  }

  checkCollision(W, H) {
    const minX = this.x - W, maxX = this.x + W;
    const minY = this.y, maxY = this.y + H;
    const minZ = this.z - W, maxZ = this.z + W;
    for (let bx = Math.floor(minX); bx <= Math.floor(maxX); bx++) {
      for (let by = Math.floor(minY); by <= Math.floor(maxY); by++) {
        for (let bz = Math.floor(minZ); bz <= Math.floor(maxZ); bz++) {
          const b = this.world.getBlock(bx, by, bz);
          if (b !== BLOCKS.AIR && b !== BLOCKS.WATER && b !== BLOCKS.FLOWER && b !== BLOCKS.TORCH) return true;
        }
      }
    }
    return false;
  }

  handleBreaking(dt, rayResult) {
    if (!this.breaking || !rayResult.hit) {
      this.breakProgress = 0;
      this.breakTarget = null;
      return false;
    }
    const key = `${rayResult.x},${rayResult.y},${rayResult.z}`;
    if (this.breakTarget !== key) {
      this.breakTarget = key;
      this.breakProgress = 0;
    }
    const b = this.world.getBlock(rayResult.x, rayResult.y, rayResult.z);
    const hardness = BLOCK_HARDNESS[b] || 5;
    if (hardness === Infinity) return false;
    this.breakProgress += dt * (1 / hardness) * 4;
    if (this.breakProgress >= 1) {
      this.world.setBlock(rayResult.x, rayResult.y, rayResult.z, BLOCKS.AIR);
      this.breakProgress = 0;
      this.breakTarget = null;
      // Add to inventory
      const slot = this.hotbar.indexOf(b);
      if (slot >= 0) this.hotbarCounts[slot] = Math.min(64, this.hotbarCounts[slot] + 1);
      return true;
    }
    return false;
  }

  placeBlock(rayResult) {
    if (!rayResult.hit || rayResult.nx === undefined) return;
    const sel = this.hotbar[this.selectedSlot];
    if (!sel || sel === BLOCKS.AIR) return;
    this.world.setBlock(rayResult.nx, rayResult.ny, rayResult.nz, sel);
    if (this.hotbarCounts[this.selectedSlot] > 1) {
      this.hotbarCounts[this.selectedSlot]--;
    }
  }

  getSelectedBlock() { return this.hotbar[this.selectedSlot]; }
}
