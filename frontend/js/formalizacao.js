/* Ambulante Conecta — formalização (RF02).
   Depende de js/api.js e js/app.js (carregue-os antes).
   MEI: ligado à API (GET e PATCH /ambulantes/me). Licença municipal: ainda só no navegador (localStorage). */

(function () {
  const porId = (id) => document.getElementById(id);
  const ehAmbulante = !!Sessao.token() && perfilAtual() === "ambulante";
  let estado = lerEstado();
  let possuiMei = false;

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

  function marcarStatus(id, ok, textoNao = "Não iniciada") {
    porId(id).className = "status " + (ok ? "green" : "gray");
    porId(id).textContent = ok ? "Concluída" : textoNao;
  }

  function atualizarContagem() {
    const feitas = (possuiMei ? 1 : 0) + (estado.formalizacao.licenca ? 1 : 0);
    porId("contagem").textContent = `${feitas} de 2 etapas`;
    porId("contagem").className = "status " + (feitas === 2 ? "green" : feitas ? "blue" : "gray");
  }

  /* ---------- MEI (API) ---------- */
  function mostrarMei(dados) {
    possuiMei = !!dados.possui_mei;
    // A página inicial lê o resumo da formalização do navegador: mantém o MEI em dia com a API
    estado.formalizacao.mei = possuiMei;
    salvarEstado(estado);

    marcarStatus("status-mei", possuiMei);
    meiEstado.innerHTML = "";
    meiOk.hidden = !possuiMei;
    formMei.hidden = possuiMei;
    porId("cancelaMei").hidden = true;
    if (possuiMei) porId("meiCnpj").textContent = mascararCnpj(dados.cnpj_mei);
    atualizarContagem();
  }

  async function carregarMei() {
    porId("status-mei").textContent = "Carregando...";
    meiEstado.innerHTML = '<p class="vazio">Carregando seus dados...</p>';
    try {
      mostrarMei(await chamarApi("/ambulantes/me"));
    } catch (erro) {
      if (erro.status === 401) return; // api.js já levou para o login
      porId("status-mei").textContent = "Indisponível";
      meiEstado.innerHTML = `<div class="vazio estado-erro" role="alert"><p>${escHtml(erro.message)}</p>
        <div class="btn-row"><button type="button" class="btn btn-ghost">Tentar de novo</button></div></div>`;
      meiEstado.querySelector("button").addEventListener("click", carregarMei);
    }
  }

  async function salvarMei(e) {
    e.preventDefault();
    const cnpj = digitos(campoCnpj.value);
    if (cnpj.length !== 14) {
      mostrarErro("Informe os 14 números do CNPJ.");
      return campoCnpj.focus();
    }
    btnMei.disabled = true; // evita clique duplo
    btnMei.textContent = "Salvando...";
    try {
      mostrarMei(await chamarApi("/ambulantes/me", { metodo: "PATCH", corpo: { cnpj_mei: cnpj } }));
      mostrarAviso("CNPJ salvo. Você já pode pedir um ponto de venda.");
      meiOk.focus();
    } catch (erro) {
      if (erro.status === 401) return;
      mostrarErro(erro.campos.cnpj_mei || erro.message); // o módulo 11 é conferido pela API
      campoCnpj.focus();
    } finally {
      btnMei.textContent = "Salvar CNPJ";
      btnMei.disabled = false;
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
    carregarMei();
  } else {
    // Visitante vê o convite para entrar. O gestor não informa MEI.
    const gestor = perfilAtual() === "gestor";
    porId("meiVisitante").hidden = gestor;
    marcarStatus("status-mei", false, gestor ? "Não se aplica" : "Entre para informar");
    // O MEI só vale se veio da API: apaga uma marcação antiga feita à mão no protótipo
    if (estado.formalizacao.mei) { estado.formalizacao.mei = false; salvarEstado(estado); }
    atualizarContagem();
  }

  /* ---------- Licença municipal (só no navegador) ---------- */

  function renderLicenca() {
    marcarStatus("status-licenca", estado.formalizacao.licenca);
    porId("toggle-licenca").textContent = estado.formalizacao.licenca ? "Desmarcar etapa" : "Marcar como concluída";
    atualizarContagem();
  }

  porId("toggle-licenca").addEventListener("click", () => {
    estado.formalizacao.licenca = !estado.formalizacao.licenca;
    salvarEstado(estado);
    renderLicenca();
  });

  renderLicenca();
})();
