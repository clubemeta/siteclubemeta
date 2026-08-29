// ══════════════════════════════════════════
// Clube Meta — Proxy seguro para Claude API
// 
// COMO USAR:
// 1. Cole sua chave na linha abaixo onde está SUA_CHAVE_AQUI
// 2. Suba este arquivo no GitHub dentro da pasta /api/
// 3. O Vercel transforma automaticamente em função serverless
// ══════════════════════════════════════════

module.exports = async function handler(req, res) {

  // ✅ COLE SUA NOVA CHAVE AQUI:
  const API_KEY = 'SUA_CHAVE_AQUI';

  // Permite chamadas do seu domínio
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!API_KEY || API_KEY === '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') {
    return res.status(500).json({ error: 'Chave da API não configurada' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Erro no proxy', detail: err.message });
  }
};
