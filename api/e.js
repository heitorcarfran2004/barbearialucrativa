// Recebe os eventos do quiz (cada tela vista, cada resposta, clique no checkout) e grava no Supabase.
// O navegador manda para /api/e (mesmo domínio do quiz), então bloqueador de anúncio não corta.
// Variáveis na Vercel: SUPABASE_URL e SUPABASE_SERVICE_KEY (chave service_role, nunca vai para o navegador).
// Tabela: sql/quiz_eventos.sql
const CAMPOS = ['quiz', 'variante', 'sid', 'tipo', 'etapa', 'resposta', 'dispositivo', 'url',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
  let corpo = req.body;
  try {
    if (typeof corpo === 'string') corpo = JSON.parse(corpo);
    if (Buffer.isBuffer(corpo)) corpo = JSON.parse(corpo.toString('utf8'));
    if (!corpo || typeof corpo !== 'object') {
      const pedacos = []; for await (const p of req) pedacos.push(p);
      corpo = JSON.parse(Buffer.concat(pedacos).toString('utf8') || '{}');
    }
  } catch (e) { res.statusCode = 400; return res.end(); }

  const linha = {};
  for (const k of CAMPOS) if (corpo[k] != null) linha[k] = String(corpo[k]).slice(0, 300);
  if (!linha.sid || !linha.tipo || !linha.quiz) { res.statusCode = 400; return res.end(); }
  linha.ordem = Number.isFinite(+corpo.ordem) ? Math.round(+corpo.ordem) : null;
  linha.ms = Number.isFinite(+corpo.ms) ? Math.min(2147483647, Math.max(0, Math.round(+corpo.ms))) : null;
  linha.pais = req.headers['x-vercel-ip-country'] || null;

  const url = process.env.SUPABASE_URL, chave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !chave) { res.statusCode = 204; return res.end(); } // sem configuração: aceita e descarta
  try {
    await fetch(url.replace(/\/$/, '') + '/rest/v1/quiz_eventos', {
      method: 'POST',
      headers: { apikey: chave, Authorization: 'Bearer ' + chave, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(linha),
    });
  } catch (e) { /* evento perdido não pode travar o quiz */ }
  res.statusCode = 204; res.end();
};
