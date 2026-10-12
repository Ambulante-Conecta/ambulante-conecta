/* Ambulante Conecta — solicitação de ponto (RF04), ligada à API.
   Depende de js/api.js e js/app.js (carregue-os antes).
   Rotas: GET /pontos?status=disponivel · POST /solicitacoes · GET /solicitacoes/minhas */

(function () {
  // A proteção da página (data-exige-login) está em app.js. Aqui só evitamos rodar sem sessão de ambulante.
  if (!Sessao.token() || perfilAtual() !== "ambulante") return;

  const porId = (id) => document.getElementById(id);
  const form = porId("formSolicitacao");
  const selPonto = porId("ponto");
  const btnEnviar = porId("btnEnviar");
  const erroPonto = porId("erro-ponto");
  const avisoMei = porId("avisoMei");
  const listaMinhas = porId("minhas");

  const COR_STATUS = { Pendente: "orange", Aprovada: "green", Recusada: "red" };

  const formatarData = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  function mostrarErroPonto(msg) {
    erroPonto.textContent = msg;
    selPonto.setAttribute("aria-invalid", msg ? "true" : "false");
    selPonto.classList.toggle("invalido", !!msg);
  }

  /* ---------- Pontos disponíveis (GeoJSON) ---------- */
  async function carregarPontos(preferido) {
    selPonto.disabled = true;
    btnEnviar.disabled = true;
    mostrarErroPonto("");
    selPonto.innerHTML = '<option value="">Carregando pontos...</option>';

    try {
      const geo = await chamarApi("/pontos?status=disponivel");
      const pontos = (geo.features || []).map((f) => f.properties);

      if (!pontos.length) {
        selPonto.innerHTML = '<option value="">Nenhum ponto disponível no momento</option>';
        return;
      }
      selPonto.innerHTML = '<option value="">Selecione um ponto</option>' + pontos.map((p) =>
        `<option value="${Number(p.id)}">${escHtml(p.descricao_local || "Ponto " + p.id)}${p.bairro ? " — " + escHtml(p.bairro) : ""}</option>`
      ).join("");
      selPonto.disabled = false;
      btnEnviar.disabled = false;

      // Vem do mapa: situacao.html?ponto=5#nova
      if (preferido && pontos.some((p) => String(p.id) === String(preferido))) selPonto.value = String(preferido);
    } catch (erro) {
      selPonto.innerHTML = '<option value="">Não foi possível carregar os pontos</option>';
      mostrarErroPonto(erro.message + " Recarregue a página para tentar de novo.");
    }
  }

  /* ---------- Minhas solicitações ---------- */
  function criarCartao(s) {
    const cor = COR_STATUS[s.status] || "gray";
    const avaliada = s.data_avaliacao ? formatarData(s.data_avaliacao) : "";

    let rodape = "";
    if (s.status === "Pendente") {
      rodape = `<div class="notice notice-info"><div><strong>Em análise</strong><p class="muted">A prefeitura ainda vai avaliar o pedido. Você recebe um aviso em Mensagens.</p></div></div>`;
    } else if (s.status === "Aprovada") {
      rodape = `<div class="notice notice-ok"><div><strong>Ponto concedido</strong><p class="muted">Este ponto agora é seu e aparece como ocupado no mapa.</p></div></div>`;
    } else if (s.status === "Recusada") {
      rodape = `<div class="notice notice-recusa"><div><strong>Motivo da recusa</strong><p>${escHtml(s.justificativa || "Não informado.")}</p></div></div>`;
    }

    return `<article class="card solic-card">
      <div class="solic-top">
        <div><h3>${escHtml(s.ponto || "Ponto " + s.ponto_id)}</h3>${s.bairro ? `<p class="muted">${escHtml(s.bairro)}</p>` : ""}</div>
        <span class="status ${cor}">${escHtml(s.status)}</span>
      </div>
      <dl class="detalhes">
        <div><dt>Pedido nº</dt><dd>${Number(s.id)}</dd></div>
        <div><dt>Solicitado em</dt><dd>${formatarData(s.data_solicitacao)}</dd></div>
        ${avaliada ? `<div><dt>Avaliado em</dt><dd>${avaliada}</dd></div>` : ""}
      </dl>
      ${rodape}
    </article>`;
  }

  async function carregarMinhas() {
    try {
      const itens = await chamarApi("/solicitacoes/minhas");
      listaMinhas.innerHTML = itens.length
        ? itens.map(criarCartao).join("")
        : '<p class="vazio">Você ainda não fez nenhum pedido. Escolha um ponto acima para começar.</p>';
    } catch (erro) {
      listaMinhas.innerHTML = `<div class="vazio estado-erro" role="alert"><p>${escHtml(erro.message)}</p>
        <div class="btn-row"><button type="button" class="btn btn-ghost" id="tentarDeNovo">Tentar de novo</button></div></div>`;
      porId("tentarDeNovo").addEventListener("click", carregarMinhas);
    }
  }

  /* ---------- Enviar solicitação ---------- */
  async function enviar(e) {
    e.preventDefault();
    avisoMei.hidden = true;
    mostrarErroPonto("");

    if (!selPonto.value) {
      mostrarErroPonto("Escolha um ponto de venda.");
      return selPonto.focus();
    }

    btnEnviar.disabled = true; // evita clique duplo
    btnEnviar.textContent = "Enviando...";
    try {
      await chamarApi("/solicitacoes", { metodo: "POST", corpo: { ponto_id: Number(selPonto.value) } });
      mostrarAviso("Pedido enviado. Ele está em análise.");
      await Promise.all([carregarPontos(), carregarMinhas()]);
      atualizarNaoLidas(); // a RN03 criou um aviso em Mensagens: atualiza o contador do menu
      listaMinhas.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (erro) {
      if (erro.status === 422) {                 // RN02: sem MEI
        avisoMei.hidden = false;
        avisoMei.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (erro.status === 409) {          // ponto ocupado ou pedido repetido
        mostrarErroPonto(erro.message);
        await Promise.all([carregarPontos(), carregarMinhas()]);
        mostrarErroPonto(erro.message);          // o recarregamento limpou a mensagem
      } else if (erro.status === 401) {
        return;                                  // api.js já levou para o login
      } else {
        mostrarErroPonto(erro.message);
      }
    } finally {
      btnEnviar.textContent = "Enviar solicitação";
      btnEnviar.disabled = selPonto.disabled;
    }
  }

  /* ---------- Início ---------- */
  form.addEventListener("submit", enviar);
  selPonto.addEventListener("change", () => mostrarErroPonto(""));

  carregarPontos(new URLSearchParams(location.search).get("ponto"));
  carregarMinhas();

  // Se o gestor avaliou enquanto a aba ficou aberta, o status aparece ao voltar para ela
  document.addEventListener("visibilitychange", () => { if (!document.hidden) carregarMinhas(); });
})();