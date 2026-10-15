/* Ambulante Conecta — formalização (RF02).
   Depende de js/api.js, js/icones.js e js/app.js (carregue-os antes).
   Etapa 1 (MEI): GET e PATCH /ambulantes/me.
   Etapa 2 (autorização da prefeitura): situação real do pedido de ponto, de GET /solicitacoes/minhas.
   A página é pública para visitante e ambulante (data-perfis); o gestor vai para o início (app.js).
   Heurísticas: progresso "1 de 2" (1), passo a passo para tirar o MEI (10), erro do CNPJ dizendo o que fazer (9),
   corrigir o CNPJ (3), a etapa 2 mostra o que de fato aconteceu, e não um "marcar como feito" (1 e 5). */

(function () {
  const porId = (id) => document.getElementById(id);
  const ehAmbulante = !!Sessao.token() && perfilAtual() === "ambulante";
  const estado = lerEstado();
  let possuiMei = false;
  let autorizado = false;

  const formMei = porId("formMei");
  const campoCnpj = porId("cnpj_mei");
  const btnMei = porId("btnMei");
  const meiEstado = porId("meiEstado");
  const meiOk = porId("meiOk");

  const digitos = (v) => String(v ?? "").replace(/\D/g, "");
  const mascararCnpj = (v) => digitos(v).slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");

  function mostrarErro(msg) {
    porId("erro-cnpj_mei").textContent = msg;
    campoCnpj.setAttribute("aria-invalid", msg ? "true" : "false");
    campoCnpj.classList.toggle("invalido", !!msg);
  }

  function selo(id, texto, cor) {
    porId(id).className = "status " + cor;
    porId(id).textContent = texto;
  }

  function atualizarProgresso() {
    const feitas = (possuiMei ? 1 : 0) + (autorizado ? 1 : 0);
    porId("contagem").innerHTML = feitas === 2
      ? "<strong>Tudo certo:</strong> as 2 etapas estão concluídas."
      : `<strong>${feitas} de 2 etapas</strong> concluídas`;
    porId("barraFormalizacao").style.width = `${feitas * 50}%`;
    document.querySelector(".etapas-barra").setAttribute("aria-valuenow", String(feitas));
  }

  /* ---------- Etapa 1: MEI ---------- */
  function mostrarMei(dados) {
    possuiMei = !!dados.possui_mei;
    // O resumo antigo da página inicial lia o MEI do navegador: mantém em dia com a API
    estado.formalizacao.mei = possuiMei;
    salvarEstado(estado);

    selo("status-mei", possuiMei ? "Concluída" : "Falta informar", possuiMei ? "green" : "orange");
    meiEstado.innerHTML = "";
    meiEstado.removeAttribute("aria-busy");
    meiOk.hidden = !possuiMei;
    formMei.hidden = possuiMei;
    porId("comoTirar").hidden = possuiMei;
    porId("cancelaMei").hidden = true;
    if (possuiMei) porId("meiCnpj").textContent = mascararCnpj(dados.cnpj_mei);
    atualizarProgresso();
  }

  async function salvarMei(e) {
    e.preventDefault();
    const cnpj = digitos(campoCnpj.value);
    if (cnpj.length !== 14) {
      mostrarErro("O CNPJ tem 14 números. Confira no seu Certificado do MEI.");
      return campoCnpj.focus();
    }
    btnMei.disabled = true; // evita clique duplo
    btnMei.classList.add("carregando");
    btnMei.textContent = "Salvando...";
    try {
      mostrarMei(await chamarApi("/ambulantes/me", { metodo: "PATCH", corpo: { cnpj_mei: cnpj } }));
      mostrarAviso("CNPJ salvo! Agora você já pode pedir um ponto de venda.");
      desenharLicenca(ultimosPedidos);
      meiOk.focus();
    } catch (erro) {
      if (erro.status === 401) return;
      // O módulo 11 é conferido pela API
      mostrarErro(erro.campos.cnpj_mei ? "Este CNPJ não é válido. Confira os 14 números no seu Certificado do MEI." : erro.message);
      campoCnpj.focus();
    } finally {
      btnMei.disabled = false;
      btnMei.classList.remove("carregando");
      btnMei.innerHTML = `${icone("check")}Salvar CNPJ`;
    }
  }

  /* ---------- Etapa 2: autorização = pedido de ponto ---------- */
  let ultimosPedidos = [];

  function desenharLicenca(pedidos) {
    const aprovado = pedidos.find((s) => s.status === "Aprovada");
    const pendente = pedidos.find((s) => s.status === "Pendente");
    const nome = (s) => escHtml(s.ponto || "Ponto " + s.ponto_id);
    const link = (href, texto, classe = "btn-primary") => `<a class="btn ${classe} btn-sm" href="${href}">${texto}</a>`;
    autorizado = !!aprovado;

    let texto, acoes;
    if (aprovado) {
      selo("status-licenca", "Concluída", "green");
      texto = `A prefeitura aprovou o seu pedido para <strong>${nome(aprovado)}</strong>.`;
      acoes = link("situacao.html", "Ver meu pedido", "btn-ghost");
    } else if (pendente) {
      selo("status-licenca", "Em análise", "orange");
      texto = `Seu pedido para <strong>${nome(pendente)}</strong> está em análise. A resposta chega em Mensagens.`;
      acoes = link("situacao.html", "Acompanhar pedido", "btn-ghost");
    } else if (!possuiMei) {
      selo("status-licenca", "Não iniciada", "gray");
      texto = "Depois de informar o MEI na etapa 1, você escolhe um ponto livre e faz o pedido.";
      acoes = link("mapa.html", "Ver pontos livres", "btn-ghost");
    } else {
      selo("status-licenca", "Não iniciada", "gray");
      texto = pedidos.length ? "Seu último pedido foi recusado. Escolha outro ponto livre e peça de novo." : "Agora é só escolher um ponto livre e fazer o pedido.";
      acoes = link("situacao.html#nova", `${icone("pedido")}Pedir um ponto`);
    }
    porId("licencaTexto").innerHTML = texto;
    porId("licencaAcoes").innerHTML = acoes;
    atualizarProgresso();
  }

  /* ---------- Carregar ---------- */
  async function carregar() {
    selo("status-mei", "Carregando...", "gray");
    selo("status-licenca", "Carregando...", "gray");
    mostrarCarregando(meiEstado, 1, "Carregando seus dados...");
    try {
      const [eu, pedidos] = await Promise.all([chamarApi("/ambulantes/me"), chamarApi("/solicitacoes/minhas")]);
      ultimosPedidos = pedidos;
      mostrarMei(eu);
      desenharLicenca(pedidos);
    } catch (erro) {
      if (erro.status === 401) return; // api.js já levou para o login
      selo("status-mei", "Indisponível", "gray");
      selo("status-licenca", "Indisponível", "gray");
      porId("contagem").textContent = "Não foi possível carregar a sua situação.";
      mostrarErroCarga(meiEstado, erro, carregar);
    }
  }

  if (ehAmbulante) {
    meiOk.tabIndex = -1;
    campoCnpj.addEventListener("input", () => { campoCnpj.value = mascararCnpj(campoCnpj.value); mostrarErro(""); });
    formMei.addEventListener("submit", salvarMei);
    porId("corrigirMei").addEventListener("click", () => {
      meiOk.hidden = true;
      formMei.hidden = false;
      porId("cancelaMei").hidden = false;
      campoCnpj.value = porId("meiCnpj").textContent;
      campoCnpj.focus();
    });
    porId("cancelaMei").addEventListener("click", () => {
      formMei.hidden = true;
      meiOk.hidden = false;
      mostrarErro("");
    });
    carregar();
  } else {
    // Visitante: convite para entrar e o passo a passo do MEI aberto
    porId("meiVisitante").hidden = false;
    porId("comoTirar").open = true;
    selo("status-mei", "Entre para informar", "gray");
    selo("status-licenca", "Entre para acompanhar", "gray");
    porId("licencaTexto").textContent = "Com a conta criada e o MEI informado, você escolhe um ponto livre e faz o pedido.";
    porId("licencaAcoes").innerHTML = '<a class="btn btn-ghost btn-sm" href="mapa.html">Ver pontos livres</a>';
    // O MEI só vale se veio da API: apaga uma marcação antiga feita à mão no protótipo
    if (estado.formalizacao.mei) { estado.formalizacao.mei = false; salvarEstado(estado); }
    porId("contagem").innerHTML = "<strong>Entre na sua conta</strong> para acompanhar as etapas.";
  }
})();
