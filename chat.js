// ══════════════════════════════════════════════
// Clube Meta — Proxy seguro para a API do Claude
// A chave NUNCA aparece no HTML nem no GitHub.
// 
// Como configurar:
//   1. No Vercel → Settings → Environment Variables
//   2. Adicione: ANTHROPIC_KEY = sk-ant-api03-...
//   3. Redeploy — pronto!
// ══════════════════════════════════════════════

export default async function handler(req, res) {
  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Chave vem da variável de ambiente do Vercel — nunca do código
  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
