// PixelPainter — рисует настоящие 16×16 пиксельные текстуры как в Minecraft
// Заменяет TextureAtlas из textures.js более детальными текстурами

const PixelPainter = (() => {
  const SZ = 16;
  const cache = new Map();

  // Создать canvas 16x16 и вернуть {c, ctx, px} где px(x,y,color) рисует пиксель
  function make() {
    const c = document.createElement('canvas');
    c.width = SZ; c.height = SZ;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SZ, SZ);
    const d = img.data;

    function setpx(x, y, r, g, b, a=255) {
      if (x<0||x>=SZ||y<0||y>=SZ) return;
      const i = (y*SZ+x)*4;
      d[i]=r; d[i+1]=g; d[i+2]=b; d[i+3]=a;
    }
    function hex(col, x, y, a=255) {
      const r=parseInt(col.slice(1,3),16), g=parseInt(col.slice(3,5),16), b=parseInt(col.slice(5,7),16);
      setpx(x,y,r,g,b,a);
    }
    function fill(col, a=255) {
      const r=parseInt(col.slice(1,3),16), g=parseInt(col.slice(3,5),16), b=parseInt(col.slice(5,7),16);
      for(let i=0;i<SZ*SZ;i++){d[i*4]=r;d[i*4+1]=g;d[i*4+2]=b;d[i*4+3]=a;}
    }
    function noise(col, variance, seed=0) {
      const r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);
      for(let i=0;i<SZ*SZ;i++){
        const h=Math.sin(i*127.1+seed*311.7)*43758.5453;
        const v=(h-Math.floor(h))*variance*2-variance;
        d[i*4  ]=Math.max(0,Math.min(255,r+v));
        d[i*4+1]=Math.max(0,Math.min(255,g+v));
        d[i*4+2]=Math.max(0,Math.min(255,b+v));
        d[i*4+3]=255;
      }
    }
    function rect(col, x, y, w, h, a=255) {
      const r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);
      for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) setpx(x+dx,y+dy,r,g,b,a);
    }
    function commit() { ctx.putImageData(img,0,0); return c; }

    return { c, ctx, img, d, setpx, hex, fill, noise, rect, commit };
  }

  // ── Текстуры ────────────────────────────────────────────────────────────────

  const tex = {
    // GRASS TOP
    [`${BLOCKS.GRASS}_top`]() {
      const p=make();
      p.noise('#5d9e3a',12,1);
      // Травинки
      const blades=[[1,0],[3,2],[5,0],[7,1],[9,0],[11,2],[13,0],[15,1],[0,3],[2,1],[4,3],[6,0],[8,2],[10,1],[12,3],[14,0]];
      for(const [x,y] of blades){p.rect('#3a7a20',x,y,1,2);}
      for(let x=0;x<16;x+=2) p.rect('#7acc40',x,0,1,1);
      return p.commit();
    },
    // GRASS SIDE
    [`${BLOCKS.GRASS}_side`]() {
      const p=make();
      p.noise('#8b5a2b',14,2);
      // Зелёная полоска сверху
      p.rect('#5d9e3a',0,0,16,3);
      p.rect('#4a8a28',0,2,16,1);
      // Полосы земли
      p.rect('#7a4a1f',0,4,3,4); p.rect('#6a3a0f',3,5,2,3);
      p.rect('#7a4a1f',8,7,4,3); p.rect('#6a3a0f',13,4,2,4);
      return p.commit();
    },
    // DIRT
    [`${BLOCKS.DIRT}_side`]() {
      const p=make(); p.noise('#8b5a2b',18,3);
      p.rect('#6a3a10',2,5,3,3); p.rect('#9a6a3f',1,1,2,2);
      p.rect('#6a3a10',10,2,2,2); p.rect('#9a6a3f',11,9,3,3);
      p.rect('#6a3a10',6,11,4,3); return p.commit();
    },
    // STONE
    [`${BLOCKS.STONE}_side`]() {
      const p=make(); p.noise('#888888',10,4);
      // Трещины
      p.rect('#666666',0,5,7,1); p.rect('#666666',9,5,7,1);
      p.rect('#666666',4,0,1,5); p.rect('#666666',4,6,1,10);
      p.rect('#666666',11,6,1,10); p.rect('#aaaaaa',1,1,3,3);
      p.rect('#777777',8,8,5,4); return p.commit();
    },
    // COBBLESTONE
    [`${BLOCKS.COBBLESTONE}_side`]() {
      const p=make(); p.noise('#707070',16,5);
      // Камни
      p.rect('#555555',0,0,7,7); p.rect('#555555',8,0,8,3);
      p.rect('#555555',0,8,4,8); p.rect('#555555',5,8,11,5);
      p.rect('#555555',8,3,8,5);
      p.rect('#999999',1,1,5,5); p.rect('#999999',9,1,6,2);
      p.rect('#999999',1,9,2,6); p.rect('#999999',6,9,9,4);
      // Раствор
      p.rect('#888888',7,0,1,16); p.rect('#888888',0,7,8,1);
      p.rect('#888888',4,8,1,8); p.rect('#888888',8,13,8,1);
      return p.commit();
    },
    // LOG TOP (кольца)
    [`${BLOCKS.LOG}_top`]() {
      const p=make(); p.fill('#8b6040');
      // Годовые кольца
      const rings=[{r:7,c:'#5a3a15'},{r:5,c:'#7a5030'},{r:3,c:'#6a4020'},{r:1,c:'#4a2a10'}];
      for(const {r,c} of rings){
        for(let a=0;a<360;a+=5){
          const x=Math.round(7.5+r*Math.cos(a*Math.PI/180));
          const y=Math.round(7.5+r*Math.sin(a*Math.PI/180));
          p.rect(c,x,y,1,1);
        }
      }
      p.rect('#3a2010',7,7,2,2);
      return p.commit();
    },
    // LOG SIDE (волокна)
    [`${BLOCKS.LOG}_side`]() {
      const p=make();
      const stripes=['#5a3820','#6b4c2e','#4a3010','#7a5a38','#3a2808','#6b4c2e'];
      for(let x=0;x<16;x++) p.rect(stripes[x%stripes.length],x,0,1,16);
      // Узлы
      p.rect('#3a2010',4,5,3,3); p.rect('#3a2010',10,10,3,3);
      p.rect('#8a6040',5,6,1,1); p.rect('#8a6040',11,11,1,1);
      return p.commit();
    },
    // PLANKS
    [`${BLOCKS.PLANKS}_side`]() {
      const p=make(); p.fill('#c8a060');
      // Горизонтальные доски
      p.rect('#b08040',0,4,16,1); p.rect('#b08040',0,10,16,1);
      p.rect('#d0a870',0,0,16,4); p.rect('#d0a870',0,5,16,5); p.rect('#d0a870',0,11,16,5);
      // Вертикальные стыки (смещённые)
      p.rect('#8a6030',8,0,1,4); p.rect('#8a6030',4,5,1,5); p.rect('#8a6030',12,11,1,5);
      // Волокна
      for(let y=0;y<16;y++) if(y%4!==0&&y%4!==3) { p.rect('#c09050',Math.floor(y/4)*3+1,y,2,1); }
      return p.commit();
    },
    // LEAVES
    [`${BLOCKS.LEAVES}_side`]() {
      const p=make(); p.noise('#2d7a1a',22,8);
      const dots=[[2,1],[5,3],[1,6],[8,2],[11,5],[14,1],[3,9],[7,7],[10,10],[13,8],[1,13],[6,12],[12,13],[15,11]];
      for(const [x,y] of dots){p.rect('#4aaa28',x,y,2,2);}
      for(const [x,y] of dots.slice(0,7)){p.rect('#1a5a0a',x+1,y+1,1,1);}
      return p.commit();
    },
    // SAND
    [`${BLOCKS.SAND}_side`]() {
      const p=make(); p.noise('#c8b56e',16,9);
      // Зёрна песка
      const grains=['#d4c07a','#b8a055','#e0cc88'];
      for(let i=0;i<40;i++){
        const x=(i*73+13)%16, y=(i*51+7)%16;
        p.rect(grains[i%3],x,y,1,1);
      }
      return p.commit();
    },
    // WATER
    [`${BLOCKS.WATER}_side`]() {
      const p=make(); p.fill('#1a6bb5',180);
      p.rect('#2288dd',0,3,16,2,180); p.rect('#2288dd',0,10,16,2,180);
      p.rect('#44aaff',2,4,5,1,200); p.rect('#44aaff',10,11,4,1,200);
      p.rect('#0a4a8a',0,0,16,2,160); p.rect('#0a4a8a',0,14,16,2,160);
      // Рябь
      for(let x=0;x<16;x+=3) p.rect('#55bbff',x,(x*3)%12,2,1,160);
      return p.commit();
    },
    // GLASS
    [`${BLOCKS.GLASS}_side`]() {
      const p=make(); p.fill('#aaddff',60);
      p.rect('#cceeFF',0,0,16,1,180); p.rect('#cceeFF',0,15,16,1,180);
      p.rect('#cceeFF',0,0,1,16,180); p.rect('#cceeFF',15,0,1,16,180);
      p.rect('#ffffff',2,2,3,3,120); p.rect('#ffffff',10,9,4,4,100);
      p.rect('#88ccff',4,4,8,8,40);
      return p.commit();
    },
    // BRICK
    [`${BLOCKS.BRICK}_side`]() {
      const p=make(); p.fill('#8b4040');
      // Раствор
      p.rect('#aaaaaa',0,5,16,2); p.rect('#aaaaaa',0,13,16,2);
      p.rect('#aaaaaa',7,0,2,5); p.rect('#aaaaaa',7,7,2,6);
      p.rect('#aaaaaa',3,7,2,6); p.rect('#aaaaaa',11,0,2,5);
      // Тени на кирпичах
      p.rect('#6a2a2a',0,0,7,1); p.rect('#6a2a2a',9,0,7,1);
      p.rect('#6a2a2a',0,7,3,1); p.rect('#6a2a2a',5,7,6,1); p.rect('#6a2a2a',13,7,3,1);
      // Блик
      p.rect('#cc6060',1,1,5,3); p.rect('#cc6060',9,1,5,3);
      p.rect('#cc6060',1,8,1,4); p.rect('#cc6060',6,8,5,4); p.rect('#cc6060',14,8,1,4);
      return p.commit();
    },
    // COAL ORE
    [`${BLOCKS.COAL_ORE}_side`]() {
      const p=make(); p.noise('#888888',10,11);
      p.rect('#111111',3,3,4,4); p.rect('#222222',4,4,2,2);
      p.rect('#111111',10,2,3,3); p.rect('#222222',10,9,4,4);
      p.rect('#111111',2,11,3,3); p.rect('#333333',11,10,2,2);
      return p.commit();
    },
    // IRON ORE
    [`${BLOCKS.IRON_ORE}_side`]() {
      const p=make(); p.noise('#888888',10,12);
      p.rect('#d4a090',3,3,4,4); p.rect('#e8b8a8',4,4,2,2);
      p.rect('#c89080',10,2,3,3); p.rect('#d4a090',10,9,4,4);
      p.rect('#c89080',2,11,3,3); p.rect('#e0b0a0',11,10,2,2);
      return p.commit();
    },
    // GOLD ORE
    [`${BLOCKS.GOLD_ORE}_side`]() {
      const p=make(); p.noise('#888888',10,13);
      p.rect('#ffd700',3,3,4,4); p.rect('#ffee44',4,4,2,2);
      p.rect('#ccaa00',10,2,3,3); p.rect('#ffd700',10,9,4,4);
      p.rect('#ccaa00',2,11,3,3); p.rect('#ffff88',11,10,2,2);
      return p.commit();
    },
    // DIAMOND ORE
    [`${BLOCKS.DIAMOND_ORE}_side`]() {
      const p=make(); p.noise('#888888',10,14);
      p.rect('#00e5ff',3,3,4,4); p.rect('#88ffff',4,4,2,2);
      p.rect('#00aacc',10,2,3,3); p.rect('#00e5ff',10,9,4,4);
      p.rect('#00aacc',2,11,3,3); p.rect('#aaffff',11,10,2,2);
      // Форма алмаза
      p.rect('#00ffff',5,3,2,1); p.rect('#00ffff',4,4,4,1); p.rect('#00ffff',5,5,2,1);
      return p.commit();
    },
    // BEDROCK
    [`${BLOCKS.BEDROCK}_side`]() {
      const p=make(); p.noise('#444444',6,15);
      p.rect('#222222',0,0,5,5); p.rect('#333333',6,0,10,3);
      p.rect('#222222',0,6,3,10); p.rect('#333333',4,7,8,5);
      p.rect('#555555',1,1,3,3); p.rect('#555555',7,1,8,2);
      p.rect('#555555',5,8,6,4); p.rect('#222222',12,12,4,4);
      return p.commit();
    },
    // GRAVEL
    [`${BLOCKS.GRAVEL}_side`]() {
      const p=make(); p.noise('#999090',18,16);
      const stones=['#777070','#aaaaaa','#888888','#bbbbbb'];
      const spos=[[1,1,4,4],[6,0,5,3],[12,2,3,4],[0,6,3,4],[5,5,4,5],[10,6,5,4],[2,11,5,4],[8,10,4,5],[13,12,3,4]];
      for(let i=0;i<spos.length;i++){
        const [x,y,w,h]=spos[i]; p.rect(stones[i%4],x,y,w,h);
        p.rect('#cccccc',x,y,1,1);
      }
      return p.commit();
    },
    // SNOW
    [`${BLOCKS.SNOW}_top`]() {
      const p=make(); p.noise('#ffffff',8,17);
      p.rect('#eeeeee',0,0,16,2); p.rect('#dddddd',2,4,3,2);
      p.rect('#f8f8f8',8,3,5,3); return p.commit();
    },
    [`${BLOCKS.SNOW}_side`]() {
      const p=make(); p.noise('#eeeeee',6,18);
      p.rect('#cccccc',0,8,16,1); p.rect('#ffffff',0,0,16,8);
      p.noise('#8b5a2b',14,19); // bottom half dirt - overwrite bottom 8px
      const p2=make(); p2.noise('#eeeeee',6,18);
      for(let i=0;i<SZ*8;i++){const j=i*4; p2.d[j]=p2.d[j];} // keep top
      return p2.commit();
    },
    // ICE
    [`${BLOCKS.ICE}_side`]() {
      const p=make(); p.fill('#88ccff',180);
      p.rect('#aaddff',0,0,16,2,200); p.rect('#aaddff',0,14,16,2,200);
      p.rect('#aaddff',0,0,2,16,200); p.rect('#aaddff',14,0,2,16,200);
      // Трещины
      p.rect('#66aadd',3,3,1,8,220); p.rect('#66aadd',3,3,8,1,220);
      p.rect('#66aadd',10,5,1,6,220); p.rect('#66aadd',6,10,8,1,220);
      p.rect('#cceeff',2,2,3,3,150); p.rect('#cceeff',10,10,4,4,150);
      return p.commit();
    },
    // CACTUS
    [`${BLOCKS.CACTUS}_side`]() {
      const p=make(); p.fill('#1a7010');
      p.rect('#2d8a1a',3,0,10,16); p.rect('#3aaa22',5,0,6,16);
      // Иголки
      p.rect('#145810',0,4,3,1); p.rect('#145810',13,8,3,1);
      p.rect('#145810',0,12,3,1); p.rect('#145810',13,2,3,1);
      p.rect('#4acc30',6,0,4,16);
      return p.commit();
    },
    [`${BLOCKS.CACTUS}_top`]() {
      const p=make(); p.fill('#2d8a1a');
      p.rect('#1a7010',0,0,3,16); p.rect('#1a7010',13,0,3,16);
      p.rect('#1a7010',0,0,16,3); p.rect('#1a7010',0,13,16,3);
      p.rect('#4acc30',4,4,8,8); p.rect('#3aaa22',6,6,4,4);
      return p.commit();
    },
    // WOOL RED
    [`${BLOCKS.WOOL_RED}_side`]() {
      const p=make(); p.noise('#cc3333',12,21);
      for(let y=0;y<16;y+=3){p.rect('#aa1111',0,y,16,1);}
      for(let x=0;x<16;x+=4){p.rect('#ee5555',x,0,1,16);}
      return p.commit();
    },
    // WOOL BLUE
    [`${BLOCKS.WOOL_BLUE}_side`]() {
      const p=make(); p.noise('#3355cc',12,22);
      for(let y=0;y<16;y+=3){p.rect('#1133aa',0,y,16,1);}
      for(let x=0;x<16;x+=4){p.rect('#5577ee',x,0,1,16);}
      return p.commit();
    },
    // WOOL GREEN
    [`${BLOCKS.WOOL_GREEN}_side`]() {
      const p=make(); p.noise('#336633',12,23);
      for(let y=0;y<16;y+=3){p.rect('#114411',0,y,16,1);}
      for(let x=0;x<16;x+=4){p.rect('#558855',x,0,1,16);}
      return p.commit();
    },
    // CRAFTING TABLE TOP
    [`${BLOCKS.CRAFTING_TABLE}_top`]() {
      const p=make(); p.fill('#c8a060');
      p.rect('#5a3a10',0,0,16,1); p.rect('#5a3a10',0,0,1,16);
      p.rect('#5a3a10',15,0,1,16); p.rect('#5a3a10',0,15,16,1);
      p.rect('#8b6030',1,1,6,6); p.rect('#8b6030',9,1,6,6);
      p.rect('#8b6030',1,9,6,6); p.rect('#8b6030',9,9,6,6);
      p.rect('#aaaaaa',2,2,4,4); p.rect('#aaaaaa',10,2,4,4);
      p.rect('#cc4444',2,10,4,4); p.rect('#4444cc',10,10,4,4);
      p.rect('#888888',7,1,2,14); p.rect('#888888',1,7,14,2);
      return p.commit();
    },
    [`${BLOCKS.CRAFTING_TABLE}_side`]() {
      const p=make(); p.fill('#9a7050');
      p.rect('#c8a060',0,0,16,4);
      p.rect('#5a3a10',0,4,16,1);
      p.noise('#9a7050',8,24);
      // Инструменты
      p.rect('#888888',3,6,2,6); p.rect('#aaaaaa',2,5,4,2);
      p.rect('#c8a060',10,6,1,7); p.rect('#888888',9,5,3,2);
      return p.commit();
    },
    // FURNACE FRONT
    [`${BLOCKS.FURNACE}_front`]() {
      const p=make(); p.noise('#888888',8,25);
      // Решётка
      p.rect('#111111',3,3,10,10);
      p.rect('#222222',4,4,8,8);
      // Огонь
      p.rect('#ff6600',5,6,6,5); p.rect('#ff8800',6,5,4,5);
      p.rect('#ffcc00',7,6,2,3); p.rect('#ffffff',7,7,2,1);
      // Рамка
      p.rect('#555555',3,3,10,1); p.rect('#555555',3,3,1,10);
      p.rect('#cccccc',4,12,8,1); p.rect('#cccccc',12,4,1,8);
      return p.commit();
    },
    [`${BLOCKS.FURNACE}_side`]() {
      const p=make(); p.noise('#888888',8,26);
      p.rect('#555555',2,2,12,12); p.rect('#666666',3,3,10,10);
      return p.commit();
    },
    [`${BLOCKS.FURNACE}_top`]() {
      const p=make(); p.noise('#888888',8,27);
      p.rect('#333333',5,5,6,6); p.rect('#555555',6,6,4,4);
      return p.commit();
    },
    // CHEST
    [`${BLOCKS.CHEST}_side`]() {
      const p=make(); p.fill('#c8a060');
      p.rect('#5a3a10',0,0,16,1); p.rect('#5a3a10',0,0,1,16);
      p.rect('#5a3a10',15,0,1,16); p.rect('#5a3a10',0,15,16,1);
      p.rect('#8b6030',0,7,16,2);
      p.rect('#aa8040',1,1,14,6); p.rect('#aa8040',1,9,14,6);
      p.rect('#d4b070',2,2,12,4); p.rect('#d4b070',2,10,12,4);
      return p.commit();
    },
    [`${BLOCKS.CHEST}_front`]() {
      const p=make(); p.fill('#c8a060');
      p.rect('#5a3a10',0,0,16,1); p.rect('#5a3a10',0,0,1,16);
      p.rect('#5a3a10',15,0,1,16); p.rect('#5a3a10',0,15,16,1);
      p.rect('#8b6030',0,7,16,2);
      p.rect('#aa8040',1,1,14,6); p.rect('#aa8040',1,9,14,6);
      p.rect('#d4b070',2,2,12,4); p.rect('#d4b070',2,10,12,4);
      // Замок
      p.rect('#5a3a10',6,5,4,4); p.rect('#c8a000',7,6,2,2);
      p.rect('#ffd700',7,6,2,2); p.rect('#aaaa00',8,7,1,1);
      return p.commit();
    },
    [`${BLOCKS.CHEST}_top`]() {
      const p=make(); p.fill('#d4b070');
      p.rect('#5a3a10',0,0,16,1); p.rect('#5a3a10',0,0,1,16);
      p.rect('#5a3a10',15,0,1,16); p.rect('#5a3a10',0,15,16,1);
      p.rect('#aa8040',1,1,14,14); p.rect('#c8a060',2,2,12,12);
      // Металлические ободки
      p.rect('#888888',3,0,10,2); p.rect('#888888',0,3,2,10);
      p.rect('#888888',14,3,2,10); p.rect('#888888',3,14,10,2);
      return p.commit();
    },
    // BOOKSHELF
    [`${BLOCKS.BOOKSHELF}_side`]() {
      const p=make(); p.fill('#c8a060');
      p.rect('#8b6030',0,0,16,2); p.rect('#8b6030',0,14,16,2);
      // Книги
      const books=[
        {x:1,c:'#cc4444'},{x:3,c:'#4444cc'},{x:5,c:'#44aa44'},
        {x:7,c:'#cc8800'},{x:9,c:'#884488'},{x:11,c:'#448888'},
        {x:13,c:'#cc4444'},{x:1,c:'#4444cc'},{x:3,c:'#cc8800'},
      ];
      for(let i=0;i<books.length;i++){
        const {x,c}=books[i]; const y=i>7?8:2;
        p.rect(c,x,y,2,6);
        p.rect('#ffffff',x,y,2,1);
        p.rect('#000000',x,y+5,2,1);
      }
      return p.commit();
    },
    // TORCH
    [`${BLOCKS.TORCH}_side`]() {
      const p=make(); // прозрачный фон
      for(let i=0;i<SZ*SZ*4;i+=4) p.d[i+3]=0;
      // Ручка
      p.rect('#8b6040',7,5,2,11);
      // Огонь
      p.rect('#ff4400',6,1,4,5);
      p.rect('#ff8800',7,2,2,4);
      p.rect('#ffcc00',7,3,2,2);
      p.rect('#ffffff',8,3,1,1);
      // Свечение
      p.rect('#ff8800',5,3,1,2,100); p.rect('#ff8800',10,3,1,2,100);
      p.rect('#ffcc00',6,1,1,1,120); p.rect('#ffcc00',9,1,1,1,120);
      return p.commit();
    },
    // FLOWER
    [`${BLOCKS.FLOWER}_side`]() {
      const p=make();
      for(let i=0;i<SZ*SZ*4;i+=4) p.d[i+3]=0;
      // Стебель
      p.rect('#228b22',7,9,2,7);
      p.rect('#1a6a1a',8,9,1,7);
      // Лепестки
      p.rect('#ff6688',5,4,6,2); // горизонталь
      p.rect('#ff6688',5,6,2,4); // лево
      p.rect('#ff6688',9,6,2,4); // право
      p.rect('#ff6688',5,10,6,2); // низ
      // Центр
      p.rect('#ffdd00',6,6,4,4);
      p.rect('#ffee44',7,7,2,2);
      // Акценты лепестков
      p.rect('#ff88aa',6,4,4,1); p.rect('#ee4466',6,5,4,1);
      return p.commit();
    },
  };

  // Fallback — стандартная шумовая текстура
  function fallback(blockType) {
    const bc = BLOCK_COLORS[blockType];
    const col = bc ? (bc.all || bc.side || '#888888') : '#ff00ff';
    const p = make(); p.noise(col, 12, blockType); return p.commit();
  }

  return {
    get(blockType, face='side') {
      // Нормализуем имя грани
      const faceMap = { back:'side', front:'front', left:'side', right:'side' };
      const faceName = faceMap[face] || face;
      const key = `${blockType}_${faceName}`;
      if (cache.has(key)) return cache.get(key);
      // Попытка с конкретной гранью, потом _side как fallback
      const fn = tex[key] || tex[`${blockType}_side`];
      const result = fn ? fn() : fallback(blockType);
      cache.set(key, result);
      return result;
    },
    SZ,
  };
})();

// Патчим рендерер чтобы использовал PixelPainter вместо TextureAtlas
if (typeof TextureAtlas !== 'undefined') {
  // Переопределяем TextureAtlas.get
  TextureAtlas.get = (blockType, face) => PixelPainter.get(blockType, face);
}
