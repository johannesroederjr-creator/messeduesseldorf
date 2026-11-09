/* Minimaler Echtzeit-Server ohne Abhängigkeiten: statische Dateien + Live-Abstimmung (Server-Sent Events).
   Start: node server.js   (PORT, ADMIN_KEY optional) */
const http = require('http');
const fs = require('fs');
const path = require('path');
const POLLS = require('./polls.js');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const STATE_FILE = path.join(__dirname, 'state.json');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.mp4': 'video/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

let state = { active: POLLS[0].id, counts: {}, voters: {} };
try { state = Object.assign(state, JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))); } catch (e) {}
POLLS.forEach(p => {
  if (!state.counts[p.id] || state.counts[p.id].length !== p.options.length) state.counts[p.id] = p.options.map(() => 0);
  state.voters[p.id] = state.voters[p.id] || [];
});
const pub = () => ({ active: state.active, counts: state.counts });
let dirty = false;
setInterval(() => { if (dirty) { dirty = false; fs.writeFile(STATE_FILE, JSON.stringify(state), () => {}); } }, 3000);

const clients = new Set();
const broadcast = () => { const d = 'data: ' + JSON.stringify(pub()) + '\n\n'; clients.forEach(c => c.write(d)); };
setInterval(() => clients.forEach(c => c.write(': ping\n\n')), 20000);

const body = req => new Promise(r => { let b = ''; req.on('data', c => { b += c; if (b.length > 1e4) req.destroy(); }); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch (e) { r({}); } }); });
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const isAdmin = (q, b) => !ADMIN_KEY || (q.get('key') || b.key) === ADMIN_KEY;

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/state') return json(res, 200, pub());
  if (u.pathname === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('data: ' + JSON.stringify(pub()) + '\n\n');
    clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  if (req.method === 'POST' && u.pathname === '/api/vote') {
    const b = await body(req); const p = POLLS.find(x => x.id === b.poll);
    if (!p || !Number.isInteger(b.opt) || b.opt < 0 || b.opt >= p.options.length || typeof b.cid !== 'string') return json(res, 400, { error: 'bad' });
    const v = state.voters[p.id]; const cid = b.cid.slice(0, 64);
    if (v.includes(cid)) return json(res, 409, { error: 'already' });
    v.push(cid); state.counts[p.id][b.opt]++; dirty = true; broadcast(); return json(res, 200, pub());
  }
  if (req.method === 'POST' && u.pathname === '/api/active') {
    const b = await body(req); if (!isAdmin(u.searchParams, b)) return json(res, 403, {});
    if (POLLS.some(p => p.id === b.poll)) { state.active = b.poll; dirty = true; broadcast(); }
    return json(res, 200, pub());
  }
  if (req.method === 'POST' && u.pathname === '/api/reset') {
    const b = await body(req); if (!isAdmin(u.searchParams, b)) return json(res, 403, {});
    POLLS.forEach(p => { state.counts[p.id] = p.options.map(() => 0); state.voters[p.id] = []; }); dirty = true; broadcast(); return json(res, 200, pub());
  }
  let f = decodeURIComponent(u.pathname); if (f === '/') f = '/index.html';
  const fp = path.join(__dirname, path.normalize(f));
  if (!fp.startsWith(__dirname) || /server\.js|state\.json|package/.test(path.basename(fp))) { res.writeHead(404); return res.end('Not found'); }
  fs.stat(fp, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    const type = MIME[path.extname(fp)] || 'application/octet-stream';
    const h = { 'Content-Type': type, 'Cache-Control': type.startsWith('text/') ? 'no-cache' : 'public, max-age=86400' };
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (range && type === 'video/mp4') {
      const s = range[1] ? +range[1] : 0, en = range[2] ? +range[2] : st.size - 1;
      res.writeHead(206, Object.assign(h, { 'Content-Range': `bytes ${s}-${en}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': en - s + 1 }));
      return fs.createReadStream(fp, { start: s, end: en }).pipe(res);
    }
    res.writeHead(200, Object.assign(h, { 'Content-Length': st.size, 'Accept-Ranges': 'bytes' }));
    fs.createReadStream(fp).pipe(res);
  });
}).listen(PORT, () => console.log('Messe-Pitch läuft auf http://localhost:' + PORT));
