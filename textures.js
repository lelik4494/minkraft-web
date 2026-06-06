// Texture generator - creates pixel art block textures via canvas
const TextureAtlas = (() => {
  const SIZE = 16; // 16x16 pixels per texture
  const cache = new Map();

  function makeCanvas(w = SIZE, h = SIZE) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function hex2rgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return [r,g,b];
  }

  function darken(hex, amt) {
    let [r,g,b] = hex2rgb(hex);
    r = Math.max(0, r - amt); g = Math.max(0, g - amt); b = Math.max(0, b - amt);
    return `rgb(${r},${g},${b})`;
  }
  function lighten(hex, amt) {
    let [r,g,b] = hex2rgb(hex);
    r = Math.min(255, r + amt); g = Math.min(255, g + amt); b = Math.min(255, b + amt);
    return `rgb(${r},${g},${b})`;
  }

  // Draw a noisy base texture
  function noisy(ctx, base, variance=20, seed=0) {
    const [br,bg,bb] = hex2rgb(base);
    const id = ctx.createImageData(SIZE, SIZE);
    const d = id.data;
    for (let i=0;i<SIZE*SIZE;i++) {
      const n = Math.sin(i*127.1+seed*311.7)*43758.5453;
      const v = (n - Math.floor(n)) * variance - variance/2;
      d[i*4  ] = Math.min(255,Math.max(0, br + v));
      d[i*4+1] = Math.min(255,Math.max(0, bg + v));
      d[i*4+2] = Math.min(255,Math.max(0, bb + v));
      d[i*4+3] = 255;
    }
    ctx.putImageData(id, 0, 0);
  }

  // Draw pixel grid overlay
  function gridOverlay(ctx, color='rgba(0,0,0,0.15)', gsize=4) {
    ctx.strokeStyle = color; ctx.lineWidth = 0.5;
    for (let i=0;i<=SIZE;i+=gsize) {
      ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(SIZE,i); ctx.stroke();
    }
  }

  // Makers per block type
  const makers = {
    [BLOCKS.GRASS]: (face) => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      if (face==='top') {
        noisy(ctx,'#5d9e3a',15,1);
        // blades
        ctx.fillStyle='#4a8a2a';
        for(let i=0;i<8;i++){ctx.fillRect(i*2,0,1,3);}
      } else {
        noisy(ctx,'#8b5a2b',15,2);
        if(face==='side'){ctx.fillStyle='#5d9e3a';ctx.fillRect(0,0,SIZE,3);}
        gridOverlay(ctx,'rgba(0,0,0,0.1)',8);
      }
      return c;
    },
    [BLOCKS.DIRT]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#8b5a2b',20,3);
      ctx.fillStyle='rgba(100,60,20,0.3)';
      ctx.fillRect(2,5,3,3); ctx.fillRect(10,2,2,2); ctx.fillRect(7,11,4,3);
      return c;
    },
    [BLOCKS.STONE]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#888888',12,4);
      ctx.fillStyle='rgba(0,0,0,0.1)';
      ctx.fillRect(1,1,6,6); ctx.fillRect(9,9,5,5); ctx.fillRect(5,10,3,3);
      return c;
    },
    [BLOCKS.COBBLESTONE]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#707070',18,5);
      ctx.fillStyle='rgba(0,0,0,0.25)';
      ctx.fillRect(0,0,7,7); ctx.fillRect(8,0,8,3); ctx.fillRect(0,8,4,8);ctx.fillRect(5,8,11,5);
      ctx.fillStyle='rgba(255,255,255,0.1)';
      ctx.fillRect(1,1,5,5);ctx.fillRect(9,1,6,2);
      return c;
    },
    [BLOCKS.LOG]: (face) => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      if(face==='top'||face==='bottom'){
        noisy(ctx,'#8b6040',10,6);
        ctx.strokeStyle='#5a3a15';ctx.lineWidth=1;
        for(let r=2;r<=7;r+=2){ctx.beginPath();ctx.arc(8,8,r,0,Math.PI*2);ctx.stroke();}
      } else {
        ctx.fillStyle='#6b4c2e'; ctx.fillRect(0,0,SIZE,SIZE);
        ctx.fillStyle='#4a3010';
        for(let i=0;i<SIZE;i+=5){ctx.fillRect(i,0,2,SIZE);}
        noisy(ctx,'rgba(0,0,0,0)',8,7);
      }
      return c;
    },
    [BLOCKS.PLANKS]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      ctx.fillStyle='#c8a060'; ctx.fillRect(0,0,SIZE,SIZE);
      ctx.fillStyle='#b08040';
      ctx.fillRect(0,4,SIZE,1);ctx.fillRect(0,10,SIZE,1);
      ctx.fillStyle='#d0a870';
      ctx.fillRect(0,1,SIZE,3);ctx.fillRect(0,5,SIZE,5);ctx.fillRect(0,11,SIZE,5);
      ctx.strokeStyle='rgba(0,0,0,0.15)';ctx.lineWidth=0.5;
      ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(8,4);ctx.stroke();
      ctx.beginPath();ctx.moveTo(4,5);ctx.lineTo(4,10);ctx.stroke();
      ctx.beginPath();ctx.moveTo(12,11);ctx.lineTo(12,16);ctx.stroke();
      return c;
    },
    [BLOCKS.LEAVES]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#2d7a1a',25,8);
      ctx.fillStyle='rgba(60,160,30,0.5)';
      for(let i=0;i<12;i++){ctx.fillRect(Math.floor(Math.sin(i)*6+7),Math.floor(Math.cos(i)*5+7),2,2);}
      return c;
    },
    [BLOCKS.SAND]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#c8b56e',18,9);
      ctx.fillStyle='rgba(180,160,80,0.3)';
      for(let i=0;i<20;i++){ctx.fillRect((i*73)%14,(i*51)%14,1,1);}
      return c;
    },
    [BLOCKS.WATER]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#1a6bb5',15,10);
      ctx.fillStyle='rgba(100,180,255,0.4)';
      ctx.fillRect(0,5,SIZE,2);ctx.fillRect(0,12,SIZE,2);
      ctx.fillStyle='rgba(255,255,255,0.2)';
      ctx.fillRect(2,6,4,1);ctx.fillRect(10,13,4,1);
      return c;
    },
    [BLOCKS.GLASS]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      ctx.fillStyle='rgba(170,220,255,0.3)'; ctx.fillRect(0,0,SIZE,SIZE);
      ctx.strokeStyle='rgba(200,240,255,0.8)'; ctx.lineWidth=1;
      ctx.strokeRect(0,0,SIZE,SIZE);
      ctx.strokeRect(1,1,SIZE-2,SIZE-2);
      ctx.fillStyle='rgba(255,255,255,0.3)';
      ctx.fillRect(2,2,3,3);
      return c;
    },
    [BLOCKS.BRICK]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      ctx.fillStyle='#8b4040'; ctx.fillRect(0,0,SIZE,SIZE);
      ctx.fillStyle='#6b3030';
      ctx.fillRect(0,5,SIZE,2);ctx.fillRect(0,13,SIZE,2);
      ctx.fillStyle='#5a2020';
      ctx.fillRect(7,0,2,5);ctx.fillRect(7,7,2,6);ctx.fillRect(3,7,2,6);ctx.fillRect(11,0,2,5);
      ctx.fillStyle='rgba(180,100,80,0.3)';
      ctx.fillRect(1,1,6,4);ctx.fillRect(9,7,6,5);
      return c;
    },
    [BLOCKS.COAL_ORE]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#888888',12,11);
      ctx.fillStyle='#111111';
      ctx.fillRect(3,3,4,4);ctx.fillRect(10,2,3,3);ctx.fillRect(9,10,4,4);ctx.fillRect(2,11,3,3);
      return c;
    },
    [BLOCKS.IRON_ORE]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#888888',12,12);
      ctx.fillStyle='#c8a090';
      ctx.fillRect(3,3,4,4);ctx.fillRect(10,2,3,3);ctx.fillRect(9,10,4,4);ctx.fillRect(2,11,3,3);
      ctx.fillStyle='rgba(200,160,140,0.5)';
      ctx.fillRect(4,4,2,2);ctx.fillRect(10,10,2,2);
      return c;
    },
    [BLOCKS.GOLD_ORE]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#888888',12,13);
      ctx.fillStyle='#ffd700';
      ctx.fillRect(3,3,4,4);ctx.fillRect(10,2,3,3);ctx.fillRect(9,10,4,4);ctx.fillRect(2,11,3,3);
      ctx.fillStyle='#ffed60';
      ctx.fillRect(4,4,2,2);ctx.fillRect(10,10,2,2);
      return c;
    },
    [BLOCKS.DIAMOND_ORE]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#888888',12,14);
      ctx.fillStyle='#00e5ff';
      ctx.fillRect(3,3,4,4);ctx.fillRect(10,2,3,3);ctx.fillRect(9,10,4,4);ctx.fillRect(2,11,3,3);
      ctx.fillStyle='rgba(150,255,255,0.7)';
      ctx.fillRect(4,4,2,2);ctx.fillRect(10,10,2,2);
      return c;
    },
    [BLOCKS.BEDROCK]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#444444',8,15);
      ctx.fillStyle='rgba(0,0,0,0.4)';
      ctx.fillRect(0,0,5,5);ctx.fillRect(8,4,8,4);ctx.fillRect(2,10,6,6);ctx.fillRect(11,11,5,5);
      return c;
    },
    [BLOCKS.GRAVEL]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#999090',20,16);
      ctx.fillStyle='rgba(100,90,90,0.4)';
      for(let i=0;i<6;i++){ctx.beginPath();ctx.arc((i*67+3)%13+1,(i*53+7)%13+1,1.5,0,Math.PI*2);ctx.fill();}
      return c;
    },
    [BLOCKS.SNOW]: (face) => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      if(face==='top'){noisy(ctx,'#ffffff',10,17);}
      else if(face==='bottom'){noisy(ctx,'#8b5a2b',15,18);}
      else{noisy(ctx,'#eeeeee',8,19);}
      return c;
    },
    [BLOCKS.ICE]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#88ccff',10,20);
      ctx.fillStyle='rgba(200,240,255,0.5)';
      ctx.fillRect(2,2,4,4);ctx.fillRect(10,8,4,4);
      ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(16,8);ctx.stroke();
      return c;
    },
    [BLOCKS.CACTUS]: (face) => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      ctx.fillStyle='#1a7010';ctx.fillRect(0,0,SIZE,SIZE);
      ctx.fillStyle='#2d8a1a';
      if(face==='top'){ctx.fillRect(4,4,8,8);}
      else{ctx.fillRect(3,0,10,SIZE);ctx.fillStyle='#145810';ctx.fillRect(2,4,1,2);ctx.fillRect(13,8,1,2);}
      return c;
    },
    [BLOCKS.WOOL_RED]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#cc3333',15,21);
      ctx.fillStyle='rgba(180,20,20,0.3)';
      for(let y=0;y<SIZE;y+=3){ctx.fillRect(0,y,SIZE,1);}
      return c;
    },
    [BLOCKS.WOOL_BLUE]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#3355cc',15,22);
      ctx.fillStyle='rgba(20,30,180,0.3)';
      for(let y=0;y<SIZE;y+=3){ctx.fillRect(0,y,SIZE,1);}
      return c;
    },
    [BLOCKS.WOOL_GREEN]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      noisy(ctx,'#336633',15,23);
      ctx.fillStyle='rgba(20,80,20,0.3)';
      for(let y=0;y<SIZE;y+=3){ctx.fillRect(0,y,SIZE,1);}
      return c;
    },
    [BLOCKS.CRAFTING_TABLE]: (face) => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      ctx.fillStyle = face==='top'?'#8b6040':face==='bottom'?'#c8a060':'#9a7050';
      ctx.fillRect(0,0,SIZE,SIZE);
      if(face==='top'){
        ctx.strokeStyle='#5a3a10';ctx.lineWidth=1;
        ctx.strokeRect(2,2,12,12);ctx.strokeRect(6,2,4,12);ctx.strokeRect(2,6,12,4);
        ctx.fillStyle='#c8a060';ctx.fillRect(3,3,3,3);ctx.fillRect(10,3,3,3);ctx.fillRect(3,10,3,3);ctx.fillRect(10,10,3,3);
      } else {
        noisy(ctx,'rgba(0,0,0,0)',8,24);
        ctx.fillStyle='rgba(80,50,20,0.4)';
        ctx.fillRect(0,4,SIZE,1);ctx.fillRect(0,12,SIZE,1);
      }
      return c;
    },
    [BLOCKS.FURNACE]: (face) => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      if(face==='front'){
        noisy(ctx,'#888888',10,25);
        ctx.fillStyle='#222222';ctx.fillRect(4,4,8,8);
        ctx.fillStyle='#ff6600';ctx.fillRect(5,5,6,6);
        ctx.fillStyle='#ffaa00';ctx.fillRect(6,6,4,4);
        ctx.fillStyle='#ffff00';ctx.fillRect(7,7,2,2);
      } else {
        noisy(ctx,'#888888',10,26);
      }
      return c;
    },
    [BLOCKS.CHEST]: (face) => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      ctx.fillStyle='#c8a060';ctx.fillRect(0,0,SIZE,SIZE);
      ctx.fillStyle='#8b6040';ctx.fillRect(0,7,SIZE,2);
      ctx.strokeStyle='#5a3a10';ctx.lineWidth=1;ctx.strokeRect(0,0,SIZE,SIZE);
      if(face==='front'){
        ctx.fillStyle='#8b6040';ctx.fillRect(6,6,4,3);
        ctx.fillStyle='#ffd700';ctx.fillRect(7,7,2,2);
      }
      return c;
    },
    [BLOCKS.BOOKSHELF]: (face) => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      if(face==='top'||face==='bottom'){noisy(ctx,'#c8a060',10,27);}
      else{
        ctx.fillStyle='#c8a060';ctx.fillRect(0,0,SIZE,SIZE);
        const colors=['#cc4444','#4444cc','#44cc44','#cc8800','#884488','#448888'];
        for(let i=0;i<6;i++){ctx.fillStyle=colors[i];ctx.fillRect(i*2+2,2,2,12);}
        ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(0,0,SIZE,2);ctx.fillRect(0,14,SIZE,2);
      }
      return c;
    },
    [BLOCKS.TORCH]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      ctx.fillStyle='rgba(0,0,0,0)';ctx.fillRect(0,0,SIZE,SIZE);
      ctx.fillStyle='#8b6040';ctx.fillRect(7,5,2,10);
      ctx.fillStyle='#ffdd44';ctx.fillRect(6,3,4,4);
      ctx.fillStyle='#ff8800';ctx.fillRect(7,2,2,2);
      ctx.fillStyle='#ffffff';ctx.fillRect(7,1,1,1);
      return c;
    },
    [BLOCKS.FLOWER]: () => {
      const c = makeCanvas(); const ctx = c.getContext('2d');
      ctx.fillStyle='rgba(0,0,0,0)';ctx.fillRect(0,0,SIZE,SIZE);
      ctx.fillStyle='#228b22';ctx.fillRect(7,8,2,8);
      ctx.fillStyle='#ff6688';
      ctx.fillRect(5,4,6,2);ctx.fillRect(5,6,2,4);ctx.fillRect(9,6,2,4);ctx.fillRect(5,10,6,2);
      ctx.fillStyle='#ffdd00';ctx.fillRect(6,6,4,4);
      return c;
    },
  };

  return {
    get(blockType, face='side') {
      const key = `${blockType}_${face}`;
      if (cache.has(key)) return cache.get(key);
      const maker = makers[blockType];
      const tex = maker ? maker(face) : (() => {
        const c = makeCanvas(); const ctx = c.getContext('2d');
        ctx.fillStyle='#ff00ff'; ctx.fillRect(0,0,SIZE,SIZE); return c;
      })();
      cache.set(key, tex);
      return tex;
    },
    SIZE
  };
})();

