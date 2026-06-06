// Simple seeded noise for world generation
class NoiseGen {
  constructor(seed) {
    this.seed = seed;
  }
  hash(x, z) {
    let h = this.seed ^ (x * 374761393 + z * 668265263);
    h = (h ^ (h >> 13)) * 1274126177;
    return (h ^ (h >> 16)) / 2147483648 + 0.5;
  }
  smooth(x, z, scale=1) {
    x /= scale; z /= scale;
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix, fz = z - iz;
    const ux = fx*fx*(3-2*fx), uz = fz*fz*(3-2*fz);
    const a = this.hash(ix, iz);
    const b = this.hash(ix+1, iz);
    const c = this.hash(ix, iz+1);
    const d = this.hash(ix+1, iz+1);
    return a + (b-a)*ux + (c-a)*uz + (d-c)*ux + (a-b)*ux*(1-uz) + ((b-a)-(d-c))*ux*uz;
  }
  octave(x, z, octs=4, scale=40) {
    let v=0, amp=1, freq=1, max=0;
    for(let i=0;i<octs;i++) {
      v += this.smooth(x*freq, z*freq, scale) * amp;
      max += amp; amp *= 0.5; freq *= 2;
    }
    return v / max;
  }
}

const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 64;
const SEA_LEVEL = 32;

class World {
  constructor() {
    this.chunks = new Map();
    this.seed = Math.floor(Math.random() * 100000);
    this.noise = new NoiseGen(this.seed);
    this.modified = new Map(); // manually placed/broken blocks
  }

  chunkKey(cx, cz) { return `${cx},${cz}`; }

  getChunk(cx, cz) {
    const key = this.chunkKey(cx, cz);
    if (!this.chunks.has(key)) this.generateChunk(cx, cz);
    return this.chunks.get(key);
  }

