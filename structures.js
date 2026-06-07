// ── ГЕНЕРАТОР СТРУКТУР: деревни, подземелья, крепости ───────────────────────

const Structures = (() => {
  const placed = new Set(); // ключи уже размещённых структур

  // ── Деревня ───────────────────────────────────────────────────────────────
  function placeVillage(world, cx, cz) {
    const key = `village_${cx}_${cz}`;
    if (placed.has(key)) return;
    placed.add(key);

    const bx = cx * CHUNK_SIZE + 4;
    const bz = cz * CHUNK_SIZE + 4;
    // Находим высоту
    let groundY = SEA_LEVEL;
    for (let y=WORLD_HEIGHT-1;y>=0;y--) {
      if (world.getBlock(bx,y,bz)!==BLOCKS.AIR&&world.getBlock(bx,y,bz)!==BLOCKS.WATER) { groundY=y+1; break; }
    }
    if (groundY <= SEA_LEVEL) return;

    // Дорога
    for (let d=-8;d<=8;d++) {
      world.setBlock(bx+d, groundY-1, bz, BLOCKS.GRAVEL_PATH);
      world.setBlock(bx, groundY-1, bz+d, BLOCKS.GRAVEL_PATH);
    }

    // Несколько домов
    const houses = [
      {ox:3,oz:3, w:5,d:5,h:4},
      {ox:-8,oz:3, w:5,d:5,h:4},
      {ox:3,oz:-8, w:7,d:5,h:5},
      {ox:-8,oz:-8,w:5,d:4,h:4},
    ];
    for (const house of houses) {
      buildHouse(world, bx+house.ox, groundY, bz+house.oz, house.w, house.d, house.h);
    }

    // Колодец
    buildWell(world, bx, groundY, bz);

    // Огороды
    buildFarm(world, bx+10, groundY, bz+10);

    // Фонари (факелы на заборах)
    for (let d=-6;d<=6;d+=6) {
      world.setBlock(bx+d, groundY, bz-1, BLOCKS.FENCE);
      world.setBlock(bx+d, groundY+1, bz-1, BLOCKS.TORCH);
    }

    // Стойло
    buildStable(world, bx-12, groundY, bz-4);
  }

  function buildHouse(world, x, y, z, w, d, h) {
    // Пол
    for(let dx=0;dx<w;dx++) for(let dz=0;dz<d;dz++)
      world.setBlock(x+dx,y-1,z+dz,BLOCKS.PLANKS);

    // Стены
    for(let dy=0;dy<h;dy++) {
      for(let dx=0;dx<w;dx++) {
        world.setBlock(x+dx,y+dy,z,BLOCKS.PLANKS);
        world.setBlock(x+dx,y+dy,z+d-1,BLOCKS.PLANKS);
      }
      for(let dz=1;dz<d-1;dz++) {
        world.setBlock(x,y+dy,z+dz,BLOCKS.PLANKS);
        world.setBlock(x+w-1,y+dy,z+dz,BLOCKS.PLANKS);
      }
    }

    // Окна (стекло)
    const winy = y+1;
    world.setBlock(x+1,winy,z,BLOCKS.GLASS_PANE);
    world.setBlock(x+w-2,winy,z,BLOCKS.GLASS_PANE);
    world.setBlock(x,winy,z+1,BLOCKS.GLASS_PANE);
    world.setBlock(x,winy,z+d-2,BLOCKS.GLASS_PANE);

    // Дверной проём
    world.setBlock(x+Math.floor(w/2),y,z,BLOCKS.AIR);
    world.setBlock(x+Math.floor(w/2),y+1,z,BLOCKS.AIR);

    // Крыша из досок
    for(let dx=0;dx<w;dx++) for(let dz=0;dz<d;dz++)
      world.setBlock(x+dx,y+h,z+dz,BLOCKS.OAK_STAIRS);

    // Потолок
    for(let dx=1;dx<w-1;dx++) for(let dz=1;dz<d-1;dz++)
      world.setBlock(x+dx,y+h-1,z+dz,BLOCKS.PLANKS);

    // Внутри: стол, факел
    world.setBlock(x+1,y,z+1,BLOCKS.CRAFTING_TABLE);
    world.setBlock(x+w-2,y+1,z+1,BLOCKS.TORCH);
    world.setBlock(x+1,y,z+d-2,BLOCKS.CHEST);
  }

  function buildWell(world, x, y, z) {
    // Основание
    for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++) {
      world.setBlock(x+dx,y-1,z+dz,BLOCKS.COBBLESTONE);
      if(Math.abs(dx)===1||Math.abs(dz)===1)
        world.setBlock(x+dx,y,z+dz,BLOCKS.COBBLESTONE);
    }
    // Вода внутри
    world.setBlock(x,y,z,BLOCKS.WATER);
    world.setBlock(x,y-1,z,BLOCKS.WATER);
    // Столбики
    world.setBlock(x-1,y+1,z-1,BLOCKS.FENCE);
    world.setBlock(x+1,y+1,z-1,BLOCKS.FENCE);
    world.setBlock(x-1,y+1,z+1,BLOCKS.FENCE);
    world.setBlock(x+1,y+1,z+1,BLOCKS.FENCE);
    // Крыша
    for(let dx=-1;dx<=1;dx++)
      world.setBlock(x+dx,y+2,z-1,BLOCKS.OAK_STAIRS);
  }

  function buildFarm(world, x, y, z) {
    // Огороженный участок
    for(let dx=-3;dx<=3;dx++) {
      world.setBlock(x+dx,y,z-3,BLOCKS.FENCE);
      world.setBlock(x+dx,y,z+3,BLOCKS.FENCE);
    }
    for(let dz=-2;dz<=2;dz++) {
      world.setBlock(x-3,y,z+dz,BLOCKS.FENCE);
      world.setBlock(x+3,y,z+dz,BLOCKS.FENCE);
    }
    // Поливные канавки
    for(let dx=-2;dx<=2;dx+=2)
      world.setBlock(x+dx,y-1,z,BLOCKS.WATER);
    // Грядки
    for(let dx=-2;dx<=2;dx++) for(let dz=-2;dz<=2;dz++) {
      world.setBlock(x+dx,y-1,z+dz,BLOCKS.GRASS);
    }
    // Тыквы и арбузы
    world.setBlock(x-1,y,z+1,BLOCKS.PUMPKIN);
    world.setBlock(x+1,y,z-1,BLOCKS.MELON);
    world.setBlock(x-1,y,z-2,BLOCKS.HAY_BALE);
  }

  function buildStable(world, x, y, z) {
    for(let dz=0;dz<6;dz++) {
      world.setBlock(x,y+1,z+dz,BLOCKS.FENCE);
      world.setBlock(x+4,y+1,z+dz,BLOCKS.FENCE);
    }
    for(let dx=0;dx<=4;dx++) {
      world.setBlock(x+dx,y+1,z,BLOCKS.FENCE);
      world.setBlock(x+dx,y+1,z+5,BLOCKS.FENCE);
    }
    world.setBlock(x+2,y,z+3,BLOCKS.HAY_BALE);
    world.setBlock(x+2,y+2,z,BLOCKS.TORCH);
  }

  // ── Подземелье ────────────────────────────────────────────────────────────
  function placeDungeon(world, x, y, z) {
    const key = `dungeon_${x}_${y}_${z}`;
    if (placed.has(key)) return;
    placed.add(key);

    const W=9, H=5, D=9;
    // Расчищаем
    for(let dx=0;dx<W;dx++) for(let dy=0;dy<H;dy++) for(let dz=0;dz<D;dz++)
      world.setBlock(x+dx,y+dy,z+dz,BLOCKS.AIR);

    // Пол/стены/потолок из замшелого камня
    for(let dx=0;dx<W;dx++) for(let dz=0;dz<D;dz++) {
      world.setBlock(x+dx,y-1,z+dz,BLOCKS.MOSSY_STONE);
      world.setBlock(x+dx,y+H,z+dz,BLOCKS.COBBLESTONE);
    }
    for(let dy=0;dy<H;dy++) {
      for(let dx=0;dx<W;dx++) {
        world.setBlock(x+dx,y+dy,z,BLOCKS.MOSSY_COBBLE);
        world.setBlock(x+dx,y+dy,z+D-1,BLOCKS.MOSSY_COBBLE);
      }
      for(let dz=1;dz<D-1;dz++) {
        world.setBlock(x,y+dy,z+dz,BLOCKS.MOSSY_COBBLE);
        world.setBlock(x+W-1,y+dy,z+dz,BLOCKS.MOSSY_COBBLE);
      }
    }

    // Спавнер в центре
    world.setBlock(x+Math.floor(W/2), y, z+Math.floor(D/2), BLOCKS.SPAWNER);

    // Сундуки по углам
    world.setBlock(x+1,y,z+1,BLOCKS.CHEST);
    world.setBlock(x+W-2,y,z+D-2,BLOCKS.CHEST_TRAP);

    // Факелы на стенах
    world.setBlock(x+2,y+2,z,BLOCKS.TORCH);
    world.setBlock(x+W-3,y+2,z+D-1,BLOCKS.TORCH);

    // Вход/коридор
    for(let dy=0;dy<3;dy++)
      world.setBlock(x+Math.floor(W/2),y+dy,z-1,BLOCKS.AIR);
  }

  // ── Нижняя крепость ───────────────────────────────────────────────────────
  function placeNetherFortress(world, x, y, z) {
    const key = `fortress_${x}_${y}_${z}`;
    if (placed.has(key)) return;
    placed.add(key);

    // Мост
    for(let dx=-10;dx<=10;dx++) {
      for(let dy=0;dy<4;dy++) {
        world.setBlock(x+dx,y+dy,z,BLOCKS.NETHER_BRICK);
        world.setBlock(x+dx,y+dy,z+4,BLOCKS.NETHER_BRICK);
      }
      world.setBlock(x+dx,y,z+1,BLOCKS.NETHER_BRICK);
      world.setBlock(x+dx,y,z+2,BLOCKS.NETHER_BRICK);
      world.setBlock(x+dx,y,z+3,BLOCKS.NETHER_BRICK);
    }
    // Башня
    for(let dx=0;dx<6;dx++) for(let dz=0;dz<6;dz++) for(let dy=0;dy<8;dy++) {
      if(dx===0||dx===5||dz===0||dz===5||dy===0||dy===7)
        world.setBlock(x+dx,y+dy,z+dz,BLOCKS.NETHER_BRICK);
    }
    // Окна
    world.setBlock(x,y+3,z+2,BLOCKS.AIR);
    world.setBlock(x,y+3,z+3,BLOCKS.AIR);
    world.setBlock(x+5,y+3,z+2,BLOCKS.AIR);
    // Лава декор
    world.setBlock(x+2,y+1,z+2,BLOCKS.LAVA);
    world.setBlock(x+3,y+1,z+3,BLOCKS.SOUL_SAND);
  }

  // ── Главная функция — вызывается при генерации чанков ────────────────────
  function trySpawnStructures(world, cx, cz) {
    const wx = cx * CHUNK_SIZE, wz = cz * CHUNK_SIZE;
    const n = world.noise;

    // Деревня (редко, каждые ~8 чанков)
    if (n.hash(cx * 7, cz * 7) > 0.93) {
      placeVillage(world, cx, cz);
    }

    // Подземелья (под землёй)
    if (n.hash(cx * 13 + 1, cz * 11) > 0.88) {
      const dy = 10 + Math.floor(n.hash(cx, cz * 3) * 20);
      placeDungeon(world, wx + 2, dy, wz + 2);
    }
  }

  return { trySpawnStructures, placeDungeon, placeVillage, placeNetherFortress };
})();

// Патчим генерацию мира чтобы добавить структуры
const _origGenChunk = World.prototype.generateChunk;
World.prototype.generateChunk = function(cx, cz) {
  _origGenChunk.call(this, cx, cz);
  // Небольшая задержка чтобы не мешать первичной генерации
  try { Structures.trySpawnStructures(this, cx, cz); } catch(e) {}
};
