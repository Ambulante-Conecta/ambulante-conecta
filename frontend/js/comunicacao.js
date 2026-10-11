/* Ambulante Conecta — mensagens do ambulante com a prefeitura (RF05), ligadas à API.
   Depende de js/api.js e js/app.js (carregue-os antes).
   Rotas: GET /mensagens · POST /mensagens · PATCH /mensagens/:id/lida */

(function () {
  // A proteção da página (data-exige-login) está em app.js. Aqui só evitamos rodar sem sessão de ambulante.
  if (!Sessao.token() || perfilAtual() !== "ambulante") return;

  const porId = (id) => document.getElementById(id);
  const form = porId("formMsg");
  const cardForm = porId("formMsgCard");
  const btnNova = porId("btnNova");
  const btnEnviar = porId("btnEnviar");
  const caixa = porId("caixa");
  const listas = porId("listas");
  const listaRecebidas = porId("recebidas");
  const listaEnviadas = porId("enviadas");

  // remetente vem da API: "ambulante" (você), "gestor" (prefeitura) ou "sistema" (aviso automático, RN03)
  const NOME_REMETENTE = { gestor: "Prefeitura de Manaus", sistema: "Aviso automático" };

  const formatarData = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  function mostrarErro(campo, msg) {
    porId("erro-" + campo).textContent = msg;
    const el = porId(campo);
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    el.classList.toggle("invalido", !!msg);
  }

  /* ---------- Caixa de entrada ---------- */
  function criarItem(m, recebida) {
    const nova = recebida && !m.lida;
    const de = recebida ? "De: " + (NOME_REMETENTE[m.remetente] || "Prefeitura de Manaus") : "Para: Prefeitura de Manaus";
    return `<details class="msg${nova ? " nova" : ""}" data-id="${Number(m.id)}">
      <summary><span class="msg-de">${escHtml(de)}${nova ? " · Nova" : ""}</span>
        <span class="msg-assunto">${escHtml(m.assunto)}</span>
        <time datetime="${escHtml(m.criado_em)}">${formatarData(m.criado_em)}</time></summary>
      <p>${escHtml(m.texto)}</p>
    </details>`;
  }

  async function carregarMensagens() {
    // Guarda quais mensagens estavam abertas para não fechá-las ao recarregar
    const abertas = new Set([...listas.querySelectorAll("details[open]")].map((d) => d.dataset.id));
    try {
      const mensagens = await chamarApi("/mensagens?limite=100");
      const recebidas = mensagens.filter((m) => m.remetente !== "ambulante");
      const enviadas = mensagens.filter((m) => m.remetente === "ambulante");

      listaRecebidas.innerHTML = recebidas.length
        ? recebidas.map((m) => criarItem(m, true)).join("")
        : '<p class="vazio">Você ainda não recebeu mensagens. Os avisos sobre seus pedidos aparecem aqui.</p>';
      listaEnviadas.innerHTML = enviadas.length
        ? enviadas.map((m) => criarItem(m, false)).join("")
        : '<p class="vazio">Você ainda não enviou mensagens. Use o botão "Nova mensagem" para falar com a prefeitura.</p>';

      listas.querySelectorAll("details").forEach((d) => { if (abertas.has(d.dataset.id)) d.open = true; });
      caixa.hidden = true;
      listas.hidden = false;
    } catch (erro) {
      if (erro.status === 401) return; // api.js já levou para o login
      listas.hidden = true;
      caixa.hidden = false;
      caixa.innerHTML = `<div class="vazio estado-erro" role="alert"><p>${escHtml(erro.message)}</p>
        <div class="btn-row"><button type="button" class="btn btn-ghost" id="tentarDeNovo">Tentar de novo</button></div></div>`;
      porId("tentarDeNovo").addEventListener("click", () => {
        caixa.innerHTML = '<p class="vazio">Carregando suas mensagens...</p>';
        carregarMensagens();
      });
    }
  }

  // Abrir uma mensagem nova marca como lida na API e atualiza o contador do menu
  async function marcarComoLida(d) {
    if (!d.open || !d.classList.contains("nova") || d.dataset.marcando) return;
    d.dataset.marcando = "1";
    d.classList.remove("nova");
    const de = d.querySelector(".msg-de");
    de.textContent = de.textContent.replace(/ · Nova$/, "");
    try {
      await chamarApi(`/mensagens/${Number(d.dataset.id)}/lida`, { metodo: "PATCH" });
      atualizarNaoLidas();
    } catch (erro) {
      if (erro.status === 401) return;
      mostrarAviso("Não foi possível marcar a mensagem como lida. " + erro.message);
      carregarMensagens(); // volta ao estado real
    } finally {
      delete d.dataset.marcando;
    }
  }

  /* ---------- Nova mensagem ---------- */
  function abrirForm(abrir) {
    cardForm.hidden = !abrir;
    btnNova.setAttribute("aria-expanded", abrir);
    if (abrir) form.assunto.focus();
    else { form.reset(); mostrarErro("assunto", ""); mostrarErro("texto", ""); }
  }

  async function enviar(e) {
    e.preventDefault();
    const assunto = form.assunto.value.trim();
    const texto = form.texto.value.trim();
    mostrarErro("assunto", assunto ? "" : "Escreva o assunto da mensagem.");
    mostrarErro("texto", texto ? "" : "Escreva a mensagem.");
    if (!assunto) return form.assunto.focus();
    if (!texto) return form.texto.focus();

    btnEnviar.disabled = true; // evita clique duplo
    btnEnviar.textContent = "Enviando...";
    try {
      await chamarApi("/mensagens", { metodo: "POST", corpo: { assunto, texto } });
      abrirForm(false);
      mostrarAviso("Mensagem enviada para a prefeitura.");
      await carregarMensagens();
    } catch (erro) {
      if (erro.status === 401) return;           // api.js já levou para o login
      if (erro.status === 400 && (erro.campos.assunto || erro.campos.texto)) {
        mostrarErro("assunto", erro.campos.assunto || "");
        mostrarErro("texto", erro.campos.texto || "");
        (erro.campos.assunto ? form.assunto : form.texto).focus();
      } else {
        mostrarErro("texto", erro.message);      // inclui o limite de envios (429) e a falta de conexão
      }
    } finally {
      btnEnviar.textContent = "Enviar mensagem";
      btnEnviar.disabled = false;
    }
  }

  /* ---------- Início ---------- */
  btnNova.addEventListener("click", () => abrirForm(cardForm.hidden));
  porId("cancelaMsg").addEventListener("click", () => abrirForm(false));
  form.addEventListener("submit", enviar);
  form.assunto.addEventListener("input", () => mostrarErro("assunto", ""));
  form.texto.addEventListener("input", () => mostrarErro("texto", ""));
  // O evento "toggle" não sobe pela árvore: por isso a captura (true)
  listaRecebidas.addEventListener("toggle", (e) => marcarComoLida(e.target), true);

  carregarMensagens();

  // Se a prefeitura respondeu enquanto a aba ficou aberta, a mensagem aparece ao voltar para ela
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { carregarMensagens(); atualizarNaoLidas(); }
  });
})();
