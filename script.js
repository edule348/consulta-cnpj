
const campo = document.getElementById("cnpj");
const pesquisar = document.getElementById("pesquisar");
const limpar = document.getElementById("limpar");
const mensagem = document.getElementById("mensagem");
const resultado = document.getElementById("resultado");
const secundarios = document.getElementById("secundarios");

let consultaAtual = null;

function somenteDigitos(valor) {
  return valor.replace(/\D/g, "");
}

function formatarCNPJ(valor) {
  const n = somenteDigitos(valor).slice(0, 14);

  return n
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function validarCNPJ(cnpj) {
  const n = somenteDigitos(cnpj);

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
    [5,4,3,2,9,8,7,6,5,4,3,2]
  );

  const segundo = digito(
    n.slice(0, 13),
    [6,5,4,3,2,9,8,7,6,5,4,3,2]
  );

  return primeiro === Number(n[12]) &&
         segundo === Number(n[13]);
}

function preencher(id, valor) {
  document.getElementById(id).textContent =
    valor === null || valor === undefined ||
    String(valor).trim() === ""
      ? "Não informado"
      : String(valor);
}

function mostrarMensagem(texto, cor = "#475569") {
  mensagem.textContent = texto;
  mensagem.style.color = cor;
}

function limparResultado() {
  resultado.hidden = true;

  resultado.querySelectorAll("p").forEach(elemento => {
    elemento.textContent = "";
  });

  secundarios.replaceChildren();
}

function cancelarConsulta() {
  if (consultaAtual) {
    consultaAtual.abort();
    consultaAtual = null;
  }

  pesquisar.disabled = false;
  pesquisar.textContent = "Pesquisar";
}

function exibirDados(dados) {
  preencher(
    "tipo",
    dados.identificador_matriz_filial === 1
      ? "Matriz"
      : dados.identificador_matriz_filial === 2
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
        `${atividade.codigo} - ${atividade.descricao}`;
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
  const status = (dados.descricao_situacao_cadastral || "")
    .toUpperCase();

  situacao.style.color = status === "ATIVA"
    ? "#15803d"
    : status === "BAIXADA"
      ? "#dc2626"
      : "#b45309";

  resultado.hidden = false;
}

campo.addEventListener("input", () => {
  campo.value = formatarCNPJ(campo.value);
  cancelarConsulta();
  limparResultado();
  mostrarMensagem("");
});

pesquisar.addEventListener("click", async () => {
  const cnpj = somenteDigitos(campo.value);

  cancelarConsulta();
  limparResultado();

  if (!validarCNPJ(cnpj)) {
    mostrarMensagem("Informe um CNPJ válido.", "#dc2626");
    return;
  }

  const controlador = new AbortController();
  consultaAtual = controlador;

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
        throw new Error("CNPJ não encontrado na base consultada.");
      }

      if (resposta.status === 429) {
        throw new Error("Limite de consultas atingido. Tente novamente mais tarde.");
      }

      throw new Error("Não foi possível consultar o CNPJ.");
    }

    const dados = await resposta.json();

    if (consultaAtual !== controlador) return;

    exibirDados(dados);
    mostrarMensagem("Consulta realizada com sucesso!", "#15803d");

  } catch (erro) {
    if (erro.name !== "AbortError" &&
        consultaAtual === controlador) {
      mostrarMensagem(
        erro instanceof TypeError
          ? "Falha de conexão ou acesso à API. Tente novamente."
          : erro.message,
        "#dc2626"
      );
    }
  } finally {
    if (consultaAtual === controlador) {
      consultaAtual = null;
      pesquisar.disabled = false;
      pesquisar.textContent = "Pesquisar";
    }
  }
});

limpar.addEventListener("click", () => {
  cancelarConsulta();
  campo.value = "";
  limparResultado();
  mostrarMensagem("");
  campo.focus();
});

campo.addEventListener("keydown", evento => {
  if (evento.key === "Enter") {
    pesquisar.click();
  }
});
