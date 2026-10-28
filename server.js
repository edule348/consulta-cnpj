
const http = require("node:http");

const PORT = process.env.PORT || 10000;
const API_KEY = process.env.SINTEGRA_API_KEY;
const SITE_URL = "https://consulta-cnpj-uxn4.onrender.com";

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;

  if (origin === SITE_URL) {
    res.setHeader("Access-Control-Allow-Origin", SITE_URL);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "online" }));
  }

  if (req.method !== "GET" || url.pathname !== "/api/ie") {
    res.writeHead(404);
    return res.end(JSON.stringify({ erro: "Rota não encontrada." }));
  }

  const cnpj = (url.searchParams.get("cnpj") || "").replace(/\D/g, "");

  if (!/^\d{14}$/.test(cnpj)) {
    res.writeHead(400);
    return res.end(JSON.stringify({ erro: "CNPJ inválido." }));
  }

  if (!API_KEY) {
    res.writeHead(503);
    return res.end(JSON.stringify({ erro: "API não configurada." }));
  }

  try {
    const resposta = await fetch(
      `https://www.sintegrabrasil.com.br/api/v1/cnpj/${cnpj}`,
      {
        headers: { "X-Api-Key": API_KEY },
        signal: AbortSignal.timeout(15000)
      }
    );

    if (!resposta.ok) {
      const status = [400, 404, 429].includes(resposta.status)
        ? resposta.status
        : 502;

      res.writeHead(status);
      return res.end(JSON.stringify({
        erro: status === 429
          ? "Limite de consultas atingido. Tente mais tarde."
          : "Não foi possível consultar a Inscrição Estadual."
      }));
    }

    const dados = await resposta.json();

    const inscricoes = Array.isArray(dados.inscricoes_estaduais)
      ? dados.inscricoes_estaduais.map(ie => ({
          inscricao_estadual: ie.inscricao_estadual,
          uf: ie.uf,
          ativo: ie.ativo,
          atualizado_em: ie.atualizado_em
        }))
      : [];

    res.writeHead(200);
    res.end(JSON.stringify({
      cnpj,
      inscricoes_estaduais: inscricoes
    }));

  } catch (erro) {
    console.error("Falha na consulta estadual:", erro.message);
    res.writeHead(502);
    res.end(JSON.stringify({
      erro: "Serviço estadual temporariamente indisponível."
    }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