// Patch renderer to use texture atlas for block faces
(function patchRenderer() {
  const origDrawBlock = Renderer.prototype.drawBlock;
  Renderer.prototype.drawBlock = function(ctx, wx, wy, wz, blockType, dist, camX, camY, camZ, yaw, pitch) {
    const bc = BLOCK_COLORS[blockType];
    if (!bc) return;

    const faces = [
      { name:'top',    pts:[[wx,wy+1,wz],[wx+1,wy+1,wz],[wx+1,wy+1,wz+1],[wx,wy+1,wz+1]] },
      { name:'bottom', pts:[[wx,wy,wz],[wx+1,wy,wz],[wx+1,wy,wz+1],[wx,wy,wz+1]] },
      { name:'front',  pts:[[wx,wy,wz+1],[wx+1,wy,wz+1],[wx+1,wy+1,wz+1],[wx,wy+1,wz+1]] },
      { name:'back',   pts:[[wx,wy,wz],[wx+1,wy,wz],[wx+1,wy+1,wz],[wx,wy+1,wz]] },
      { name:'left',   pts:[[wx,wy,wz],[wx,wy,wz+1],[wx,wy+1,wz+1],[wx,wy+1,wz]] },
      { name:'right',  pts:[[wx+1,wy,wz],[wx+1,wy,wz+1],[wx+1,wy+1,wz+1],[wx+1,wy+1,wz]] },
    ];

    for (const face of faces) {
      const cx2 = face.pts.reduce((s,p)=>s+p[0],0)/4;
      const cy2 = face.pts.reduce((s,p)=>s+p[1],0)/4;
      const cz2 = face.pts.reduce((s,p)=>s+p[2],0)/4;
      const toCamX=camX-cx2, toCamY=camY-cy2, toCamZ=camZ-cz2;
      let nx=0,ny=0,nz=0;
      if(face.name==='top')ny=1; else if(face.name==='bottom')ny=-1;
      else if(face.name==='front')nz=1; else if(face.name==='back')nz=-1;
      else if(face.name==='left')nx=-1; else if(face.name==='right')nx=1;
      if(toCamX*nx+toCamY*ny+toCamZ*nz<=0) continue;

      const pts2D = [];
      let allOk = true;
      for (const [px,py,pz] of face.pts) {
        const p = this.project(px,py,pz,camX,camY,camZ,yaw,pitch);
        if (!p) { allOk=false; break; }
        pts2D.push(p);
      }
      if (!allOk || pts2D.length < 3) continue;

      const minX2=Math.min(...pts2D.map(p=>p.sx)), maxX2=Math.max(...pts2D.map(p=>p.sx));
      const minY2=Math.min(...pts2D.map(p=>p.sy)), maxY2=Math.max(...pts2D.map(p=>p.sy));
      if(maxX2<0||minX2>this.W||maxY2<0||minY2>this.H) continue;

      const faceLabel = face.name==='front'||face.name==='back' ? (bc.front?'front':'side') : face.name;
      const tex = TextureAtlas.get(blockType, faceLabel);
      const alpha = (bc.transparent&&bc.alpha) ? bc.alpha : 1.0;

      // Brightness per face
      let brightness = face.name==='top'?1.0 : face.name==='bottom'?0.5 : (face.name==='left'||face.name==='right')?0.7 : 0.85;
      const fogFactor = Math.min(1, dist / (this.renderDist * CHUNK_SIZE * 0.8));
      brightness *= (1 - fogFactor * 0.4);

      ctx.globalAlpha = alpha;
      // Use canvas pattern for texture mapping (affine approximation on quad)
      // For close blocks: use actual texture via drawImage with clip
      const w = maxX2-minX2, h = maxY2-minY2;
      if (w > 0 && h > 0 && dist < 20) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts2D[0].sx,pts2D[0].sy);
        for(let i=1;i<pts2D.length;i++) ctx.lineTo(pts2D[i].sx,pts2D[i].sy);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(tex, minX2, minY2, Math.max(1,w), Math.max(1,h));
        ctx.fillStyle=`rgba(0,0,0,${1-brightness})`;
        ctx.fillRect(minX2,minY2,Math.max(1,w),Math.max(1,h));
        ctx.restore();
      } else {
        // Far blocks: solid color for performance
        ctx.fillStyle = this.getFaceColor(blockType, face.name, dist);
        ctx.beginPath();
        ctx.moveTo(pts2D[0].sx,pts2D[0].sy);
        for(let i=1;i<pts2D.length;i++) ctx.lineTo(pts2D[i].sx,pts2D[i].sy);
        ctx.closePath();
        ctx.fill();
      }

      if(dist<10&&alpha===1){
        ctx.globalAlpha=0.12;ctx.strokeStyle='#000';ctx.lineWidth=0.5;
        ctx.beginPath();ctx.moveTo(pts2D[0].sx,pts2D[0].sy);
        for(let i=1;i<pts2D.length;i++)ctx.lineTo(pts2D[i].sx,pts2D[i].sy);
        ctx.closePath();ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
  };
})();
