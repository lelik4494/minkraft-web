class Renderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.fov = Math.PI / 3;
    this.renderDist = 12;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.W = this.canvas.width;
    this.H = this.canvas.height;
  }

  // Project world point → screen pixel
  // Convention: yaw=0 looks toward +Z, yaw=PI/2 looks toward +X
  project(wx, wy, wz, camX, camY, camZ, yaw, pitch) {
    // Translate
    const dx = wx - camX;
    const dy = wy - camY;
    const dz = wz - camZ;

    // Yaw rotation (around Y axis): forward = +Z when yaw=0
    const sy = Math.sin(yaw), cy = Math.cos(yaw);
    const rx =  dx * cy - dz * sy;   // screen X axis (right)
    const rz =  dx * sy + dz * cy;   // depth (forward)

    // Pitch rotation (around X axis): up = +Y when pitch=0
    const sp = Math.sin(pitch), cp = Math.cos(pitch);
    const ry = dy * cp - rz * sp;    // screen Y axis (up)
    const rd = dy * sp + rz * cp;    // final depth

    if (rd <= 0.05) return null;

    const scale = (this.H * 0.5) / Math.tan(this.fov * 0.5);
    const sx2 = this.W * 0.5 + (rx / rd) * scale;
    const sy2 = this.H * 0.5 - (ry / rd) * scale;
    return { sx: sx2, sy: sy2, dist: rd };
  }

  getFaceColor(blockType, face, dist) {
    const bc = BLOCK_COLORS[blockType];
    if (!bc) return '#ff00ff';
    let color = bc.all || (face==='top' ? bc.top : face==='bottom' ? bc.bottom : bc.side) || bc.all || '#888';
    let brightness = face==='top' ? 1.0 : face==='bottom' ? 0.45 : (face==='left'||face==='right') ? 0.65 : 0.8;
    const fog = Math.min(1, dist / (this.renderDist * CHUNK_SIZE * 0.75));
    brightness *= (1 - fog * 0.5);
    return this.shadedColor(color, brightness, fog);
  }

  shadedColor(hex, brightness, fog=0) {
    let r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    const fr=201,fg=232,fb=255;
    r = Math.round(r*brightness*(1-fog)+fr*fog);
    g = Math.round(g*brightness*(1-fog)+fg*fog);
    b = Math.round(b*brightness*(1-fog)+fb*fog);
    return `rgb(${Math.max(0,Math.min(255,r))},${Math.max(0,Math.min(255,g))},${Math.max(0,Math.min(255,b))})`;
  }

  render(player, selectedBlock) {
    const ctx = this.ctx;
    const eye = player.getEyePos();
    const { x: camX, y: camY, z: camZ } = eye;
    const { yaw, pitch } = player;

    const rd = this.renderDist;
    const fwdX = Math.sin(yaw) * Math.cos(pitch);
    const fwdZ = Math.cos(yaw) * Math.cos(pitch);

    const blocks = [];
    const bx0 = Math.floor(camX), bz0 = Math.floor(camZ);

    for (let wx = bx0 - rd; wx <= bx0 + rd; wx++) {
      for (let wz = bz0 - rd; wz <= bz0 + rd; wz++) {
        const ddx = wx - camX, ddz = wz - camZ;
        if (ddx*ddx + ddz*ddz > rd*rd) continue;
        // Frustum cull
        const dot = ddx*fwdX + ddz*fwdZ;
        if (dot < -3 && ddx*ddx+ddz*ddz > 9) continue;

        for (let wy = 0; wy < WORLD_HEIGHT; wy++) {
          const b = this.world.getBlock(wx, wy, wz);
          if (b === BLOCKS.AIR) continue;
          const ddy = wy - camY;
          const dist = Math.sqrt(ddx*ddx + ddy*ddy + ddz*ddz);
          if (dist > rd) continue;
          blocks.push({ wx, wy, wz, b, dist });
        }
      }
    }

    blocks.sort((a, b) => b.dist - a.dist);

    for (const { wx, wy, wz, b, dist } of blocks) {
      this.drawBlock(ctx, wx, wy, wz, b, dist, camX, camY, camZ, yaw, pitch);
    }
  }

  drawBlock(ctx, wx, wy, wz, blockType, dist, camX, camY, camZ, yaw, pitch) {
    const bc = BLOCK_COLORS[blockType];
    if (!bc) return;

    const FACES = [
      { name:'top',    pts:[[wx,wy+1,wz],[wx+1,wy+1,wz],[wx+1,wy+1,wz+1],[wx,wy+1,wz+1]], nx:0, ny:1, nz:0 },
      { name:'bottom', pts:[[wx,wy,wz],[wx+1,wy,wz],[wx+1,wy,wz+1],[wx,wy,wz+1]],         nx:0, ny:-1,nz:0 },
      { name:'front',  pts:[[wx,wy,wz+1],[wx+1,wy,wz+1],[wx+1,wy+1,wz+1],[wx,wy+1,wz+1]],nx:0, ny:0, nz:1 },
      { name:'back',   pts:[[wx+1,wy,wz],[wx,wy,wz],[wx,wy+1,wz],[wx+1,wy+1,wz]],         nx:0, ny:0, nz:-1},
      { name:'right',  pts:[[wx+1,wy,wz],[wx+1,wy,wz+1],[wx+1,wy+1,wz+1],[wx+1,wy+1,wz]],nx:1, ny:0, nz:0 },
      { name:'left',   pts:[[wx,wy,wz+1],[wx,wy,wz],[wx,wy+1,wz],[wx,wy+1,wz+1]],         nx:-1,ny:0, nz:0 },
    ];

    for (const face of FACES) {
      // Back-face culling: face normal must point toward camera
      const fcx = wx + 0.5 + face.nx * 0.5;
      const fcy = wy + 0.5 + face.ny * 0.5;
      const fcz = wz + 0.5 + face.nz * 0.5;
      const toCam = (camX-fcx)*face.nx + (camY-fcy)*face.ny + (camZ-fcz)*face.nz;
      if (toCam <= 0) continue;

      // Project corners
      const pts2D = [];
      let ok = true;
      for (const [px,py,pz] of face.pts) {
        const p = this.project(px, py, pz, camX, camY, camZ, yaw, pitch);
        if (!p) { ok = false; break; }
        pts2D.push(p);
      }
      if (!ok) continue;

      // Screen bounds check
      const minSX = Math.min(pts2D[0].sx,pts2D[1].sx,pts2D[2].sx,pts2D[3].sx);
      const maxSX = Math.max(pts2D[0].sx,pts2D[1].sx,pts2D[2].sx,pts2D[3].sx);
      const minSY = Math.min(pts2D[0].sy,pts2D[1].sy,pts2D[2].sy,pts2D[3].sy);
      const maxSY = Math.max(pts2D[0].sy,pts2D[1].sy,pts2D[2].sy,pts2D[3].sy);
      if (maxSX<0||minSX>this.W||maxSY<0||minSY>this.H) continue;

      const alpha = (bc.transparent && bc.alpha) ? bc.alpha : 1.0;
      ctx.globalAlpha = alpha;

      // Try texture first (set by pixelart.js / textures.js patch)
      const faceLabel = (face.name==='front'||face.name==='back') ? (bc.front?'front':'side') : face.name;
      let usedTexture = false;
      if (typeof TextureAtlas !== 'undefined' && dist < 18) {
        try {
          const tex = TextureAtlas.get(blockType, faceLabel);
          if (tex) {
            const w = maxSX-minSX, h = maxSY-minSY;
            if (w>0 && h>0) {
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(pts2D[0].sx,pts2D[0].sy);
              for(let i=1;i<4;i++) ctx.lineTo(pts2D[i].sx,pts2D[i].sy);
              ctx.closePath(); ctx.clip();
              ctx.drawImage(tex, minSX, minSY, w, h);
              // Lighting overlay
              const br = face.name==='top'?0 : face.name==='bottom'?0.55 : face.name==='left'||face.name==='right'?0.35 : 0.2;
              const fogF = Math.min(0.6, dist/(this.renderDist*CHUNK_SIZE*0.75)*0.6);
              ctx.fillStyle = `rgba(0,0,0,${br+fogF})`;
              ctx.fill();
              ctx.restore();
              usedTexture = true;
            }
          }
        } catch(e) {}
      }

      if (!usedTexture) {
        ctx.fillStyle = this.getFaceColor(blockType, face.name, dist);
        ctx.beginPath();
        ctx.moveTo(pts2D[0].sx,pts2D[0].sy);
        for(let i=1;i<4;i++) ctx.lineTo(pts2D[i].sx,pts2D[i].sy);
        ctx.closePath(); ctx.fill();
      }

      // Grid lines for close blocks
      if (dist < 10 && alpha === 1) {
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#000'; ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(pts2D[0].sx,pts2D[0].sy);
        for(let i=1;i<4;i++) ctx.lineTo(pts2D[i].sx,pts2D[i].sy);
        ctx.closePath(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
}
