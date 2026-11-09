(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const scenes = $$('.scene'), frame = $('#frame'), N = scenes.length;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let idx = -1, step = 0, lock = false;
  const pad = n => String(n).padStart(2, '0');

  const maxStep = s => Math.max(0, ...$$('[data-s]', s).map(e => +e.dataset.s));
  function applyStep(s) {
    $$('[data-s]', s).forEach(e => e.classList.toggle('on', +e.dataset.s <= step));
    $$('.duo i[data-w]', s).forEach(b => { const v = b.closest('[data-s]'); b.style.width = (!v || v.classList.contains('on')) ? b.dataset.w + '%' : '0'; });
  }
  function counters(s) {
    $$('[data-count]', s).forEach(n => {
      const to = +n.dataset.count, t0 = performance.now() + 500, dur = 1500;
      const f = t => { const k = Math.max(0, Math.min(1, (t - t0) / dur)); n.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); };
      n.textContent = 0; requestAnimationFrame(f);
    });
  }
  function swap(i, fromEnd) {
    $$('video').forEach(v => v.pause());
    idx = i; const s = scenes[i];
    scenes.forEach((x, k) => x.classList.toggle('active', k === i));
    frame.dataset.theme = s.dataset.theme;
    step = fromEnd ? maxStep(s) : 0; applyStep(s); counters(s);
    $('#chapter').textContent = s.dataset.title.replace(/&amp;/g, '&');
    $('#count').textContent = pad(i + 1) + ' / ' + pad(N);
    $$('#segs button').forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('done', k < i); });
    history.replaceState(null, '', '#' + (i + 1));
  }
  function go(i, fromEnd) {
    if (i < 0 || i >= N || i === idx || lock) return;
    if (idx < 0 || reduce) return swap(i, fromEnd);
    lock = true; const w = $('#wipe'); w.classList.remove('go'); void w.offsetWidth; w.classList.add('go');
    setTimeout(() => swap(i, fromEnd), 420);
    setTimeout(() => { w.classList.remove('go'); lock = false; }, 860);
  }
  const next = () => { const s = scenes[idx]; if (step < maxStep(s)) { step++; applyStep(s); } else go(idx + 1); };
  const prev = () => { if (step > 0) { step--; applyStep(scenes[idx]); } else go(idx - 1, true); };

  /* Navigation */
  $('#segs').innerHTML = scenes.map((s, i) => `<button aria-label="${pad(i + 1)} ${s.dataset.title}" title="${s.dataset.title}"></button>`).join('');
  $$('#segs button').forEach((b, i) => b.onclick = () => go(i));
  $('#next').onclick = next; $('#prev').onclick = prev;
  const ov = $('#overview');
  ov.innerHTML = scenes.map((s, i) => `<button data-i="${i}"><small>${pad(i + 1)}</small>${s.dataset.title}</button>`).join('');
  ov.onclick = e => { const b = e.target.closest('button'); if (b) go(+b.dataset.i); ov.hidden = true; };
  $('#btnOverview').onclick = () => ov.hidden = !ov.hidden;
  const fs = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  $('#btnFs').onclick = fs;
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key, t = e.target.tagName;
    if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !/VIDEO|BUTTON/.test(t))) { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0); else if (k === 'End') go(N - 1);
    else if (k === 'f' || k === 'F') fs();
    else if (k === 'o' || k === 'O') ov.hidden = !ov.hidden;
    else if (k === 'Escape') ov.hidden = true;
  });
  document.addEventListener('click', e => {
    if (e.target.closest('a,button,video,input,footer,header,#overview,.picker')) return;
    next();
  });
  let tx = 0, ty = 0;
  addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) dx < 0 ? next() : prev(); }, { passive: true });

  /* Video-Auswahl */
  const vid = $('#vid');
  $$('.picker button').forEach(b => b.onclick = () => {
    $$('.picker button').forEach(x => x.classList.toggle('on', x === b));
    vid.poster = b.dataset.poster; vid.src = b.dataset.src; vid.play().catch(() => {});
  });

  const start = parseInt(location.hash.slice(1), 10);
  swap(start > 0 && start <= N ? start - 1 : 0);
  window.__deck = { go, next, prev };
})();
