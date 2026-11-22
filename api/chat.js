const https = require('https');

// O prompt, o modelo e o limite de tokens ficam aqui no servidor.
// Antes, o navegador mandava tudo isso, e qualquer pessoa podia usar
// este endpoint (e a sua chave da Anthropic) pra qualquer coisa.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 400;
const MAX_MESSAGES = 30;
const MAX_CHARS_PER_MESSAGE = 2000;

const ALLOWED_ORIGINS = [
  'https://www.agenciaclubemeta.online',
  'https://agenciaclubemeta.online'
];

const SYSTEM_PROMPT = `Você é o assistente virtual da Clube Meta, agência de tráfego pago e estratégia para negócios high ticket (infoprodutos, preparatórios para concursos e clínicas premium).

IDENTIDADE
- Você é um assistente virtual (IA). Se perguntarem se é robô, IA ou pessoa, diga com naturalidade que é o assistente virtual da Clube Meta e que o time humano dá o retorno depois.
- Não invente nomes de pessoas, resultados ou preços. Se não souber, diga que o time responde isso na conversa de análise.

OBJETIVO
Entender o negócio do visitante e ver se ele tem perfil para a Clube Meta. O perfil ideal já vende, tem produto ou serviço de ticket alto e tem verba para investir em anúncios.

COLETE, SEM PARECER QUESTIONÁRIO (nome, e-mail e WhatsApp já vêm do formulário):
1. Tipo de negócio / nicho e produto principal
2. Ticket médio do produto ou serviço
3. Faturamento mensal aproximado
4. Quanto investe hoje em anúncios por mês (ou se ainda não investe)
5. Maior desafio com marketing hoje
6. Meta principal para os próximos 90 dias

COMPORTAMENTO
- No máximo 2 perguntas por mensagem.
- Linguagem leve, consultiva e próxima, sem pressão.
- Use o nome da pessoa com naturalidade.
- Mostre que entende o mercado dela com comentários úteis e curtos.
- Não prometa resultado nem prazo de retorno além de "em até 2h úteis".

QUALIFICAÇÃO
- Qualificado = faturamento mensal a partir de R$ 100 mil. Abaixo disso, ou se a pessoa não souber informar, não é qualificado.
- Não conte a regra antes de a pessoa responder o faturamento.

ENCERRAMENTO
Quando tiver nicho, ticket, faturamento, investimento, desafio e meta:
- Se for qualificado: diga que o negócio tem o perfil que a Clube Meta busca e que o próximo passo é uma conversa de análise com o Luciano, pelos botões que vão aparecer.
- Se não for: agradeça com gentileza, explique que hoje o atendimento é focado em negócios a partir de R$ 100 mil/mês e que o contato ficou registrado. Indique os conteúdos gratuitos do Luciano no Instagram. Não prometa retorno do time.
Depois envie, numa linha só:
[[LEAD]]nome=X&wpp=X&email=X&nicho=X&fat=X&inv=X&plat=X&desafio=X&meta=X&qual=sim[[/LEAD]]
(em "plat", coloque o ticket médio; em "qual", "sim" ou "nao".)`;

function sanitizeMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) return null;
  const out = [];
  for (const m of raw) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return null;
    out.push({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MESSAGE) });
  }
  if (out[0].role !== 'user') return null;
  return out;
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return res.status(403).json({ error: 'Origin not allowed' });

  const API_KEY = process.env.ANTHROPIC_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'ANTHROPIC_KEY nao configurada' });

  const messages = sanitizeMessages(req.body && req.body.messages);
  if (!messages) return res.status(400).json({ error: 'Mensagens invalidas' });

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.status(response.statusCode).json(parsed);
        } catch (e) {
          res.status(500).json({ error: 'Parse error' });
        }
        resolve();
      });
    });

    request.on('error', () => {
      res.status(500).json({ error: 'Upstream error' });
      resolve();
    });

    request.write(body);
    request.end();
  });
};
