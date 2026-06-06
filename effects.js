// ========== AUDIO ENGINE ==========
const SoundEngine = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function playTone(freq, type='square', duration=0.1, vol=0.05, decay=0.1) {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration + decay);
      osc.start(); osc.stop(ac.currentTime + duration + decay);
    } catch(e) {}
  }

  function playNoise(duration=0.05, vol=0.08, filterFreq=1000) {
    try {
      const ac = getCtx();
      const bufSize = ac.sampleRate * duration;
      const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      const data = buf.getChannelData(0);
      for(let i=0;i<bufSize;i++) data[i] = Math.random()*2-1;
      const src = ac.createBufferSource();
      const filt = ac.createBiquadFilter();
      const gain = ac.createGain();
      src.buffer = buf;
      filt.type='bandpass'; filt.frequency.value=filterFreq;
      src.connect(filt); filt.connect(gain); gain.connect(ac.destination);
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+duration);
      src.start(); src.stop(ac.currentTime+duration);
    } catch(e) {}
  }

  const sounds = {
    break_stone: () => { playNoise(0.08,0.1,800); playTone(120,'sawtooth',0.05,0.03); },
    break_dirt:  () => { playNoise(0.1,0.08,400); },
    break_wood:  () => { playNoise(0.07,0.08,600); playTone(180,'square',0.04,0.03); },
    break_grass: () => { playNoise(0.06,0.06,300); },
    place:       () => { playTone(300,'square',0.04,0.04,0.05); },
    step_stone:  () => { playNoise(0.04,0.04,1200); },
    step_grass:  () => { playNoise(0.05,0.04,350); },
    step_sand:   () => { playNoise(0.06,0.04,200); },
    jump:        () => { playTone(200,'sine',0.05,0.05,0.1); },
    splash:      () => { playNoise(0.15,0.1,600); playTone(80,'sine',0.1,0.04); },
    ambient_cave:() => { playTone(40+Math.random()*20,'sine',0.5,0.02,1.0); },
    xp:          () => { [500,700,900].forEach((f,i)=>setTimeout(()=>playTone(f,'sine',0.1,0.04),i*60)); },
    damage:      () => { playNoise(0.1,0.1,500); playTone(150,'sawtooth',0.05,0.05); },
    pop:         () => { playTone(600,'sine',0.03,0.05,0.05); },
    wind:        () => { playNoise(0.3,0.02,200+Math.random()*100); },
    thunder:     () => { playNoise(0.5,0.15,60); setTimeout(()=>playNoise(0.3,0.08,80),100); },
    music_note:  (note) => { const notes={C:262,D:294,E:330,F:349,G:392,A:440,B:494}; playTone((notes[note]||330)*2,'sine',0.3,0.04,0.5); },
  };

  return { play(name){ const fn=sounds[name]; if(fn)fn(); }, sounds };
})();

