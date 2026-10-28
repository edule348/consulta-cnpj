
const campo = document.getElementById("cnpj");
const pesquisar = document.getElementById("pesquisar");
const limpar = document.getElementById("limpar");
const mensagem = document.getElementById("mensagem");
const resultado = document.getElementById("resultado");
const secundarios = document.getElementById("secundarios");

const pesquisarIE = document.getElementById("pesquisar-ie");
const mensagemIE = document.getElementById("mensagem-ie");
const resultadoIE = document.getElementById("resultado-ie");
const listaIE = document.getElementById("lista-ie");

const API_IE = "https://consulta-cnpj-api-hbov.onrender.com/api/ie";

let controladorCNPJ = null;
let controladorIE = null;
let cnpjConsultado = "";

function somenteDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function formatarCNPJ(valor) {
  const n = somenteDigitos(valor).slice(0, 14);

  return n
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function validarCNPJ(valor) {
  const n = somenteDigitos(valor);

  if (!/^\d{14}$/.test(n) || /^(\d)\1+$/.test(n)) {
    return false;
  }

  function digito(base, pesos) {
    const soma = pesos.reduce(
      (total, peso, i) => total + Number(base[i]) * peso,
      0
    );

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  const primeiro = digito(
    n.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  const segundo = digito(
    n.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  return (
    primeiro === Number(n[12]) &&
    segundo === Number(n[13])
  );
}

function preencher(id, valor) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  elemento.textContent =
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ""
      ? "Não informado"
      : String(valor);
}

function mostrarMensagem(texto, cor = "#475569") {
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

function mostrarMensagemIE(texto, cor = "#475569") {
  mensagemIE.textContent = texto;
  mensagemIE.style.color = cor;
}

function cancelarConsultas() {
  if (controladorCNPJ) {
    controladorCNPJ.abort();
    controladorCNPJ = null;
  }

  if (controladorIE) {
    controladorIE.abort();
    controladorIE = null;
  }

  pesquisar.disabled = false;
  pesquisar.textContent = "Pesquisar";

  pesquisarIE.disabled = false;
  pesquisarIE.textContent = "Consultar Inscrição Estadual (IE)";
}

function limparResultado() {
  resultado.hidden = true;
  cnpjConsultado = "";

  resultado.querySelectorAll("p").forEach(elemento => {
    elemento.textContent = "";
  });

  secundarios.replaceChildren();
  listaIE.replaceChildren();

  resultadoIE.hidden = true;
  pesquisarIE.disabled = false;
  pesquisarIE.textContent = "Consultar Inscrição Estadual (IE)";
}

function formatarData(valor) {
  if (!valor) return "Não informado";

  const texto = String(valor);

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    return texto;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    const partes = texto.slice(0, 10).split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return texto;
}

function exibirDados(dados) {
  preencher(
    "tipo",
    Number(dados.identificador_matriz_filial) === 1
      ? "Matriz"
      : Number(dados.identificador_matriz_filial) === 2
        ? "Filial"
        : "Não informado"
  );

  preencher("situacao", dados.descricao_situacao_cadastral);
  preencher("razao", dados.razao_social);
  preencher("fantasia", dados.nome_fantasia);

  const principal = dados.cnae_fiscal
    ? `${dados.cnae_fiscal} - ${dados.cnae_fiscal_descricao || ""}`
    : "Não informado";

  preencher("principal", principal);

  secundarios.replaceChildren();

  const atividades = Array.isArray(dados.cnaes_secundarios)
    ? dados.cnaes_secundarios
    : [];

  if (atividades.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhuma atividade secundária informada";
    secundarios.appendChild(li);
  } else {
    atividades.forEach(atividade => {
      const li = document.createElement("li");

      li.textContent =
        `${atividade.codigo || ""} - ${atividade.descricao || ""}`;

      secundarios.appendChild(li);
    });
  }

  preencher("logradouro", dados.logradouro);
  preencher("numero", dados.numero);
  preencher("complemento", dados.complemento);
  preencher("cep", dados.cep);
  preencher("bairro", dados.bairro);
  preencher("municipio", dados.municipio);
  preencher("uf", dados.uf);

  const situacao = document.getElementById("situacao");

  const status = String(
    dados.descricao_situacao_cadastral || ""
  ).toUpperCase();

  situacao.style.color =
    status === "ATIVA"
      ? "#15803d"
      : status === "BAIXADA"
        ? "#dc2626"
        : "#b45309";

  resultado.hidden = false;
  resultadoIE.hidden = true;

  mostrarMensagemIE(
    "Clique no botão para consultar a Inscrição Estadual."
  );
}

function criarCampoIE(rotulo, valor, cor = "") {
  const div = document.createElement("div");
  const label = document.createElement("label");
  const p = document.createElement("p");

  label.textContent = rotulo;

  p.textContent =
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ""
      ? "Não informado"
      : String(valor);

  if (cor) {
    p.style.color = cor;
  }

  div.append(label, p);

  return div;
}

function exibirInscricoesEstaduais(dados) {
  const inscricoes = Array.isArray(dados.inscricoes_estaduais)
    ? dados.inscricoes_estaduais
    : [];

  listaIE.replaceChildren();

  if (inscricoes.length === 0) {
    resultadoIE.hidden = true;

    mostrarMensagemIE(
      "Nenhuma Inscrição Estadual encontrada na base consultada.",
      "#b45309"
    );

    return;
  }

  inscricoes.forEach((inscricao, indice) => {
    const bloco = document.createElement("div");
    const titulo = document.createElement("h4");
    const grade = document.createElement("div");

    titulo.textContent = `Inscrição Estadual ${indice + 1}`;
    grade.className = "dados";

    const situacao =
      inscricao.ativo === true
        ? "Ativa"
        : inscricao.ativo === false
          ? "Inativa"
          : "Não informado";

    const cor =
      inscricao.ativo === true
        ? "#15803d"
        : inscricao.ativo === false
          ? "#dc2626"
          : "#475569";

    grade.appendChild(
      criarCampoIE(
        "Número da Inscrição Estadual",
        inscricao.inscricao_estadual
      )
    );

    grade.appendChild(
      criarCampoIE(
        "UF da Inscrição Estadual",
        inscricao.uf
      )
    );

    grade.appendChild(
      criarCampoIE(
        "Situação da Inscrição Estadual",
        situacao,
        cor
      )
    );

    grade.appendChild(
      criarCampoIE(
        "Última atualização",
        formatarData(inscricao.atualizado_em)
      )
    );

    bloco.append(titulo, grade);

    if (indice < inscricoes.length - 1) {
      bloco.appendChild(document.createElement("hr"));
    }

    listaIE.appendChild(bloco);
  });

  resultadoIE.hidden = false;

  mostrarMensagemIE(
    `${inscricoes.length} inscrição(ões) estadual(is) encontrada(s).`,
    "#15803d"
  );
}

// CONSULTA PRINCIPAL DO CNPJ

campo.addEventListener("input", () => {
  campo.value = formatarCNPJ(campo.value);

  cancelarConsultas();
  limparResultado();

  mostrarMensagem("");
});

pesquisar.addEventListener("click", async () => {
  const cnpj = somenteDigitos(campo.value);

  cancelarConsultas();
  limparResultado();

  if (!validarCNPJ(cnpj)) {
    mostrarMensagem("Informe um CNPJ válido.", "#dc2626");
    return;
  }

  const controlador = new AbortController();
  controladorCNPJ = controlador;

  pesquisar.disabled = true;
  pesquisar.textContent = "Consultando...";

  mostrarMensagem("Buscando informações cadastrais...");

  try {
    const resposta = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
      { signal: controlador.signal }
    );

    if (!resposta.ok) {
      if (resposta.status === 404) {
        throw new Error(
          "CNPJ não encontrado na base consultada."
        );
      }

      if (resposta.status === 429) {
        throw new Error(
          "Limite de consultas atingido. Tente novamente mais tarde."
        );
      }

      throw new Error(
        "Não foi possível consultar o CNPJ."
      );
    }

    const dados = await resposta.json();

    if (controladorCNPJ !== controlador) return;

    cnpjConsultado = cnpj;

    exibirDados(dados);

    mostrarMensagem(
      "Dados cadastrais consultados com sucesso!",
      "#15803d"
    );

  } catch (erro) {
    if (
      erro.name !== "AbortError" &&
      controladorCNPJ === controlador
    ) {
      mostrarMensagem(
        erro instanceof TypeError
          ? "Falha de conexão ou acesso à API. Tente novamente."
          : erro.message,
        "#dc2626"
      );
    }
  } finally {
    if (controladorCNPJ === controlador) {
      controladorCNPJ = null;
      pesquisar.disabled = false;
      pesquisar.textContent = "Pesquisar";
    }
  }
});

// CONSULTA OPCIONAL DA INSCRIÇÃO ESTADUAL

pesquisarIE.addEventListener("click", async () => {
  if (!cnpjConsultado) {
    mostrarMensagemIE(
      "Primeiro consulte um CNPJ válido.",
      "#dc2626"
    );
    return;
  }

  if (controladorIE) {
    controladorIE.abort();
  }

  const controlador = new AbortController();
  controladorIE = controlador;

  resultadoIE.hidden = true;
  listaIE.replaceChildren();

  pesquisarIE.disabled = true;
  pesquisarIE.textContent = "Consultando IE...";

  mostrarMensagemIE(
    "Buscando inscrições estaduais. Aguarde..."
  );

  try {
    const resposta = await fetch(
      `${API_IE}?cnpj=${encodeURIComponent(cnpjConsultado)}`,
      { signal: controlador.signal }
    );

    if (!resposta.ok) {
      throw new Error(
        `Não foi possível consultar a IE (HTTP ${resposta.status}).`
      );
    }

    const dados = await resposta.json();

    if (controladorIE !== controlador) return;

    exibirInscricoesEstaduais(dados);

  } catch (erro) {
    if (
      erro.name !== "AbortError" &&
      controladorIE === controlador
    ) {
      mostrarMensagemIE(
        erro instanceof TypeError
          ? "Não foi possível conectar ao servidor de Inscrição Estadual."
          : erro.message,
        "#dc2626"
      );
    }
  } finally {
    if (controladorIE === controlador) {
      controladorIE = null;

      pesquisarIE.disabled = false;
      pesquisarIE.textContent =
        "Consultar Inscrição Estadual (IE)";
    }
  }
});

// BOTÃO LIMPAR

limpar.addEventListener("click", () => {
  cancelarConsultas();
  limparResultado();

  campo.value = "";

  mostrarMensagem("");
  campo.focus();
});

// PESQUISAR COM ENTER

campo.addEventListener("keydown", evento => {
  if (evento.key === "Enter") {
    pesquisar.click();
  }
});