  generateChunk(cx, cz) {
    const data = new Uint8Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const height = this.getHeight(wx, wz);
        const biome = this.getBiome(wx, wz);

        for (let y = 0; y < WORLD_HEIGHT; y++) {
          let block = BLOCKS.AIR;
          if (y === 0) {
            block = BLOCKS.BEDROCK;
          } else if (y < height - 4) {
            block = BLOCKS.STONE;
            // Ores
            const oreNoise = this.noise.hash(wx * 31 + y, wz * 37 + y);
            if (y < 16 && oreNoise > 0.97) block = BLOCKS.DIAMOND_ORE;
            else if (y < 24 && oreNoise > 0.94) block = BLOCKS.GOLD_ORE;
            else if (oreNoise > 0.90) block = BLOCKS.IRON_ORE;
            else if (oreNoise > 0.85) block = BLOCKS.COAL_ORE;
          } else if (y < height - 1) {
            block = biome === 'desert' ? BLOCKS.SAND : (biome === 'snowy' ? BLOCKS.SNOW : BLOCKS.DIRT);
          } else if (y === height - 1) {
            if (biome === 'desert') block = BLOCKS.SAND;
            else if (biome === 'snowy') block = BLOCKS.SNOW;
            else block = BLOCKS.GRASS;
          } else if (y < SEA_LEVEL && block === BLOCKS.AIR) {
            block = BLOCKS.WATER;
          }
          data[this.localIndex(lx, y, lz)] = block;
        }

        // Trees (forest/plains biomes)
        if (biome === 'forest' || biome === 'plains') {
          const treeNoise = this.noise.hash(wx * 997, wz * 1009);
          if (treeNoise > 0.93 && height > SEA_LEVEL + 2) {
            this.placeTree(data, lx, height - 1, lz, cx, cz);
          }
        }
        // Cactus in desert
        if (biome === 'desert') {
          const cactNoise = this.noise.hash(wx * 1021, wz * 1031);
          if (cactNoise > 0.96 && height > SEA_LEVEL) {
            const h = height - 1;
            if (h + 2 < WORLD_HEIGHT) {
              for (let i = 0; i < 3; i++) {
                if (h+i < WORLD_HEIGHT) data[this.localIndex(lx, h+i, lz)] = BLOCKS.CACTUS;
              }
            }
          }
        }
        // Flowers
        if ((biome === 'plains' || biome === 'forest') && height > SEA_LEVEL) {
          const flNoise = this.noise.hash(wx * 1301, wz * 1303);
          if (flNoise > 0.97) {
            const h = height - 1;
            if (h + 1 < WORLD_HEIGHT && data[this.localIndex(lx, h, lz)] === BLOCKS.GRASS) {
              data[this.localIndex(lx, h+1, lz)] = BLOCKS.FLOWER;
            }
          }
        }
      }
    }
    this.chunks.set(this.chunkKey(cx, cz), data);
  }

  placeTree(data, lx, baseY, lz, cx, cz) {
    const trunkH = 4 + Math.floor(this.noise.hash(lx*7+cx, lz*7+cz) * 3);
    for (let i = 0; i < trunkH; i++) {
      if (baseY + i < WORLD_HEIGHT) data[this.localIndex(lx, baseY+i, lz)] = BLOCKS.LOG;
    }
    const top = baseY + trunkH;
    for (let ly = -2; ly <= 1; ly++) {
      const r = ly < 0 ? 2 : 1;
      for (let lx2 = -r; lx2 <= r; lx2++) {
        for (let lz2 = -r; lz2 <= r; lz2++) {
          if (Math.abs(lx2) === r && Math.abs(lz2) === r) continue;
          const nx = lx + lx2, nz = lz + lz2, ny = top + ly;
          if (nx >= 0 && nx < CHUNK_SIZE && nz >= 0 && nz < CHUNK_SIZE && ny < WORLD_HEIGHT && ny >= 0) {
            if (data[this.localIndex(nx, ny, nz)] === BLOCKS.AIR) {
              data[this.localIndex(nx, ny, nz)] = BLOCKS.LEAVES;
            }
          }
        }
      }
    }
  }

  getHeight(wx, wz) {
    const n = this.noise.octave(wx, wz, 4, 40);
    return Math.floor(SEA_LEVEL - 4 + n * 20);
  }

  getBiome(wx, wz) {
    const t = this.noise.smooth(wx, wz, 200);
    const m = this.noise.smooth(wx + 1000, wz + 1000, 150);
    if (t < 0.3) return 'snowy';
    if (t > 0.7 && m < 0.4) return 'desert';
    if (m > 0.6) return 'forest';
    return 'plains';
  }

  localIndex(lx, y, lz) {
    return (y * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
  }

  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return BLOCKS.AIR;
    const key = `${wx},${wy},${wz}`;
    if (this.modified.has(key)) return this.modified.get(key);
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = this.getChunk(cx, cz);
    return chunk[this.localIndex(lx, wy, lz)];
  }

  setBlock(wx, wy, wz, block) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return;
    const key = `${wx},${wy},${wz}`;
    this.modified.set(key, block);
    // Also update chunk data
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = this.getChunk(cx, cz);
    chunk[this.localIndex(lx, wy, lz)] = block;
  }

  // Raycast for block selection
  raycast(ox, oy, oz, dx, dy, dz, maxDist=5) {
    const step = 0.05;
    let px=ox, py=oy, pz=oz;
    let lastBx, lastBy, lastBz;
    for (let d=0; d<maxDist; d+=step) {
      px+=dx*step; py+=dy*step; pz+=dz*step;
      const bx=Math.floor(px), by=Math.floor(py), bz=Math.floor(pz);
      const b = this.getBlock(bx, by, bz);
      if (b !== BLOCKS.AIR && b !== BLOCKS.WATER) {
        return { hit:true, x:bx, y:by, z:bz, nx:lastBx, ny:lastBy, nz:lastBz };
      }
      lastBx=bx; lastBy=by; lastBz=bz;
    }
    return { hit: false };
  }
}