// ========== PARTICLE SYSTEM ==========
const Particles = (() => {
  const list = [];

  function spawn(x, y, z, type, renderer, player) {
    const count = type==='break'?8:type==='splash'?12:4;
    for(let i=0;i<count;i++) {
      list.push({
        x, y, z,
        vx: (Math.random()-0.5)*4,
        vy: Math.random()*4+1,
        vz: (Math.random()-0.5)*4,
        life: 0.5+Math.random()*0.5,
        maxLife: 1,
        type,
        color: type==='break'?'#888':type==='splash'?'#4499ff':type==='leaf'?'#2d7a1a':'#ffcc44',
        size: 3+Math.random()*3,
      });
    }
  }

  function update(dt) {
    for(let i=list.length-1;i>=0;i--) {
      const p=list[i];
      p.vy -= 10*dt;
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt;
      p.life-=dt;
      if(p.life<=0) list.splice(i,1);
    }
  }

  function draw(ctx, renderer, player) {
    const eye = player.getEyePos();
    for(const p of list) {
      const proj = renderer.project(p.x,p.y,p.z,eye.x,eye.y,eye.z,player.yaw,player.pitch);
      if(!proj) continue;
      const alpha = p.life / (p.maxLife||1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(proj.sx-p.size/2, proj.sy-p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  return { spawn, update, draw };
})();

// ========== MOBS ==========
const MobSystem = (() => {
  const mobs = [];
  const MOB_TYPES = {
    cow:   { emoji:'🐄', color:'#c8c8a0', hp:10, speed:1.5, passive:true, drops:BLOCKS.DIRT },
    pig:   { emoji:'🐷', color:'#f4a0a0', hp:10, speed:1.5, passive:true, drops:BLOCKS.DIRT },
    sheep: { emoji:'🐑', color:'#e0e0e0', hp:8,  speed:1.5, passive:true, drops:BLOCKS.WOOL_RED },
    chicken:{ emoji:'🐔',color:'#f0e090', hp:4,  speed:2,   passive:true, drops:BLOCKS.DIRT },
  };

  function spawnNear(world, px, pz) {
    if(mobs.length >= 20) return;
    const angle = Math.random()*Math.PI*2;
    const dist = 15+Math.random()*20;
    const mx = px + Math.cos(angle)*dist;
    const mz = pz + Math.sin(angle)*dist;
    let my = SEA_LEVEL;
    for(let y=WORLD_HEIGHT-1;y>=0;y--){
      const b=world.getBlock(Math.floor(mx),y,Math.floor(mz));
      if(b!==BLOCKS.AIR&&b!==BLOCKS.WATER){my=y+1;break;}
    }
    if(my<=SEA_LEVEL) return;
    const types=Object.keys(MOB_TYPES);
    const type=types[Math.floor(Math.random()*types.length)];
    mobs.push({x:mx,y:my,z:mz,vx:0,vy:0,vz:0,type,
      hp:MOB_TYPES[type].hp,maxHp:MOB_TYPES[type].hp,
      yaw:Math.random()*Math.PI*2,
      moveTimer:0,wanderX:mx,wanderZ:mz,
      id:Math.random()
    });
  }

  function update(dt, world, player) {
    for(let i=mobs.length-1;i>=0;i--) {
      const m=mobs[i];
      const type=MOB_TYPES[m.type];

      // Wander AI
      m.moveTimer-=dt;
      if(m.moveTimer<=0){
        m.moveTimer=2+Math.random()*3;
        const a=Math.random()*Math.PI*2;
        m.wanderX=m.x+Math.cos(a)*8; m.wanderZ=m.z+Math.sin(a)*8;
      }
      const dx=m.wanderX-m.x, dz=m.wanderZ-m.z;
      const d=Math.sqrt(dx*dx+dz*dz);
      if(d>0.5){
        m.x+=dx/d*type.speed*dt; m.z+=dz/d*type.speed*dt;
        m.yaw=Math.atan2(dx,dz);
      }

      // Gravity
      m.vy-=20*dt;
      m.y+=m.vy*dt;
      const by=Math.floor(m.y-0.1);
      const floor=world.getBlock(Math.floor(m.x),by,Math.floor(m.z));
      if(floor!==BLOCKS.AIR){m.y=by+1;m.vy=0;}

      // Passive flee from player
      const pdx=m.x-player.x, pdz=m.z-player.z;
      const pdist=Math.sqrt(pdx*pdx+pdz*pdz);
      if(pdist<5&&type.passive){
        m.x+=pdx/pdist*type.speed*2*dt;
        m.z+=pdz/pdist*type.speed*2*dt;
      }

      // Remove if too far
      if(pdist>60) mobs.splice(i,1);
    }
  }

  function draw(ctx, renderer, player) {
    const eye=player.getEyePos();
    for(const m of mobs) {
      const proj=renderer.project(m.x+0.5,m.y+1,m.z+0.5,eye.x,eye.y,eye.z,player.yaw,player.pitch);
      if(!proj||proj.dist>20) continue;
      const scale=Math.max(4, 40/proj.dist);
      ctx.globalAlpha=1;
      ctx.font=`${scale*2}px serif`;
      ctx.textAlign='center';
      ctx.fillText(MOB_TYPES[m.type].emoji, proj.sx, proj.sy);
      // HP bar
      if(m.hp<m.maxHp){
        ctx.fillStyle='#000';ctx.fillRect(proj.sx-20,proj.sy-scale*2-6,40,4);
        ctx.fillStyle='#00ff00';ctx.fillRect(proj.sx-20,proj.sy-scale*2-6,40*(m.hp/m.maxHp),4);
      }
    }
    ctx.textAlign='left';
  }

  function hitMob(player, world) {
    const eye=player.getEyePos();
    const dir=player.getLookDir();
    for(let i=mobs.length-1;i>=0;i--){
      const m=mobs[i];
      const dx=m.x-eye.x,dy=m.y+0.5-eye.y,dz=m.z-eye.z;
      const dot=dx*dir.dx+dy*dir.dy+dz*dir.dz;
      if(dot<0) continue;
      const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
      if(dist>5) continue;
      const cx=eye.x+dir.dx*dot, cy=eye.y+dir.dy*dot, cz=eye.z+dir.dz*dot;
      if(Math.abs(cx-m.x)<0.8&&Math.abs(cy-m.y-0.5)<1&&Math.abs(cz-m.z)<0.8){
        mobs[i].hp-=5;
        SoundEngine.play('damage');
        Particles.spawn(m.x,m.y+0.5,m.z,'break');
        if(mobs[i].hp<=0){
          const drop=MOB_TYPES[m.type].drops;
          SoundEngine.play('xp'); player.xp+=5;
          mobs.splice(i,1);
          return true;
        }
      }
    }
    return false;
  }

  return { spawn:spawnNear, update, draw, hitMob, mobs };
})();

// ========== DAY/NIGHT CYCLE ==========
const DayNight = (() => {
  let time = 0.3; // 0=midnight, 0.5=noon
  const DAY_LENGTH = 600; // seconds per full day

  function update(dt) { time = (time + dt/DAY_LENGTH) % 1; }

  function getSkyColor() {
    const t = Math.abs(Math.sin(time*Math.PI));
    const night={r:10,g:15,b:40}, day={r:135,g:206,b:235}, dawn={r:255,g:165,b:80};
    let r,g,b;
    if(t>0.2){
      const tf=(t-0.2)/0.8;
      r=Math.round(night.r+(day.r-night.r)*tf);
      g=Math.round(night.g+(day.g-night.g)*tf);
      b=Math.round(night.b+(day.b-night.b)*tf);
    } else {
      const tf=t/0.2;
      r=Math.round(night.r+(dawn.r-night.r)*tf);
      g=Math.round(night.g+(dawn.g-night.g)*tf);
      b=Math.round(night.b+(dawn.b-night.b)*tf);
    }
    return `rgb(${r},${g},${b})`;
  }

  function getLightLevel() { return 0.2 + 0.8*Math.max(0,Math.sin(time*Math.PI+0.1)); }

  function drawSky(ctx, W, H) {
    const sky=getSkyColor();
    const grad=ctx.createLinearGradient(0,0,0,H*0.55);
    grad.addColorStop(0,sky); grad.addColorStop(1,'rgba(200,230,255,0.8)');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

    const t=Math.abs(Math.sin(time*Math.PI));
    if(t<0.2){
      // Stars
      ctx.fillStyle=`rgba(255,255,255,${0.8*(1-t/0.2)})`;
      for(let i=0;i<80;i++){
        const sx=(i*137.5)%W, sy=(i*91.3)%H*0.5;
        ctx.fillRect(sx,sy,1.5,1.5);
      }
      // Moon
      ctx.fillStyle=`rgba(230,230,200,${0.9*(1-t/0.2)})`;
      ctx.beginPath();ctx.arc(W*0.8,H*0.12,20,0,Math.PI*2);ctx.fill();
    } else {
      // Sun
      const sunX=W*(0.1+0.8*((time+0.5)%1));
      const sunY=H*(0.05+0.3*(1-t));
      ctx.fillStyle='#ffffaa'; ctx.beginPath(); ctx.arc(sunX,sunY,18,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,180,0.3)'; ctx.beginPath(); ctx.arc(sunX,sunY,28,0,Math.PI*2); ctx.fill();
      // Clouds
      ctx.fillStyle=`rgba(255,255,255,${0.7*t})`;
      for(let i=0;i<5;i++){
        const cx=(i*300+(Date.now()*0.005))%(W+200)-100;
        const cy=H*0.08+i*18;
        ctx.beginPath();ctx.ellipse(cx,cy,70,16,0,0,Math.PI*2);ctx.fill();
      }
    }
  }

  return { update, getSkyColor, getLightLevel, drawSky, getTime:()=>time };
})();

// ========== WEATHER ==========
const Weather = (() => {
  let type='clear'; // clear, rain, snow
  let timer=60;
  let drops=[];

  function update(dt, player) {
    timer-=dt;
    if(timer<=0){
      timer=30+Math.random()*120;
      const r=Math.random();
      type=r<0.6?'clear':r<0.85?'rain':'snow';
    }
    if(type!=='clear'){
      // Spawn drops
      for(let i=0;i<10;i++){
        drops.push({
          x:player.x+(Math.random()-0.5)*30,
          y:player.y+15+Math.random()*10,
          z:player.z+(Math.random()-0.5)*30,
          vy:type==='rain'?-20:-5,
          life:1,
        });
      }
      for(let i=drops.length-1;i>=0;i--){
        drops[i].y+=drops[i].vy*dt;
        drops[i].life-=dt;
        if(drops[i].life<=0||drops[i].y<player.y-5) drops.splice(i,1);
      }
      if(drops.length>500) drops.splice(0,200);
    } else {
      drops=[];
    }
  }

  function draw(ctx, renderer, player) {
    if(type==='clear') return;
    const eye=player.getEyePos();
    ctx.strokeStyle=type==='rain'?'rgba(150,180,255,0.4)':'rgba(255,255,255,0.6)';
    ctx.lineWidth=type==='rain'?1:2;
    for(const d of drops){
      const p=renderer.project(d.x,d.y,d.z,eye.x,eye.y,eye.z,player.yaw,player.pitch);
      if(!p) continue;
      const p2=renderer.project(d.x,d.y+(type==='rain'?0.5:0.2),d.z,eye.x,eye.y,eye.z,player.yaw,player.pitch);
      if(!p2) continue;
      ctx.beginPath();ctx.moveTo(p.sx,p.sy);ctx.lineTo(p2.sx,p2.sy);ctx.stroke();
    }
  }

  return { update, draw, getType:()=>type };
})();

// ========== PATCH GAME LOOP ==========
(function patchGame() {
  // Intercept game start to inject systems
  const origStart = window.startGame;
  window.startGame = function() {
    origStart();

    // Mob spawn timer
    let mobTimer=5, stepTimer=0, ambientTimer=20, weatherSoundTimer=0;

    // Override game loop
    cancelAnimationFrame(animFrame);

    function enhancedLoop(now) {
      if(!gameRunning) return;
      const dt=Math.min((now-lastTime)/1000,0.05);
      lastTime=now;

      const paused = !el('pause-menu').classList.contains('hidden') || !el('inventory-screen').classList.contains('hidden');
      if(!paused){
        player.update(dt);
        DayNight.update(dt);
        Weather.update(dt, player);
        Particles.update(dt);

        // Mob management
        mobTimer-=dt;
        if(mobTimer<=0){ mobTimer=5; MobSystem.spawn(world,player.x,player.z); }
        MobSystem.update(dt, world, player);

        // Step sounds
        stepTimer-=dt;
        if(stepTimer<=0 && (Math.abs(player.vx)>0.5||Math.abs(player.vz)>0.5) && player.onGround){
          stepTimer=0.4;
          const bUnder=world.getBlock(Math.floor(player.x),Math.floor(player.y)-1,Math.floor(player.z));
          if(bUnder===BLOCKS.STONE||bUnder===BLOCKS.COBBLESTONE) SoundEngine.play('step_stone');
          else if(bUnder===BLOCKS.SAND||bUnder===BLOCKS.GRAVEL) SoundEngine.play('step_sand');
          else SoundEngine.play('step_grass');
        }

        // Ambient sounds
        ambientTimer-=dt;
        if(ambientTimer<=0){ ambientTimer=15+Math.random()*30; if(player.y<SEA_LEVEL-5) SoundEngine.play('ambient_cave'); }

        // Weather sounds
        if(Weather.getType()==='rain'){
          weatherSoundTimer-=dt;
          if(weatherSoundTimer<=0){ weatherSoundTimer=0.3; SoundEngine.play('wind'); }
        }

        const eye=player.getEyePos();
        const dir=player.getLookDir();
        const ray=world.raycast(eye.x,eye.y,eye.z,dir.dx,dir.dy,dir.dz);

        player.handleBreaking(dt, ray);
        updateHUD();
        updateDebug(ray);

        // Render with enhanced sky
        const ctx=renderer.ctx;
        DayNight.drawSky(ctx, renderer.W, renderer.H);
        // Ground
        const grad=ctx.createLinearGradient(0,renderer.H*0.5,0,renderer.H);
        grad.addColorStop(0,'#c9e8ff');grad.addColorStop(0.1,'#5d9e3a');grad.addColorStop(1,'#4a7a22');
        ctx.fillStyle=grad;ctx.fillRect(0,renderer.H*0.5,renderer.W,renderer.H*0.5);

        // Apply light level to renderer
        renderer.lightLevel=DayNight.getLightLevel();
        const blocks=[];
        const rd=renderer.renderDist;
        const fwdX=Math.sin(player.yaw)*Math.cos(player.pitch);
        const fwdZ=Math.cos(player.yaw)*Math.cos(player.pitch);
        for(let wx=Math.floor(player.x)-rd;wx<=Math.floor(player.x)+rd;wx++){
          for(let wz=Math.floor(player.z)-rd;wz<=Math.floor(player.z)+rd;wz++){
            const dx=wx-player.x,dz=wz-player.z;
            const dist2=dx*dx+dz*dz;
            if(dist2>rd*rd) continue;
            const dot=dx*fwdX+dz*fwdZ;
            if(dot<-2&&dist2>4) continue;
            for(let wy=0;wy<WORLD_HEIGHT;wy++){
              const b=world.getBlock(wx,wy,wz);
              if(b===BLOCKS.AIR) continue;
              const dist=Math.sqrt(dx*dx+(wy-eye.y)*(wy-eye.y)+dz*dz);
              if(dist>rd) continue;
              blocks.push({wx,wy,wz,b,dist});
            }
          }
        }
        blocks.sort((a,b)=>b.dist-a.dist);
        for(const {wx,wy,wz,b,dist} of blocks){
          renderer.drawBlock(ctx,wx,wy,wz,b,dist,eye.x,eye.y,eye.z,player.yaw,player.pitch);
        }

        Particles.draw(ctx, renderer, player);
        Weather.draw(ctx, renderer, player);
        MobSystem.draw(ctx, renderer, player);
        drawBreakOverlay(ray, player.breakProgress);
        drawBlockOutline(ray, player, renderer);

        // Night overlay
        const nightAlpha=Math.max(0,1-DayNight.getLightLevel()*1.2);
        if(nightAlpha>0){
          ctx.fillStyle=`rgba(0,0,30,${nightAlpha*0.7})`;
          ctx.fillRect(0,0,renderer.W,renderer.H);
        }
      }
      animFrame=requestAnimationFrame(enhancedLoop);
    }

    animFrame=requestAnimationFrame(enhancedLoop);

    // Enhanced mouse events - sounds on break/place
    const canvas=el('gameCanvas');
    canvas.addEventListener('mousedown', e => {
      if(e.button===2){
        const eye=player.getEyePos();
        const dir=player.getLookDir();
        const ray=world.raycast(eye.x,eye.y,eye.z,dir.dx,dir.dy,dir.dz);
        const sel=player.hotbar[player.selectedSlot];
        if(ray.hit&&sel){
          SoundEngine.play('place');
          Particles.spawn(ray.nx||ray.x, ray.ny||ray.y, ray.nz||ray.z,'dust');
        }
      }
      if(e.button===0 && MobSystem.hitMob(player,world)){
        SoundEngine.play('damage');
      }
    });

    // Sound on block break
    const origBreak=player.handleBreaking.bind(player);
    player.handleBreaking=(dt,ray)=>{
      const wasProgress=player.breakProgress;
      const result=origBreak(dt,ray);
      if(result){
        const b=world.getBlock(ray.x,ray.y,ray.z);
        if(b===BLOCKS.STONE||b===BLOCKS.COBBLESTONE||b===BLOCKS.IRON_ORE||b===BLOCKS.GOLD_ORE||b===BLOCKS.DIAMOND_ORE||b===BLOCKS.COAL_ORE||b===BLOCKS.BEDROCK) SoundEngine.play('break_stone');
        else if(b===BLOCKS.DIRT||b===BLOCKS.GRASS||b===BLOCKS.GRAVEL||b===BLOCKS.SAND) SoundEngine.play('break_dirt');
        else if(b===BLOCKS.LOG||b===BLOCKS.PLANKS||b===BLOCKS.WOOD) SoundEngine.play('break_wood');
        else SoundEngine.play('break_grass');
        Particles.spawn(ray.x+0.5,ray.y+0.5,ray.z+0.5,'break');
        SoundEngine.play('xp'); player.xp=Math.min(100,player.xp+2);
      }
      return result;
    };

    // Water splash
    let wasInWater=false;
    setInterval(()=>{
      if(player.inWater&&!wasInWater) SoundEngine.play('splash');
      wasInWater=player.inWater;
    },100);

    // Hotbar sounds
    document.addEventListener('keydown',e=>{
      if(e.code.startsWith('Digit')||e.code==='ScrollUp'||e.code==='ScrollDown'){
        SoundEngine.play('pop');
      }
    });
  };
})();
