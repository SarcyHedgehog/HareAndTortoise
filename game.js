(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const clockEl = document.getElementById('clock');
  const bestEl = document.getElementById('best');
  const objectiveEl = document.getElementById('objective');
  const messageEl = document.getElementById('message');
  const launchButton = document.getElementById('launch');
  const limits = { platform: 4, ramp: 2, spring: 2 };

  let mode = 'hare';
  let activeTool = 'select';
  let selectedId = null;
  let running = false;
  let ball = null;
  let lastFrame = performance.now();
  let carrots = [];
  let hedgehog = null;
  let celebration = [];
  let audio;
  const FIXED_STEP = 1 / 120;
  let simulationAccumulator = 0;

  const starter = [
    { id: 1, type: 'platform', x: 405, y: 365, angle: 0, hits: 0 },
    { id: 2, type: 'platform', x: 700, y: 525, angle: 0, hits: 0 },
    { id: 3, type: 'ramp', x: 620, y: 510, angle: -0.25, hits: 0 },
    { id: 4, type: 'spring', x: 945, y: 535, angle: 0, hits: 0 }
  ];
  const courses = { hare: clone(starter), tortoise: clone(starter) };
  const best = { hare: null, tortoise: null };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function pieces() { return courses[mode]; }
  function nextId() { return Math.max(0, ...pieces().map(p => p.id)) + 1; }

  function resetCollectibles() {
    carrots = [
      { x: 405, y: 310, got: false },
      { x: 635, y: 365, got: false },
      { x: 820, y: 360, got: false }
    ];
    hedgehog = { x: 570, y: 225, got: false };
  }

  function setMessage(title, body, hold = 2200) {
    messageEl.innerHTML = `<strong>${title}</strong><span>${body}</span>`;
    messageEl.classList.remove('hidden');
    clearTimeout(setMessage.timer);
    if (hold) setMessage.timer = setTimeout(() => messageEl.classList.add('hidden'), hold);
  }

  function sound(kind) {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const now = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.connect(gain).connect(audio.destination);
      const settings = {
        launch: [180, 460, .18, 'sawtooth'],
        bounce: [260, 150, .08, 'triangle'],
        spring: [180, 720, .16, 'square'],
        collect: [520, 880, .12, 'sine'],
        win: [420, 940, .5, 'triangle'],
        fail: [170, 70, .4, 'sawtooth']
      }[kind] || [220, 180, .1, 'sine'];
      osc.type = settings[3];
      osc.frequency.setValueAtTime(settings[0], now);
      osc.frequency.exponentialRampToValueAtTime(settings[1], now + settings[2]);
      gain.gain.setValueAtTime(.07, now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + settings[2]);
      osc.start(now); osc.stop(now + settings[2]);
    } catch (_) {}
  }

  function toWorld(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height
    };
  }

  function pieceLength(piece) { return piece.type === 'platform' ? 155 : piece.type === 'ramp' ? 130 : 105; }
  function segment(piece) {
    const half = pieceLength(piece) / 2;
    const dx = Math.cos(piece.angle) * half;
    const dy = Math.sin(piece.angle) * half;
    return { ax: piece.x - dx, ay: piece.y - dy, bx: piece.x + dx, by: piece.y + dy };
  }

  function nearestPiece(point) {
    let winner = null, distance = 34;
    for (const piece of pieces()) {
      const d = Math.hypot(point.x - piece.x, point.y - piece.y);
      if (d < distance) { winner = piece; distance = d; }
    }
    return winner;
  }

  function remaining(type) { return limits[type] - pieces().filter(p => p.type === type).length; }
  function updateTools() {
    for (const type of Object.keys(limits)) document.getElementById(`count-${type}`).textContent = remaining(type);
    const total = Object.keys(limits).reduce((n, type) => n + remaining(type), 0);
    document.getElementById('remaining').textContent = `${total} pieces available`;
    document.querySelectorAll('.tool').forEach(el => el.classList.toggle('selected', el.dataset.tool === activeTool));
  }

  let dragging = false;
  canvas.addEventListener('pointerdown', event => {
    if (running) return;
    const point = toWorld(event);
    const found = nearestPiece(point);
    if (activeTool === 'select') {
      selectedId = found?.id ?? null;
      dragging = Boolean(found);
    } else if (remaining(activeTool) > 0 && point.x > 115 && point.x < 995 && point.y > 95 && point.y < 540) {
      const angle = activeTool === 'ramp' ? -.35 : 0;
      const piece = { id: nextId(), type: activeTool, x: point.x, y: point.y, angle, hits: 0 };
      pieces().push(piece);
      selectedId = piece.id;
      activeTool = 'select';
      dragging = true;
      updateTools();
      sound('bounce');
    }
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging || running) return;
    const piece = pieces().find(p => p.id === selectedId);
    if (!piece) return;
    const point = toWorld(event);
    piece.x = Math.max(125, Math.min(985, point.x));
    piece.y = Math.max(110, Math.min(535, point.y));
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });

  document.querySelectorAll('.tool').forEach(button => button.addEventListener('click', () => {
    activeTool = button.dataset.tool;
    selectedId = null;
    updateTools();
  }));
  document.getElementById('rotate').addEventListener('click', () => {
    if (running) return;
    const piece = pieces().find(p => p.id === selectedId);
    if (piece) { piece.angle += Math.PI / 4; sound('bounce'); }
  });
  document.getElementById('delete').addEventListener('click', () => {
    if (running || selectedId == null) return;
    const index = pieces().findIndex(p => p.id === selectedId);
    if (index >= 0) pieces().splice(index, 1);
    selectedId = null; updateTools();
  });
  document.getElementById('reset').addEventListener('click', () => {
    courses[mode] = clone(starter); selectedId = null; running = false; ball = null;
    simulationAccumulator = 0;
    resetCollectibles(); updateTools(); launchButton.disabled = false; clockEl.textContent = '0.00s';
    setMessage('Course restored', 'The training layout is ready again.');
  });

  document.querySelectorAll('.mode').forEach(button => button.addEventListener('click', () => {
    if (running) return;
    mode = button.dataset.mode;
    document.querySelectorAll('.mode').forEach(b => b.classList.toggle('active', b === button));
    objectiveEl.textContent = mode === 'hare' ? 'FASTEST SUCCESSFUL RUN' : 'LONGEST VALID JOURNEY';
    activeTool = 'select'; selectedId = null; resetCollectibles(); updateTools(); updateBest();
    setMessage(mode === 'hare' ? 'The Hare' : 'The Tortoise', mode === 'hare' ? 'Build the quickest reliable course.' : 'Reach the goal, but take your time.');
  }));

  launchButton.addEventListener('click', () => {
    if (running) return;
    resetCollectibles();
    pieces().forEach(p => { p.hits = 0; p.tired = false; });
    selectedId = null;
    ball = { x: 92, y: 270, vx: 290, vy: -52, radius: 18, trail: [], age: 0 };
    running = true; simulationAccumulator = 0; launchButton.disabled = true;
    messageEl.classList.add('hidden'); sound('launch');
  });

  function collidePiece(piece) {
    if (piece.tired) return;
    const s = segment(piece);
    const vx = s.bx - s.ax, vy = s.by - s.ay;
    const len2 = vx * vx + vy * vy;
    const rawT = ((ball.x - s.ax) * vx + (ball.y - s.ay) * vy) / len2;
    const t = Math.max(0, Math.min(1, rawT));
    const px = s.ax + t * vx, py = s.ay + t * vy;
    const dx = ball.x - px, dy = ball.y - py;
    const distance = Math.hypot(dx, dy);
    const thickness = 7;
    if (distance > ball.radius + thickness) return;

    // Each construction piece is a solid capsule: both long faces and the
    // rounded ends collide. If the centre lands exactly on the segment, use
    // the face opposing its travel to choose a stable escape direction.
    let nx, ny;
    if (distance > .001) {
      nx = dx / distance;
      ny = dy / distance;
    } else {
      const faceX = Math.sin(piece.angle), faceY = -Math.cos(piece.angle);
      const facing = ball.vx * faceX + ball.vy * faceY;
      nx = facing > 0 ? -faceX : faceX;
      ny = facing > 0 ? -faceY : faceY;
    }
    const approach = ball.vx * nx + ball.vy * ny;
    if (approach >= 0) return;
    const boost = piece.type === 'spring' ? 1.42 : piece.type === 'ramp' ? .94 : .82;
    ball.x += nx * (ball.radius + thickness - distance);
    ball.y += ny * (ball.radius + thickness - distance);
    ball.vx = (ball.vx - 2 * approach * nx) * boost;
    ball.vy = (ball.vy - 2 * approach * ny) * boost;
    if (piece.type === 'spring') {
      ball.vx += nx * 120;
      ball.vy += ny * 120;
    }
    piece.hits++;
    sound(piece.type === 'spring' ? 'spring' : 'bounce');
    if (piece.hits >= 8) {
      piece.tired = true;
      setMessage('A tired piece gave way', 'Long loops need a more durable route.');
    }
  }

  function finish(success) {
    if (!running) return;
    running = false; launchButton.disabled = false;
    const time = ball.age;
    if (success) {
      const collected = carrots.filter(c => c.got).length;
      const scoreTime = mode === 'tortoise' ? Math.min(25, time) : time;
      const isBest = best[mode] == null || (mode === 'hare' ? scoreTime < best[mode] : scoreTime > best[mode]);
      if (isBest) best[mode] = scoreTime;
      const stars = mode === 'hare' ? (time < 5 ? 3 : time < 8 ? 2 : 1) : (time > 12 ? 3 : time > 8 ? 2 : 1);
      setMessage(`${'★'.repeat(stars)}${'☆'.repeat(3-stars)} Goal reached in ${time.toFixed(2)}s`, `${collected}/3 carrots${hedgehog.got ? ' · Golden Hedgehog found!' : ''}`, 4200);
      celebration = Array.from({ length: 50 }, (_, index) => {
        const spread = ((index * 37) % 101) / 100 - .5;
        const lift = ((index * 53) % 97) / 96;
        return {
          x: 1010,
          y: 430,
          vx: spread * 300,
          vy: -lift * 240,
          life: 1.5,
          color: index % 2 ? '#f3ca52' : mode === 'hare' ? '#ec8c3c' : '#8eb44a'
        };
      });
      sound('win'); updateBest();
    } else {
      setMessage('Not quite a journey', ball.age >= 25 ? 'The sphere got sleepy. Try a less endless route.' : 'The sphere touched the meadow. Adjust and try again.', 3500);
      sound('fail');
    }
  }

  function updateBest() { bestEl.textContent = best[mode] == null ? 'Best —' : `Best ${best[mode].toFixed(2)}s`; }

  function update(dt) {
    if (running && ball) {
      ball.age += dt;
      clockEl.textContent = `${ball.age.toFixed(2)}s`;
      const steps = 3;
      for (let i = 0; i < steps; i++) {
        const step = dt / steps;
        ball.vy += 255 * step;
        ball.vx *= Math.pow(.998, step * 60);
        ball.x += ball.vx * step; ball.y += ball.vy * step;
        for (const piece of [...pieces()]) collidePiece(piece);
        if (ball.x < ball.radius) { ball.x = ball.radius; ball.vx = Math.abs(ball.vx) * .82; }
        if (ball.x > canvas.width - ball.radius) { ball.x = canvas.width - ball.radius; ball.vx = -Math.abs(ball.vx) * .82; }
        const roof = 24;
        if (ball.y < roof + ball.radius) {
          ball.y = roof + ball.radius;
          ball.vy = Math.abs(ball.vy) * .84;
          sound('bounce');
        }
      }
      ball.trail.push({ x: ball.x, y: ball.y, life: 1 });
      if (ball.trail.length > 45) ball.trail.shift();
      ball.trail.forEach(p => p.life -= dt * 1.7);
      for (const carrot of carrots) if (!carrot.got && Math.hypot(ball.x-carrot.x, ball.y-carrot.y) < 34) { carrot.got = true; sound('collect'); }
      if (!hedgehog.got && Math.hypot(ball.x-hedgehog.x, ball.y-hedgehog.y) < 34) { hedgehog.got = true; sound('collect'); }
      if (Math.hypot(ball.x - 1023, ball.y - 494) < 46) finish(true);
      else if (ball.y > 590 || ball.age >= 25 || (Math.hypot(ball.vx, ball.vy) < 8 && ball.age > 2)) finish(false);
    }
    celebration.forEach(p => { p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 240*dt; p.life -= dt; });
    celebration = celebration.filter(p => p.life > 0);
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, 560);
    sky.addColorStop(0, '#a8d9dd'); sky.addColorStop(.68, '#d9ebc7'); sky.addColorStop(1, '#8fc071');
    ctx.fillStyle = sky; ctx.fillRect(0,0,1100,620);
    ctx.fillStyle = 'rgba(255,249,225,.7)';
    for (const cloud of [[150,100,1],[520,74,.75],[880,135,1.15]]) {
      ctx.beginPath();
      ctx.arc(cloud[0],cloud[1],30*cloud[2],0,Math.PI*2); ctx.arc(cloud[0]+35*cloud[2],cloud[1]-12,42*cloud[2],0,Math.PI*2); ctx.arc(cloud[0]+78*cloud[2],cloud[1],28*cloud[2],0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#76aa64';
    ctx.beginPath(); ctx.moveTo(0,470); ctx.quadraticCurveTo(180,360,350,470); ctx.quadraticCurveTo(540,340,720,470); ctx.quadraticCurveTo(920,345,1100,455); ctx.lineTo(1100,620); ctx.lineTo(0,620); ctx.fill();
    ctx.fillStyle = '#426f4d'; ctx.fillRect(0,560,1100,60);
    ctx.fillStyle = '#5b8e55';
    for (let x=0; x<1100; x+=22) { ctx.beginPath(); ctx.moveTo(x,560); ctx.lineTo(x+8,548-(x%3)*3); ctx.lineTo(x+12,560); ctx.fill(); }
    ctx.strokeStyle = 'rgba(27,69,62,.12)'; ctx.lineWidth = 1;
    for (let x=25; x<1100; x+=50) { ctx.beginPath(); ctx.moveTo(x,80); ctx.lineTo(x,540); ctx.stroke(); }
    for (let y=90; y<540; y+=50) { ctx.beginPath(); ctx.moveTo(20,y); ctx.lineTo(1080,y); ctx.stroke(); }

    // A visible frame makes the playfield boundaries unambiguous. The top
    // rail is also a physical surface, so ambitious spheres stay in play.
    const roofGradient = ctx.createLinearGradient(0, 8, 0, 35);
    roofGradient.addColorStop(0, '#173f3b');
    roofGradient.addColorStop(.55, '#315f55');
    roofGradient.addColorStop(1, '#153a36');
    ctx.fillStyle = roofGradient;
    ctx.fillRect(0, 8, 1100, 27);
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.fillRect(0, 9, 1100, 3);
    ctx.fillStyle = '#f3ca52';
    for (let x = 34; x < 1100; x += 86) {
      ctx.beginPath(); ctx.arc(x, 21, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawLauncher() {
    ctx.save(); ctx.translate(76,303);
    ctx.fillStyle = '#713e27'; roundedRect(-28,-18,55,72,12);
    ctx.fillStyle = '#f3ca52'; roundedRect(-18,-8,35,50,8);
    ctx.strokeStyle = '#513121'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(18,-50); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#173b3a'; ctx.font = '700 12px system-ui'; ctx.fillText('DROP-OFF', 43, 382);
  }

  function drawGoal() {
    ctx.strokeStyle = '#173b3a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(1023,494,34,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#f4e6c1'; ctx.beginPath(); ctx.arc(1023,494,25,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#173b3a'; ctx.font = '800 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('GOAL',1023,498); ctx.textAlign='left';
  }

  function drawPiece(piece) {
    const s = segment(piece);
    ctx.save();
    if (piece.tired) ctx.globalAlpha = .25;
    ctx.lineCap = 'round';
    ctx.strokeStyle = piece.id === selectedId ? '#fff7d0' : piece.type === 'spring' ? '#e4a03c' : '#244f48';
    ctx.lineWidth = piece.type === 'spring' ? 20 : 15;
    ctx.shadowColor = 'rgba(16,48,41,.28)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 5;
    if (piece.type === 'spring') {
      const angle = piece.angle, len = pieceLength(piece), count = 8;
      ctx.beginPath();
      for (let i=0;i<=count;i++) {
        const t=i/count-.5; const along=t*len; const across=(i%2?1:-1)*9;
        const x=piece.x+Math.cos(angle)*along-Math.sin(angle)*across;
        const y=piece.y+Math.sin(angle)*along+Math.cos(angle)*across;
        i?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }
      ctx.stroke();
    } else { ctx.beginPath(); ctx.moveTo(s.ax,s.ay); ctx.lineTo(s.bx,s.by); ctx.stroke(); }
    ctx.shadowColor='transparent';
    ctx.strokeStyle = piece.type === 'spring' ? '#f9d772' : '#7ca08d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.ax,s.ay); ctx.lineTo(s.bx,s.by); ctx.stroke();
    if (piece.hits > 4) { ctx.fillStyle='#b64d37'; ctx.beginPath(); ctx.arc(piece.x,piece.y,5+piece.hits,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
  }

  function drawCollectibles() {
    ctx.font = '27px serif'; ctx.textAlign = 'center';
    for (const item of carrots) if (!item.got) ctx.fillText('🥕', item.x, item.y);
    if (!hedgehog.got) { ctx.font='29px serif'; ctx.fillText('🦔', hedgehog.x, hedgehog.y); ctx.strokeStyle='rgba(243,202,82,.55)'; ctx.beginPath(); ctx.arc(hedgehog.x,hedgehog.y-9,24,0,Math.PI*2); ctx.stroke(); }
    ctx.textAlign='left';
  }

  function drawBall() {
    if (!ball) return;
    for (const p of ball.trail) { ctx.fillStyle = `rgba(255,248,215,${Math.max(0,p.life)*.22})`; ctx.beginPath(); ctx.arc(p.x,p.y,7,0,Math.PI*2); ctx.fill(); }
    ctx.save(); ctx.translate(ball.x,ball.y);
    ctx.fillStyle='#fff4d4'; ctx.shadowColor='rgba(20,54,48,.35)'; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(0,0,ball.radius,0,Math.PI*2); ctx.fill();
    ctx.shadowColor='transparent'; ctx.strokeStyle=mode==='hare'?'#d96f2f':'#6f923d'; ctx.lineWidth=5; ctx.stroke();
    ctx.font='21px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(mode==='hare'?'🐇':'🐢',0,1); ctx.restore();
  }

  function draw() {
    drawBackground(); drawLauncher(); drawGoal(); drawCollectibles(); pieces().forEach(drawPiece); drawBall();
    for (const p of celebration) { ctx.globalAlpha=Math.max(0,p.life/1.5); ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,7,7); } ctx.globalAlpha=1;
  }

  function frame(now) {
    const elapsed = Math.min(.1, (now - lastFrame) / 1000);
    lastFrame = now;
    simulationAccumulator += elapsed;
    while (simulationAccumulator >= FIXED_STEP) {
      update(FIXED_STEP);
      simulationAccumulator -= FIXED_STEP;
    }
    draw();
    requestAnimationFrame(frame);
  }

  resetCollectibles(); updateTools(); updateBest(); requestAnimationFrame(frame);
})();
