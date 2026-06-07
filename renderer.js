class Renderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.fov = Math.PI / 3;
    this.renderDist = 12; // chunks
    this.skyColor = '#87CEEB';
    this.fogColor = '#c9e8ff';
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.W = this.canvas.width;
    this.H = this.canvas.height;
  }

  // Project 3D world point to 2D screen
  project(wx, wy, wz, camX, camY, camZ, yaw, pitch) {
    let dx = wx - camX, dy = wy - camY, dz = wz - camZ;
    // Rotate by yaw
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const rx  =  dx * cosY - dz * sinY;
    const rz0 =  dx * sinY + dz * cosY;
    // Rotate by pitch
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    const ry2 =  dy * cosP + rz0 * sinP;
    const rz2 = -dy * sinP + rz0 * cosP;
    if (rz2 <= 0.1) return null;
    const scale = (this.H / 2) / Math.tan(this.fov / 2);
    const sx = this.W / 2 - (rx  / rz2) * scale;
    const sy = this.H / 2 - (ry2 / rz2) * scale;
    return { sx, sy, dist: rz2 };
  }

  getFaceColor(blockType, face, dist) {
    const bc = BLOCK_COLORS[blockType];
    if (!bc) return '#ff00ff';
    let color;
    if (bc.all) color = bc.all;
    else if (face === 'top') color = bc.top || bc.all;
    else if (face === 'bottom') color = bc.bottom || bc.all;
    else color = bc.side || bc.all;

    // Lighting
    let brightness = 1.0;
    if (face === 'top') brightness = 1.0;
    else if (face === 'bottom') brightness = 0.5;
    else if (face === 'left' || face === 'right') brightness = 0.7;
    else brightness = 0.85;

    // Distance fog
    const fogFactor = Math.min(1, dist / (this.renderDist * CHUNK_SIZE * 0.8));
    brightness *= (1 - fogFactor * 0.5);

    return this.shadedColor(color, brightness, fogFactor);
  }

  shadedColor(hex, brightness, fog=0) {
    let r = parseInt(hex.slice(1,3),16);
    let g = parseInt(hex.slice(3,5),16);
    let b = parseInt(hex.slice(5,7),16);
    // Fog blend
    const fr=201, fg=232, fb=255;
    r = Math.round(r * brightness * (1-fog) + fr * fog);
    g = Math.round(g * brightness * (1-fog) + fg * fog);
    b = Math.round(b * brightness * (1-fog) + fb * fog);
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `rgb(${r},${g},${b})`;
  }

  drawSky(timeOfDay) {
    const skyR = Math.round(135 * timeOfDay), skyG = Math.round(206 * timeOfDay), skyB = Math.round(235 * timeOfDay);
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.H * 0.6);
    grad.addColorStop(0, `rgb(${skyR},${skyG},${skyB})`);
    grad.addColorStop(1, '#c9e8ff');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.W, this.H);

    // Clouds
    this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i=0;i<6;i++) {
      const cx = (i * 200 + Date.now()*0.01) % (this.W+200) - 100;
      const cy = this.H * 0.1 + i * 20;
      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy, 80, 20, 0, 0, Math.PI*2);
      this.ctx.fill();
    }
  }

  drawGround(camY, timeOfDay) {
    // Draw distant ground plane
    const horizY = this.H * 0.5;
    const grad = this.ctx.createLinearGradient(0, horizY, 0, this.H);
    grad.addColorStop(0, '#c9e8ff');
    grad.addColorStop(0.1, '#5d9e3a');
    grad.addColorStop(1, '#4a7a22');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, horizY, this.W, this.H - horizY);
  }

  render(player, selectedBlock) {
    const ctx = this.ctx;
    const { x: camX, y: camY, z: camZ, yaw, pitch } = player;
    const eyeY = camY + 1.6;

    const tod = 0.9; // time of day factor
    this.drawSky(tod);
    this.drawGround(eyeY, tod);

    // Get visible blocks
    const blocks = [];
    const rd = this.renderDist;
    const minX = Math.floor(camX) - rd, maxX = Math.floor(camX) + rd;
    const minZ = Math.floor(camZ) - rd, maxZ = Math.floor(camZ) + rd;

    // Forward direction for frustum culling
    const fwdX = Math.sin(yaw) * Math.cos(pitch);
    const fwdZ = Math.cos(yaw) * Math.cos(pitch);

    for (let wx = minX; wx <= maxX; wx++) {
      for (let wz = minZ; wz <= maxZ; wz++) {
        const dx = wx - camX, dz = wz - camZ;
        const dist2 = dx*dx + dz*dz;
        if (dist2 > rd*rd) continue;
        // Rough frustum check
        const dot = (dx * fwdX + dz * fwdZ);
        if (dot < -2 && dist2 > 4) continue;

        for (let wy = 0; wy < WORLD_HEIGHT; wy++) {
          const b = this.world.getBlock(wx, wy, wz);
          if (b === BLOCKS.AIR) continue;
          const dist = Math.sqrt(dx*dx + (wy-eyeY)*(wy-eyeY) + dz*dz);
          if (dist > rd) continue;
          blocks.push({ wx, wy, wz, b, dist });
        }
      }
    }

    // Sort back to front
    blocks.sort((a, b) => b.dist - a.dist);

    // Draw each visible block face
    for (const { wx, wy, wz, b, dist } of blocks) {
      this.drawBlock(ctx, wx, wy, wz, b, dist, camX, eyeY, camZ, yaw, pitch, selectedBlock);
    }
  }

  drawBlock(ctx, wx, wy, wz, blockType, dist, camX, camY, camZ, yaw, pitch) {
    const bc = BLOCK_COLORS[blockType];
    if (!bc) return;

    const faces = [
      // face, 4 corners in world coords
      { name:'top',    pts:[[wx,wy+1,wz],[wx+1,wy+1,wz],[wx+1,wy+1,wz+1],[wx,wy+1,wz+1]] },
      { name:'bottom', pts:[[wx,wy,wz],[wx+1,wy,wz],[wx+1,wy,wz+1],[wx,wy,wz+1]] },
      { name:'front',  pts:[[wx,wy,wz+1],[wx+1,wy,wz+1],[wx+1,wy+1,wz+1],[wx,wy+1,wz+1]] },
      { name:'back',   pts:[[wx,wy,wz],[wx+1,wy,wz],[wx+1,wy+1,wz],[wx,wy+1,wz]] },
      { name:'left',   pts:[[wx,wy,wz],[wx,wy,wz+1],[wx,wy+1,wz+1],[wx,wy+1,wz]] },
      { name:'right',  pts:[[wx+1,wy,wz],[wx+1,wy,wz+1],[wx+1,wy+1,wz+1],[wx+1,wy+1,wz]] },
    ];

    for (const face of faces) {
      // Backface culling: check if face center faces camera
      const cx = face.pts.reduce((s,p)=>s+p[0],0)/4;
      const cy = face.pts.reduce((s,p)=>s+p[1],0)/4;
      const cz = face.pts.reduce((s,p)=>s+p[2],0)/4;

      const toCamX = camX - cx, toCamY = camY - cy, toCamZ = camZ - cz;
      let nx=0, ny=0, nz=0;
      if (face.name==='top') ny=1;
      else if (face.name==='bottom') ny=-1;
      else if (face.name==='front') nz=1;
      else if (face.name==='back') nz=-1;
      else if (face.name==='left') nx=-1;
      else if (face.name==='right') nx=1;
      const dot = toCamX*nx + toCamY*ny + toCamZ*nz;
      if (dot <= 0) continue;

      // Project all 4 corners
      const pts2D = [];
      let allVisible = true;
      for (const [px,py,pz] of face.pts) {
        const p = this.project(px, py, pz, camX, camY, camZ, yaw, pitch);
        if (!p) { allVisible = false; break; }
        pts2D.push(p);
      }
      if (!allVisible || pts2D.length < 3) continue;

      // Check if on screen
      const minX2 = Math.min(...pts2D.map(p=>p.sx));
      const maxX2 = Math.max(...pts2D.map(p=>p.sx));
      const minY2 = Math.min(...pts2D.map(p=>p.sy));
      const maxY2 = Math.max(...pts2D.map(p=>p.sy));
      if (maxX2<0||minX2>this.W||maxY2<0||minY2>this.H) continue;

      const color = this.getFaceColor(blockType, face.name, dist);
      const alpha = (bc.transparent && bc.alpha) ? bc.alpha : 1.0;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(pts2D[0].sx, pts2D[0].sy);
      for (let i=1;i<pts2D.length;i++) ctx.lineTo(pts2D[i].sx, pts2D[i].sy);
      ctx.closePath();
      ctx.fill();

      // Pixel art grid lines
      if (dist < 8 && alpha === 1) {
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // Ore spots
      if (bc.spots && dist < 6) {
        this.drawOreSpots(ctx, pts2D, bc.spots, face.name);
      }
    }
  }

  drawOreSpots(ctx, pts2D, spotColor, face) {
    if (pts2D.length < 4) return;
    const cx = pts2D.reduce((s,p)=>s+p.sx,0)/4;
    const cy = pts2D.reduce((s,p)=>s+p.sy,0)/4;
    const dx = (pts2D[1].sx - pts2D[0].sx);
    const dy = (pts2D[1].sy - pts2D[0].sy);
    const size = Math.sqrt(dx*dx+dy*dy) * 0.12;
    ctx.fillStyle = spotColor;
    for (let i=0;i<4;i++) {
      const ox = (i%2===0?-1:1)*size*1.5;
      const oy = (i<2?-1:1)*size*1.5;
      ctx.fillRect(cx+ox-size/2, cy+oy-size/2, size, size);
    }
  }

  drawSelectedBlock(selectedBlock) {
    if (!selectedBlock || !selectedBlock.hit) return;
    // Will be integrated in render pass
  }
}
