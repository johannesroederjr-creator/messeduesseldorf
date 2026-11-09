(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  const el = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };

  const scenes = $$('.scene');
  const cams = scenes.map(s => s.dataset.cam.split(',').map(Number)); // x,y,scale,tilt,rot
  let idx = 0, step = 0, busy = false;

  /* ---------- Hallenplan zeichnen ---------- */
  const map = $('#map');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let x = 0; x <= 3600; x += 120) el('line', { x1: x, y1: 0, x2: x, y2: 2000, class: 'gridl' }, map);
  for (let y = 0; y <= 2000; y += 120) el('line', { x1: 0, y1: y, x2: 3600, y2: y, class: 'gridl' }, map);
  let hallNo = 1;
  for (let cy = 0; cy < 6; cy++) for (let cx = 0; cx < 10; cx++) {
    const w = 200 + rnd() * 120, h = 150 + rnd() * 100, x = cx * 360 + 40 + rnd() * 30, y = cy * 330 + 40 + rnd() * 30;
    const g = el('g', {}, map);
    el('rect', { x: x, y: y + 22, width: w, height: h, rx: 14, class: 'hall-side' }, g);
    el('rect', { x: x, y: y, width: w, height: h, rx: 14, class: 'hall-top' }, g);
    if (hallNo <= 17) { const t = el('text', { x: x + w / 2, y: y + h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'hall-t' }, g); t.textContent = 'HALLE ' + hallNo++; }
  }
  const pts = cams.map(c => [c[0], c[1]]);
  const segs = [];
  const pathFor = (a, b) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1]; return `M${a[0]},${a[1]} Q${mx - dy * .18},${my + dx * .18} ${b[0]},${b[1]}`; };
  for (let i = 0; i < pts.length - 1; i++) {
    const d = pathFor(pts[i], pts[i + 1]);
    el('path', { d, class: 'route-bg' }, map);
    const p = el('path', { d, class: 'route' }, map); const L = p.getTotalLength();
    p.style.strokeDasharray = L; p.style.strokeDashoffset = L; segs.push([p, L]);
  }
  const pins = pts.map((p, i) => {
    const g = el('g', { class: 'pin' + (scenes[i].dataset.poll ? ' poll' : ''), transform: `translate(${p[0]},${p[1]})` }, map);
    el('circle', { r: 34, class: 'halo' }, g); el('circle', { r: 34, class: 'r' }, g);
    el('text', {}, g).textContent = i === 0 ? '★' : i;
    return g;
  });

  /* ---------- Kamera ---------- */
  function camera(i) {
    const [x, y, s, tilt, rot] = cams[i], W = innerWidth, H = innerHeight, narrow = W < 900 ? .62 : 1, sc = s * narrow * Math.min(1, W / 1500 + .35);
    $('#world').style.transform = `translate(${W * .5 - x * sc}px,${H * .52 - y * sc}px) scale(${sc})`;
    $('#tilt').style.transform = `rotateX(${tilt}deg) rotateZ(${rot}deg)`;
    segs.forEach(([p, L], k) => p.style.strokeDashoffset = k < i ? 0 : L);
    pins.forEach((p, k) => p.classList.toggle('on', k === i));
  }

  /* ---------- Szenen & Schritte ---------- */
  const maxStep = s => Math.max(0, ...$$('[data-s]', s).map(e => +e.dataset.s));
  function applyStep(s) {
    $$('[data-s]', s).forEach(e => e.classList.toggle('on', +e.dataset.s <= step));
    $$('.track i[data-w]', s).forEach(b => { const v = b.closest('[data-s]'); b.style.width = (!v || v.classList.contains('on')) ? b.dataset.w + '%' : '0'; });
  }
  function counters(s) {
    $$('[data-count]', s).forEach(n => {
      const to = +n.dataset.count, t0 = performance.now(), dur = 1600;
      const f = t => { const k = Math.min(1, (t - t0) / dur); n.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); };
      n.textContent = 0; setTimeout(() => requestAnimationFrame(f), 1000);
    });
  }
  function go(i, fromEnd) {
    if (i < 0 || i >= scenes.length) return;
    $$('video').forEach(v => v.pause());
    idx = i; const s = scenes[i];
    scenes.forEach((x, k) => x.classList.toggle('active', k === i));
    step = fromEnd ? maxStep(s) : 0; applyStep(s);
    camera(i); counters(s);
    $$('#dots button').forEach((b, k) => b.classList.toggle('on', k === i));
    $('#progress i').style.width = (i / (scenes.length - 1) * 100) + '%';
    const pid = s.dataset.poll;
    $('#qrcard').hidden = !pid;
    if (pid) { Store.setActive(pid); renderPoll(s); drawQR(); }
    history.replaceState(null, '', '#' + (i + 1));
  }
  const next = () => { const s = scenes[idx]; if (step < maxStep(s)) { step++; applyStep(s); } else go(idx + 1); };
  const prev = () => { if (step > 0) { step--; applyStep(scenes[idx]); } else go(idx - 1, true); };

  /* ---------- Abstimmung ---------- */
  function renderPoll(s) {
    const p = POLLS.find(x => x.id === s.dataset.poll), c = Store.state.counts[p.id] || p.options.map(() => 0);
    const tot = c.reduce((a, b) => a + b, 0), top = Math.max.apply(null, c);
    const box = $('.pollbox', s);
    if (!box.firstChild) box.innerHTML = '<h2></h2><div class="opts"></div><p class="pollmeta"></p>';
    $('h2', box).textContent = p.q;
    const o = $('.opts', box);
    if (o.children.length !== p.options.length) o.innerHTML = p.options.map(() => '<div class="opt"><i></i><span class="t"></span><span class="v"></span></div>').join('');
    $$('.opt', o).forEach((d, i) => {
      $('.t', d).textContent = p.options[i];
      $('.v', d).textContent = tot ? Math.round(c[i] / tot * 100) + ' % · ' + c[i] : '0';
      $('i', d).style.width = (tot ? c[i] / tot * 100 : 0) + '%';
      d.classList.toggle('lead', tot > 0 && c[i] === top);
    });
    $('.pollmeta', box).textContent = tot + (tot === 1 ? ' Stimme' : ' Stimmen') + ' · Jetzt per QR-Code mitmachen';
  }
  Store.on((st, mode) => {
    const m = $('#mode'); m.textContent = mode === 'live' ? 'Live' : mode === 'demo' ? 'Demo' : '…';
    m.classList.toggle('live', mode === 'live');
    m.title = mode === 'demo' ? 'Demo-Modus: Stimmen nur im selben Browser. Mit "node server.js" echt live.' : 'Verbunden';
    const s = scenes[idx]; if (s && s.dataset.poll) renderPoll(s);
  });
  let qrDone = '';
  function drawQR() {
    const qs = new URLSearchParams(location.search).get('vote');
    const url = qs || (window.CFG && CFG.voteUrl) || new URL('vote.html', location.href).href;
    $('#qrurl').textContent = url.replace(/^https?:\/\//, '');
    if (qrDone === url) return; qrDone = url;
    try { const q = qrcode(0, 'M'); q.addData(url); q.make(); $('#qr').innerHTML = q.createSvgTag({ scalable: true, margin: 0 }); }
    catch (e) { $('#qr').textContent = 'QR nicht verfügbar'; }
  }

  /* ---------- Navigation ---------- */
  $('#dots').innerHTML = scenes.map((s, i) => `<button class="${s.dataset.poll ? 'poll' : ''}" aria-label="${s.dataset.title}" title="${s.dataset.title}"></button>`).join('');
  $$('#dots button').forEach((b, i) => b.onclick = () => go(i));
  $('#next').onclick = next; $('#prev').onclick = prev;
  const ov = $('#overview');
  ov.innerHTML = scenes.map((s, i) => `<button data-i="${i}"><small>${String(i + 1).padStart(2, '0')}</small>${s.dataset.title}</button>`).join('');
  ov.onclick = e => { const b = e.target.closest('button'); if (b) { go(+b.dataset.i); ov.hidden = true; } else ov.hidden = true; };
  $('#btnOverview').onclick = () => ov.hidden = !ov.hidden;
  const fs = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  $('#btnFs').onclick = fs;
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !/VIDEO|BUTTON/.test(e.target.tagName))) { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0); else if (k === 'End') go(scenes.length - 1);
    else if (k === 'f' || k === 'F') fs();
    else if (k === 'o' || k === 'O') ov.hidden = !ov.hidden;
    else if (k === 'Escape') ov.hidden = true;
    else if (k === 'v' || k === 'V') { const p = scenes[idx].dataset.poll; if (p) Store.simulate(p); }
    else if (k === 'r' || k === 'R') { if (confirm('Alle Abstimmungen zurücksetzen?')) Store.reset(); }
  });
  document.addEventListener('click', e => {
    if (e.target.closest('a,button,video,input,.nav,#overview,.qrcard,.hud')) return;
    next();
  });
  let tx = 0, ty = 0;
  addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) dx < 0 ? next() : prev(); }, { passive: true });
  addEventListener('resize', () => camera(idx));

  const start = parseInt(location.hash.slice(1), 10);
  $('#world').style.transition = 'none'; $('#tilt').style.transition = 'none';
  go(start > 0 && start <= scenes.length ? start - 1 : 0);
  requestAnimationFrame(() => requestAnimationFrame(() => { $('#world').style.transition = ''; $('#tilt').style.transition = ''; }));
  window.__deck = { go, next, prev };
})();
