const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const navToggle = qs('.nav-toggle');
const navLinks = qs('[data-nav-links]');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  qsa('.nav-links a').forEach(link => link.addEventListener('click', () => {
    navLinks.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }));
}

const year = qs('#year');
if (year) year.textContent = new Date().getFullYear();

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });
qsa('.reveal').forEach(el => revealObserver.observe(el));

function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawGrid(ctx, w, h, t) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#02070d';
  ctx.fillRect(0, 0, w, h);
  const grid = 34;
  ctx.strokeStyle = 'rgba(130, 219, 255, 0.10)';
  ctx.lineWidth = 1;
  const offset = (t * 0.018) % grid;
  for (let x = -grid + offset; x < w + grid; x += grid) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = -grid + offset; y < h + grid; y += grid) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.restore();
}

function drawRover(ctx, x, y, angle, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.shadowBlur = 22;
  ctx.shadowColor = 'rgba(32,220,255,.55)';
  ctx.fillStyle = 'rgba(32,220,255,.08)';
  ctx.strokeStyle = 'rgba(32,220,255,.95)';
  ctx.lineWidth = 2;
  roundedRect(ctx, -30, -20, 60, 40, 10);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff9f1c';
  ctx.fillRect(22, -5, 15, 10);
  ctx.fillStyle = 'rgba(232,247,255,.82)';
  ctx.fillRect(-16, -14, 16, 7);
  ctx.fillRect(-16, 7, 16, 7);
  ctx.fillStyle = 'rgba(60,255,143,.9)';
  ctx.beginPath(); ctx.arc(4, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawSensorRays(ctx, x, y, heading, radius, count, spread, color) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const pct = count === 1 ? 0.5 : i / (count - 1);
    const a = heading - spread / 2 + spread * pct;
    const len = radius * (0.74 + 0.22 * Math.sin(performance.now() * 0.0018 + i));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDetection(ctx, x, y, w, h, label, confidence, color = '#ff9f1c') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.strokeRect(x, y, w, h);
  ctx.font = '12px Consolas, monospace';
  const text = `${label} ${confidence}%`;
  const tw = ctx.measureText(text).width + 14;
  ctx.fillRect(x, y - 22, tw, 20);
  ctx.fillStyle = '#06131f';
  ctx.fillText(text, x + 7, y - 8);
  ctx.restore();
}

function drawPath(ctx, points, color = 'rgba(60,255,143,.86)') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 9]);
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.stroke();
  ctx.setLineDash([]);
  points.forEach((p, i) => {
    ctx.fillStyle = i === points.length - 1 ? '#ff9f1c' : '#3cff8f';
    ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

function drawLLMOverlay(ctx, w, h, t) {
  ctx.save();
  const panelW = Math.min(310, w * .42);
  const x = w - panelW - 18;
  const y = 18;
  ctx.fillStyle = 'rgba(6, 19, 31, .84)';
  ctx.strokeStyle = 'rgba(155,140,255,.48)';
  ctx.lineWidth = 1;
  roundedRect(ctx, x, y, panelW, 142, 18);
  ctx.fill(); ctx.stroke();
  ctx.font = '12px Consolas, monospace';
  ctx.fillStyle = '#9b8cff';
  ctx.fillText('LLM DECISION SUPPORT', x + 16, y + 28);
  ctx.fillStyle = '#c0d9e8';
  const lines = [
    'State: obstacle ahead',
    'Action: slow + replan',
    'Reason: preserve safety margin',
    `Confidence: ${Math.round(82 + Math.sin(t * .002) * 8)}%`
  ];
  lines.forEach((line, i) => ctx.fillText(line, x + 16, y + 55 + i * 20));
  ctx.restore();
}

function drawHero() {
  const canvas = qs('#heroCanvas');
  if (!canvas) return;
  let env = fitCanvas(canvas);
  window.addEventListener('resize', () => env = fitCanvas(canvas));

  function frame(t) {
    const { ctx, width: w, height: h } = env;
    drawGrid(ctx, w, h, t);
    const cx = w * .5 + Math.cos(t * .00045) * w * .18;
    const cy = h * .55 + Math.sin(t * .00065) * h * .12;
    const heading = Math.sin(t * .0007) * .38;

    drawPath(ctx, [
      { x: w * .14, y: h * .78 },
      { x: w * .32, y: h * .63 },
      { x: w * .52, y: h * .57 },
      { x: w * .75, y: h * .35 },
      { x: w * .88, y: h * .24 }
    ]);
    drawSensorRays(ctx, cx, cy, heading, Math.min(w, h) * .35, 18, Math.PI * .86, 'rgba(32,220,255,.18)');
    drawDetection(ctx, w * .18, h * .25, 72, 58, 'cone', 91, '#ff9f1c');
    drawDetection(ctx, w * .70, h * .48, 86, 68, 'marker', 88, '#3cff8f');
    drawRover(ctx, cx, cy, heading, 1.12);
    drawMiniNodes(ctx, w, h, t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function drawMiniNodes(ctx, w, h, t) {
  const nodes = [
    { x: w * .18, y: h * .84, label: 'camera' },
    { x: w * .38, y: h * .82, label: 'vision' },
    { x: w * .58, y: h * .82, label: 'ekf' },
    { x: w * .78, y: h * .82, label: 'nav2' },
  ];
  ctx.save();
  ctx.font = '11px Consolas, monospace';
  nodes.forEach((n, i) => {
    if (i > 0) {
      ctx.strokeStyle = 'rgba(130,219,255,.28)';
      ctx.beginPath(); ctx.moveTo(nodes[i - 1].x, nodes[i - 1].y); ctx.lineTo(n.x, n.y); ctx.stroke();
    }
    ctx.fillStyle = i === Math.floor((t * .002) % nodes.length) ? '#ff9f1c' : '#20dcff';
    ctx.beginPath(); ctx.arc(n.x, n.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8eabc0';
    ctx.fillText(n.label, n.x - 20, n.y + 24);
  });
  ctx.restore();
}

drawHero();

const simState = { mode: 'normal', log: [] };
function addLog(message) {
  simState.log.unshift(`> ${message}`);
  simState.log = simState.log.slice(0, 5);
  const log = qs('#consoleLog');
  if (log) log.innerHTML = simState.log.map(item => `<p>${item}</p>`).join('');
}

qsa('[data-sim-mode]').forEach(button => {
  button.addEventListener('click', () => {
    simState.mode = button.dataset.simMode;
    const consoleText = qs('#consoleText');
    if (simState.mode === 'normal') {
      consoleText.textContent = 'Rover is scanning, choosing a safe route, and reporting high-level reasoning.';
      addLog('normal route restored');
    }
    if (simState.mode === 'obstacle') {
      consoleText.textContent = 'Obstacle event injected. Watch the route bend around the blocked zone.';
      addLog('obstacle detected; replanning path');
    }
    if (simState.mode === 'llm') {
      consoleText.textContent = 'LLM layer is visible. It summarizes state and recommends safe high-level action.';
      addLog('LLM support layer enabled');
    }
  });
});
addLog('system initialized');

function drawSim() {
  const canvas = qs('#simCanvas');
  if (!canvas) return;
  let env = fitCanvas(canvas);
  window.addEventListener('resize', () => env = fitCanvas(canvas));

  function frame(t) {
    const { ctx, width: w, height: h } = env;
    drawGrid(ctx, w, h, t);

    const obstacleMode = simState.mode === 'obstacle' || simState.mode === 'llm';
    const route = obstacleMode
      ? [
          { x: w * .10, y: h * .77 }, { x: w * .23, y: h * .64 }, { x: w * .42, y: h * .65 },
          { x: w * .52, y: h * .42 }, { x: w * .72, y: h * .36 }, { x: w * .90, y: h * .18 }
        ]
      : [
          { x: w * .10, y: h * .77 }, { x: w * .28, y: h * .63 }, { x: w * .48, y: h * .52 },
          { x: w * .68, y: h * .34 }, { x: w * .90, y: h * .18 }
        ];

    drawPath(ctx, route, obstacleMode ? 'rgba(255,159,28,.9)' : 'rgba(60,255,143,.86)');

    const progress = (t * .00008) % 1;
    const pIndex = Math.min(route.length - 2, Math.floor(progress * (route.length - 1)));
    const local = (progress * (route.length - 1)) % 1;
    const p1 = route[pIndex], p2 = route[pIndex + 1];
    const x = p1.x + (p2.x - p1.x) * local;
    const y = p1.y + (p2.y - p1.y) * local;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    drawSensorRays(ctx, x, y, angle, Math.min(w, h) * .30, 26, Math.PI * .92, 'rgba(32,220,255,.16)');

    const detections = [
      { x: w * .16, y: h * .25, bw: 80, bh: 58, label: 'person-zone', c: 94, color: '#20dcff' },
      { x: w * .77, y: h * .55, bw: 75, bh: 70, label: 'tag', c: 89, color: '#3cff8f' },
    ];
    if (obstacleMode) detections.push({ x: w * .46, y: h * .46, bw: 112, bh: 82, label: 'blocked', c: 96, color: '#ff5d73' });
    detections.forEach(d => drawDetection(ctx, d.x, d.y, d.bw, d.bh, d.label, d.c, d.color));

    drawRover(ctx, x, y, angle, 1.22);
    drawLegend(ctx, w, h, obstacleMode);
    if (simState.mode === 'llm') drawLLMOverlay(ctx, w, h, t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function drawLegend(ctx, w, h, obstacleMode) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,19,31,.82)';
  ctx.strokeStyle = 'rgba(130,219,255,.24)';
  roundedRect(ctx, 18, 18, 230, 112, 18);
  ctx.fill(); ctx.stroke();
  ctx.font = '12px Consolas, monospace';
  ctx.fillStyle = '#20dcff'; ctx.fillText('PERCEPTION: active', 34, 47);
  ctx.fillStyle = obstacleMode ? '#ff9f1c' : '#3cff8f'; ctx.fillText(`PLANNER: ${obstacleMode ? 're-route' : 'nominal'}`, 34, 72);
  ctx.fillStyle = '#c0d9e8'; ctx.fillText('SAFETY: watchdog online', 34, 97);
  ctx.restore();
}

drawSim();
