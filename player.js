class Player {
  constructor(world) {
    this.world = world;
    this.x = 0.5; this.y = SEA_LEVEL + 5; this.z = 0.5;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0;    // 0 = смотрит в +Z
    this.pitch = 0;  // 0 = горизонт, + = вверх (в getLookDir минус)
    this.onGround = false;
    this.inWater = false;

    this.hotbar = [...DEFAULT_HOTBAR];
    this.hotbarCounts = new Array(9).fill(64);
    this.selectedSlot = 0;

    this.health = 20; this.maxHealth = 20;
    this.hunger = 20; this.maxHunger = 20;
    this.xp = 0; this.xpLevel = 0;

    this.breaking = false;
    this.breakProgress = 0;
    this.breakTarget = null;

    this.keys = {};
    this.rawDX = 0;  // накопленное движение мыши X
    this.rawDY = 0;  // накопленное движение мыши Y

    this._setupInput();
    this._findSpawn();
  }

  _findSpawn() {
    // Ищем с самого верха вниз, гарантированно находим поверхность
    for (let y = WORLD_HEIGHT - 1; y >= 1; y--) {
      const b = this.world.getBlock(0, y, 0);
      if (b !== BLOCKS.AIR && b !== BLOCKS.WATER && b !== BLOCKS.LEAVES) {
        this.y = y + 1;   // стоим прямо на блоке
        return;
      }
    }
    this.y = SEA_LEVEL + 2; // запасной вариант
  }

  _setupInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))
        e.preventDefault();
      if (e.code.startsWith('Digit')) {
        const n = parseInt(e.key) - 1;
        if (n >= 0 && n <= 8) this.selectedSlot = n;
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    // Мышь — накапливаем только когда pointer lock активен
    window.addEventListener('mousemove', e => {
      if (document.pointerLockElement) {
        this.rawDX += e.movementX;
        this.rawDY += e.movementY;
      }
    });

    window.addEventListener('mousedown', e => {
      if (!document.pointerLockElement) return;
      if (e.button === 0) { this.breaking = true; this.breakProgress = 0; }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) { this.breaking = false; this.breakProgress = 0; this.breakTarget = null; }
    });
    window.addEventListener('wheel', e => {
      e.preventDefault();
      this.selectedSlot = (this.selectedSlot + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
    }, { passive: false });
    window.addEventListener('contextmenu', e => e.preventDefault());
  }

  getEyePos() {
    return { x: this.x, y: this.y + 1.62, z: this.z };
  }

  getLookDir() {
    // yaw=0 → смотрим в +Z, yaw=PI/2 → смотрим в +X
    // pitch > 0 → смотрим вверх
    return {
      dx:  Math.sin(this.yaw) * Math.cos(this.pitch),
      dy:  Math.sin(this.pitch),
      dz:  Math.cos(this.yaw) * Math.cos(this.pitch),
    };
  }

  update(dt) {
    // ── Мышь → камера ──────────────────────────────────────────
    const SENS = 0.002;
    this.yaw   += this.rawDX * SENS;         // мышь вправо → yaw растёт → поворот вправо
    this.pitch += this.rawDY * SENS * -1;    // мышь вверх (movementY<0) → pitch растёт → смотрим вверх
    this.pitch  = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, this.pitch));
    this.rawDX  = 0;
    this.rawDY  = 0;

    // ── Движение ────────────────────────────────────────────────
    const SPEED  = this.keys['ShiftLeft'] ? 6.5 : 4.5;
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    let mx = 0, mz = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    { mx += sinYaw;  mz += cosYaw;  }
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  { mx -= sinYaw;  mz -= cosYaw;  }
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  { mx -= cosYaw;  mz += sinYaw;  }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) { mx += cosYaw;  mz -= sinYaw;  }
    const len = Math.sqrt(mx*mx + mz*mz);
    if (len > 0) { mx /= len; mz /= len; }

    this.vx = mx * SPEED;
    this.vz = mz * SPEED;

    // ── Прыжок / вода ──────────────────────────────────────────
    if (this.keys['Space'] && this.onGround && !this.inWater) {
      this.vy = 8.5; this.onGround = false;
    }
    if (this.keys['Space'] && this.inWater) {
      this.vy = Math.min(this.vy + 12 * dt, 3.5);
    }

    // ── Гравитация ──────────────────────────────────────────────
    this.vy -= (this.inWater ? 5 : 28) * dt;
    if (this.inWater) this.vy = Math.max(this.vy, -2);

    // ── Физика ──────────────────────────────────────────────────
    this._move(this.vx * dt, this.vy * dt, this.vz * dt);

    if (this.y < -10) { this.y = SEA_LEVEL + 10; this.vy = 0; }

    const bx = Math.floor(this.x), by = Math.floor(this.y + 0.9), bz = Math.floor(this.z);
    this.inWater = this.world.getBlock(bx, by, bz) === BLOCKS.WATER;
  }

  _move(dx, dy, dz) {
    const W = 0.29, H = 1.79;

    this.y += dy;
    if (this._collides(W, H)) {
      if (dy < 0) { this.onGround = true; this.y = Math.ceil(this.y - 0.001); }
      else        { this.y -= dy; }
      this.vy = 0;
    } else if (dy < -0.01) {
      this.onGround = false;
    }

    this.x += dx;
    if (this._collides(W, H)) { this.x -= dx; }

    this.z += dz;
    if (this._collides(W, H)) { this.z -= dz; }
  }

  _collides(W, H) {
    const x0=this.x-W, x1=this.x+W-0.001;
    const y0=this.y,   y1=this.y+H-0.001;
    const z0=this.z-W, z1=this.z+W-0.001;
    for (let bx=Math.floor(x0); bx<=Math.floor(x1); bx++)
    for (let by=Math.floor(y0); by<=Math.floor(y1); by++)
    for (let bz=Math.floor(z0); bz<=Math.floor(z1); bz++) {
      const b = this.world.getBlock(bx, by, bz);
      if (b!==BLOCKS.AIR && b!==BLOCKS.WATER && b!==BLOCKS.FLOWER && b!==BLOCKS.TORCH) return true;
    }
    return false;
  }

  handleBreaking(dt, ray) {
    if (!this.breaking || !ray || !ray.hit) {
      this.breakProgress = 0; this.breakTarget = null; return false;
    }
    const key = `${ray.x},${ray.y},${ray.z}`;
    if (this.breakTarget !== key) { this.breakTarget = key; this.breakProgress = 0; }
    const b = this.world.getBlock(ray.x, ray.y, ray.z);
    const hard = BLOCK_HARDNESS[b] ?? 5;
    if (hard === Infinity) return false;
    this.breakProgress += dt * (3.5 / Math.max(0.5, hard));
    if (this.breakProgress >= 1) {
      this.world.setBlock(ray.x, ray.y, ray.z, BLOCKS.AIR);
      this.breakProgress = 0; this.breakTarget = null;
      const slot = this.hotbar.indexOf(b);
      if (slot >= 0) this.hotbarCounts[slot] = Math.min(64, this.hotbarCounts[slot] + 1);
      return true;
    }
    return false;
  }

  placeBlock(ray) {
    if (!ray || !ray.hit || ray.nx === undefined) return;
    const sel = this.hotbar[this.selectedSlot];
    if (!sel || sel === BLOCKS.AIR) return;
    this.world.setBlock(ray.nx, ray.ny, ray.nz, sel);
    if (this.hotbarCounts[this.selectedSlot] > 1) this.hotbarCounts[this.selectedSlot]--;
  }
}
