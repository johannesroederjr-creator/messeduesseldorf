/* Abstimmungs-Speicher: Live per Server (SSE) oder Demo-Modus (localStorage + BroadcastChannel) */
(function () {
  const POLLS = window.POLLS, subs = [];
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; };
  const cid = LS('mp_cid') || (function () { const c = Math.random().toString(36).slice(2) + Date.now().toString(36); LS('mp_cid', c); return c; })();
  const empty = () => { const s = { active: POLLS[0].id, counts: {} }; POLLS.forEach(p => s.counts[p.id] = p.options.map(() => 0)); return s; };
  const Store = { mode: 'connecting', state: empty(), cid };
  const emit = () => subs.forEach(f => f(Store.state, Store.mode));
  Store.on = f => { subs.push(f); f(Store.state, Store.mode); };
  Store.hasVoted = id => LS('mp_voted_' + id) === '1';
  const markVoted = id => LS('mp_voted_' + id, '1');

  /* ---- Demo-Modus ---- */
  let bc = null;
  const saveDemo = () => { LS('mp_state', JSON.stringify(Store.state)); if (bc) bc.postMessage('s'); };
  function startDemo() {
    if (Store.mode === 'demo') return; Store.mode = 'demo';
    try { Store.state = Object.assign(empty(), JSON.parse(LS('mp_state') || '{}')); } catch (e) {}
    try { bc = new BroadcastChannel('mp'); bc.onmessage = () => { try { Store.state = JSON.parse(LS('mp_state')); emit(); } catch (e) {} }; } catch (e) {}
    window.addEventListener('storage', e => { if (e.key === 'mp_state') { try { Store.state = JSON.parse(e.newValue); emit(); } catch (x) {} } });
    emit();
  }

  /* ---- Live-Modus ---- */
  function startLive() {
    let opened = false;
    const es = new EventSource('/api/stream');
    es.onmessage = e => { opened = true; Store.mode = 'live'; Store.state = JSON.parse(e.data); emit(); };
    es.onerror = () => { if (!opened) { es.close(); startDemo(); } else { Store.mode = 'reconnecting'; emit(); } };
    setTimeout(() => { if (!opened) { es.close(); startDemo(); } }, 2500);
  }

  const post = (url, o) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
  Store.vote = async (poll, opt) => {
    if (Store.hasVoted(poll)) return 'already';
    if (Store.mode === 'demo') { Store.state.counts[poll][opt]++; markVoted(poll); saveDemo(); emit(); return 'ok'; }
    const r = await post('/api/vote', { poll, opt, cid });
    if (r.ok || r.status === 409) { markVoted(poll); return r.ok ? 'ok' : 'already'; }
    return 'error';
  };
  Store.setActive = id => { if (Store.mode === 'demo') { Store.state.active = id; saveDemo(); emit(); } else post('/api/active', { poll: id, key: (window.CFG || {}).adminKey || '' }); };
  Store.reset = () => {
    POLLS.forEach(p => LS('mp_voted_' + p.id, '0'));
    if (Store.mode === 'demo') { Store.state = empty(); saveDemo(); emit(); } else post('/api/reset', { key: (window.CFG || {}).adminKey || '' });
  };
  Store.simulate = id => { /* nur Demo: Beispielstimmen für Proben */
    if (Store.mode !== 'demo') return;
    const n = POLLS.find(p => p.id === id).options.length;
    for (let i = 0; i < 18; i++) Store.state.counts[id][Math.floor(Math.pow(Math.random(), 1.6) * n)]++;
    saveDemo(); emit();
  };

  if (location.protocol === 'file:') startDemo(); else startLive();
  window.Store = Store;
})();
