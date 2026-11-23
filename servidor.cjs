// Servidor local para conferir o quiz antes de subir.
//   node servidor.cjs   ->  http://localhost:4240
// Imita a Vercel: /api/e recebe os eventos e grava em _eventos-local.ndjson (para conferir o painel).
const http = require('http'), fs = require('fs'), path = require('path');
const TIPOS = { '.html':'text/html; charset=utf-8', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg',
  '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.mp4':'video/mp4' };
const PORTA = +process.env.PORTA || 4240;
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/api/e' && req.method === 'POST') {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      fs.appendFileSync(path.join(__dirname, '_eventos-local.ndjson'), b.trim() + '\n');
      res.writeHead(204); res.end();
    }); return;
  }
  if (p === '/') p = '/index.html';
  const arq = path.join(__dirname, p);
  if (!arq.startsWith(__dirname) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end('nao encontrado: ' + p); }
  const tipo = TIPOS[path.extname(arq)] || 'application/octet-stream', tam = fs.statSync(arq).size;
  // vídeo precisa de Range para tocar no Safari/Chrome
  const r = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (r) {
    const ini = r[1] ? +r[1] : 0, fim = r[2] ? +r[2] : tam - 1;
    res.writeHead(206, { 'Content-Type': tipo, 'Content-Range': `bytes ${ini}-${fim}/${tam}`, 'Accept-Ranges': 'bytes', 'Content-Length': fim - ini + 1 });
    return fs.createReadStream(arq, { start: ini, end: fim }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': tipo, 'Content-Length': tam, 'Accept-Ranges': 'bytes' });
  fs.createReadStream(arq).pipe(res);
}).listen(PORTA, () => console.log('http://localhost:' + PORTA));
