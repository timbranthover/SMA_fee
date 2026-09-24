(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const world = document.createElement('canvas'); world.width=W; world.height=H;
  const wctx = world.getContext('2d');
  const bg = new Image();
  const brief = document.getElementById('brief');
  const result = document.getElementById('result');
  const resultCard = document.getElementById('resultCard');
  const hud = document.getElementById('hud');
  const startBtn = document.getElementById('startBtn');
  const fireBtn = document.getElementById('fireBtn');
  const zoomBtn = document.getElementById('zoomBtn');
  const zoomHud = document.getElementById('zoomHud');
  const timerHud = document.getElementById('timerHud');
  const objectiveHud = document.getElementById('objectiveHud');
  const statusLine = document.getElementById('statusLine');

  let state='brief', starting=false, bgReady=false, zoom=1, recoil=0, startedAt=0, elapsed=0;
  let aim={x:W*.5,y:H*.54}; let statusTimer=0; let audio=null;
  let targets=[], decoys=[];

  const targetDefs = [
    {id:'ridge', x:699,y:568,s:1.14,ampX:13,ampY:0,speed:.00042,phase:.7, watching:'path'},
    {id:'path',  x:568,y:536,s:.93, ampX:15,ampY:1,speed:.00048,phase:2.0, watching:'barn'},
    {id:'barn',  x:521,y:457,s:.76, ampX:3, ampY:0,speed:.00028,phase:4.1, watching:'rink'},
    {id:'rink',  x:394,y:457,s:.71, ampX:22,ampY:6,speed:.00064,phase:1.1, watching:null, skate:true}
  ];
  const decoyDefs = [
    {x:177,y:474,s:.70,ampX:16,speed:.00055,coat:'#772e28',hat:false,scarf:false},
    {x:277,y:455,s:.60,ampX:18,speed:.00050,coat:'#3b3c35',hat:true,scarf:false},
    {x:330,y:482,s:.68,ampX:11,speed:.00062,coat:'#882f26',hat:false,scarf:false},
    {x:435,y:481,s:.65,ampX:12,speed:.00048,coat:'#363a37',hat:false,scarf:true},
    {x:617,y:551,s:.92,ampX:7,speed:.00040,coat:'#7b342c',hat:false,scarf:false},
    {x:746,y:535,s:1.02,ampX:6,speed:.00036,coat:'#2c302d',hat:true,scarf:false},
    {x:815,y:591,s:1.17,ampX:5,speed:.00038,coat:'#8b342b',hat:false,scarf:false},
    {x:252,y:601,s:1.02,ampX:8,speed:.00043,coat:'#343632',hat:false,scarf:false},
    {x:115,y:531,s:.78,ampX:10,speed:.00035,coat:'#604337',hat:false,scarf:false},
    {x:676,y:474,s:.72,ampX:10,speed:.00052,coat:'#343834',hat:false,scarf:false}
  ];

  function resetPeople(){
    targets=targetDefs.map((d,i)=>({...d,dead:false,fall:0,phase:d.phase+i*.37}));
    decoys=decoyDefs.map((d,i)=>({...d,phase:i*.91+1.2,dead:false}));
  }
  resetPeople();

  function fallbackBg(){
    const g=wctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#87928b'); g.addColorStop(.47,'#dce0d7'); g.addColorStop(1,'#eef0e8');
    wctx.fillStyle=g; wctx.fillRect(0,0,W,H);
    wctx.fillStyle='rgba(60,68,63,.25)';
    for(let i=0;i<30;i++){ const x=(i*83)%W,y=350+(i*47)%210; wctx.fillRect(x,y,2,120); }
  }

  async function loadBg(){
    const urls=Array.from({length:9},(_,i)=>`/assets/whiteout/bg${i}.txt`);
    const parts=await Promise.all(urls.map(async u=>{const r=await fetch(u,{cache:'force-cache'}); if(!r.ok) throw new Error(`background ${r.status}`); return (await r.text()).trim();}));
    await new Promise((resolve,reject)=>{ bg.onload=resolve; bg.onerror=reject; bg.src='data:image/jpeg;base64,'+parts.join(''); });
    bgReady=true; startBtn.textContent='BEGIN MISSION';
  }
  const bgPromise=loadBg().catch(err=>{console.warn('Whiteout background fallback',err); bgReady=false; startBtn.textContent='BEGIN MISSION';});

  function pos(p,t){
    const sway=Math.sin(t*p.speed+p.phase);
    const glide=p.skate?Math.sin(t*p.speed*.74+p.phase*.7):0;
    return {x:p.x+sway*(p.ampX||0), y:p.y+glide*(p.ampY||0)};
  }

  function drawFigure(c,p,t,isTarget=false){
    if(p.dead && p.fall>=1) return;
    const q=pos(p,t), s=p.s||1, fall=p.dead?Math.min(1,p.fall):0;
    c.save(); c.translate(q.x,q.y); if(fall){ c.rotate(-fall*1.28); c.translate(0,fall*6); }
    c.lineCap='round'; c.lineJoin='round';
    const coat=isTarget?'#242622':(p.coat||'#474a44');
    const skin='#b6a28c';
    c.strokeStyle=coat; c.lineWidth=Math.max(1.2,2.1*s);
    c.beginPath(); c.moveTo(0,-19*s); c.lineTo(0,-6*s); c.moveTo(0,-15*s); c.lineTo(-6*s,-8*s); c.moveTo(0,-15*s); c.lineTo(6*s,-9*s); c.moveTo(0,-6*s); c.lineTo(-5*s,5*s); c.moveTo(0,-6*s); c.lineTo(5*s,5*s); c.stroke();
    c.fillStyle=skin; c.beginPath(); c.arc(0,-24*s,3.4*s,0,Math.PI*2); c.fill();
    if(isTarget||p.hat){ c.fillStyle='#1b1c1a'; c.fillRect(-4.5*s,-28.5*s,9*s,2.1*s); c.fillRect(-3.4*s,-31*s,6.8*s,3.4*s); }
    if(isTarget||p.scarf){ c.strokeStyle=isTarget?'#7f2f28':'#8b332b'; c.lineWidth=Math.max(1.2,1.8*s); c.beginPath(); c.moveTo(-2.7*s,-20.4*s); c.lineTo(3*s,-20.2*s); c.lineTo(5*s,-14*s); c.stroke(); }
    c.restore();
  }

  function renderWorld(t){
    if(bgReady){wctx.drawImage(bg,0,0,W,H);} else fallbackBg();
    wctx.fillStyle='rgba(212,220,211,.035)'; wctx.fillRect(0,0,W,H);
    const all=[...decoys.map(p=>({p,target:false})),...targets.map(p=>({p,target:true}))];
    all.sort((a,b)=>pos(a.p,t).y-pos(b.p,t).y);
    for(const x of all) drawFigure(wctx,x.p,t,x.target);
  }

  function drawScope(t){
    ctx.drawImage(world,0,0);
    if(state!=='playing') return;
    const r=zoom>1?94:82;
    ctx.save();
    ctx.fillStyle='rgba(4,6,5,.42)'; ctx.fillRect(0,0,W,H);
    ctx.beginPath();ctx.arc(aim.x,aim.y,r,0,Math.PI*2);ctx.clip();
    if(zoom>1){
      const sw=r*2/zoom, sh=r*2/zoom;
      const sx=Math.max(0,Math.min(W-sw,aim.x-sw/2)), sy=Math.max(0,Math.min(H-sh,aim.y-sh/2));
      ctx.drawImage(world,sx,sy,sw,sh,aim.x-r,aim.y-r,r*2,r*2);
    } else ctx.drawImage(world,aim.x-r,aim.y-r,r*2,r*2,aim.x-r,aim.y-r,r*2,r*2);
    ctx.restore();
    ctx.save(); ctx.strokeStyle='rgba(16,19,16,.93)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(aim.x,aim.y,r,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(aim.x-r,aim.y);ctx.lineTo(aim.x-9,aim.y);ctx.moveTo(aim.x+9,aim.y);ctx.lineTo(aim.x+r,aim.y);ctx.moveTo(aim.x,aim.y-r);ctx.lineTo(aim.x,aim.y-9);ctx.moveTo(aim.x,aim.y+9);ctx.lineTo(aim.x,aim.y+r);ctx.stroke();
    ctx.fillStyle='#151814';ctx.beginPath();ctx.arc(aim.x,aim.y,2.1,0,Math.PI*2);ctx.fill();
    if(recoil>0){ctx.strokeStyle=`rgba(255,245,225,${recoil*.45})`;ctx.lineWidth=4;ctx.beginPath();ctx.arc(aim.x,aim.y,r+recoil*8,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }

  function setAimFromEvent(e){
    const r=canvas.getBoundingClientRect();
    const cx=(e.clientX-r.left)*W/r.width, cy=(e.clientY-r.top)*H/r.height;
    aim.x=Math.max(0,Math.min(W,cx)); aim.y=Math.max(0,Math.min(H,cy));
  }
  canvas.addEventListener('pointermove',e=>{if(state==='playing')setAimFromEvent(e)});
  canvas.addEventListener('pointerdown',e=>{
    if(state!=='playing')return; setAimFromEvent(e);
    if(e.pointerType==='mouse' && e.button===0) fire();
  });

  function hitTest(t){
    let best=null;
    const people=[...targets.map(p=>({p,target:true})),...decoys.map(p=>({p,target:false}))];
    for(const item of people){
      const p=item.p;if(p.dead)continue;const q=pos(p,t),s=p.s||1;
      const hx=q.x,hy=q.y-24*s, headR=5.6*s;
      const dh=Math.hypot(aim.x-hx,aim.y-hy);
      if(dh<=headR && (!best||dh<best.d)) best={...item,zone:'head',d:dh};
      const bodyD=Math.hypot((aim.x-q.x)/.75,(aim.y-(q.y-8*s))/.9);
      if(bodyD<=13*s && (!best||bodyD<best.d)) best={...item,zone:'body',d:bodyD};
    }
    return best;
  }

  function audioShot(){
    try{
      audio=audio||new (window.AudioContext||window.webkitAudioContext)();
      if(audio.state==='suspended')audio.resume(); const now=audio.currentTime;
      const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sawtooth';osc.frequency.setValueAtTime(95,now);osc.frequency.exponentialRampToValueAtTime(38,now+.12);gain.gain.setValueAtTime(.12,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.18);osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+.2);
      const buf=audio.createBuffer(1,Math.floor(audio.sampleRate*.08),audio.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const src=audio.createBufferSource(),g=audio.createGain();src.buffer=buf;g.gain.value=.18;src.connect(g).connect(audio.destination);src.start();
    }catch{}
    if(navigator.vibrate) navigator.vibrate(28);
  }

  function showStatus(text,ms=1200){clearTimeout(statusTimer);statusLine.textContent=text;statusLine.classList.add('show');statusTimer=setTimeout(()=>statusLine.classList.remove('show'),ms)}
  function witnessFor(id){return targets.find(p=>!p.dead&&p.watching===id)}

  function fire(){
    if(state!=='playing'||recoil>.1)return; audioShot(); recoil=1;
    const t=performance.now(),hit=hitTest(t);
    if(!hit){ return fail('SHOT MISSED','The report carries over the snow. The exchange scatters.'); }
    if(!hit.target){ return fail('CIVILIAN HIT','Wrong silhouette. Mission terminated.'); }
    if(hit.zone!=='head'){ return fail('BODY SHOT','The courier is still able to raise the alarm. Headshots only.'); }
    const watched=witnessFor(hit.p.id);
    hit.p.dead=true; hit.p.fall=.01;
    showStatus('CONFIRMED — STAY HIDDEN',800);
    const left=targets.filter(p=>!p.dead).length; objectiveHud.textContent=`TARGETS ${left} / 4`;
    if(watched){ setTimeout(()=>fail('WITNESS','A courier saw the body fall. The sequence was wrong.'),380); return; }
    if(left===0) setTimeout(complete,650);
  }

  function fail(title,why){if(state!=='playing')return;state='fail';elapsed=performance.now()-startedAt;setTimeout(()=>showResult(false,title,why),260)}
  function complete(){if(state!=='playing')return;state='complete';elapsed=performance.now()-startedAt;showResult(true,'MISSION COMPLETE','Four clean removals. No alarm. The ledger never leaves the village.')}
  function showResult(ok,title,why){
    hud.classList.add('hidden'); result.classList.remove('hidden');
    const kills=targets.filter(p=>p.dead).length;
    resultCard.innerHTML=`<div class="kicker">FIELD REPORT // 01</div><div class="result-title ${ok?'':'fail'}">${title}</div><p>${why}</p><div class="stats"><div>CONFIRMED<strong>${kills}/4</strong></div><div>TIME<strong>${formatTime(elapsed)}</strong></div></div><button id="againBtn">${ok?'RUN AGAIN':'RETRY MISSION'}</button><div class="muted">Safe sequence hint: the chain of eyes begins highest and furthest right.</div>`;
    document.getElementById('againBtn').addEventListener('click',startGame);
  }
  function formatTime(ms){const s=Math.max(0,ms/1000),m=Math.floor(s/60),sec=(s%60).toFixed(1).padStart(4,'0');return `${String(m).padStart(2,'0')}:${sec}`}
  function toggleZoom(){if(state!=='playing')return;zoom=zoom>1?1:2.2;zoomHud.textContent=zoom.toFixed(1)+'×';showStatus(zoom>1?'SCOPE 2.2×':'SCOPE 1.0×',500)}

  function startGame(){
    resetPeople(); state='playing'; zoom=1; recoil=0; aim={x:W*.5,y:H*.54}; startedAt=performance.now(); elapsed=0;
    brief.classList.add('hidden'); result.classList.add('hidden'); hud.classList.remove('hidden');
    objectiveHud.textContent='TARGETS 4 / 4'; zoomHud.textContent='1.0×'; showStatus(bgReady?'WIND: LIGHT // RANGE: 180M':'FIELD IMAGE LOADING…',900);
  }
  async function handleStart(e){
    if(e){e.preventDefault();e.stopPropagation();}
    if(starting||state==='playing')return; starting=true; startBtn.textContent='ENTERING FIELD…';
    await Promise.race([bgPromise,new Promise(r=>setTimeout(r,450))]); startGame(); starting=false;
  }
  ['click','pointerup','touchend'].forEach(type=>startBtn.addEventListener(type,handleStart,{passive:false}));
  fireBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();fire()},{passive:false});
  zoomBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();toggleZoom()},{passive:false});
  document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();toggleZoom()}if(e.key.toLowerCase()==='r')startGame()});

  function loop(t){
    for(const p of targets) if(p.dead&&p.fall<1)p.fall=Math.min(1,p.fall+.045);
    recoil=Math.max(0,recoil-.09); renderWorld(t); drawScope(t);
    if(state==='playing'){elapsed=t-startedAt;timerHud.textContent=formatTime(elapsed)}
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
