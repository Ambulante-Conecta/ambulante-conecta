/* Ambulante Conecta — conversa do ambulante com a prefeitura (RF05), ligada à API.
   Depende de js/api.js, js/icones.js e js/app.js (carregue-os antes).
   Rotas: GET /mensagens · POST /mensagens · PATCH /mensagens/lidas
   Heurísticas: formato de conversa conhecido (2 e 4), "Nova" e confirmação de envio (1), assunto em botões em vez de
   digitar (6 e 8), contador de caracteres (5), texto preservado se o envio falhar (9). */

(function () {
  // A proteção da página (data-exige-login) está em app.js. Aqui só evitamos rodar sem sessão de ambulante.
  if (!Sessao.token() || perfilAtual() !== "ambulante") return;

  const porId = (id) => document.getElementById(id);
  const form = porId("formMsg");
  const campoTexto = porId("texto");
  const btnEnviar = porId("btnEnviar");
  const lista = porId("mensagens");

  const formatarData = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  function mostrarErro(msg) {
    porId("erro-texto").textContent = msg;
    campoTexto.setAttribute("aria-invalid", msg ? "true" : "false");
    campoTexto.classList.toggle("invalido", !!msg);
  }

  /* ---------- Conversa ---------- */
  // remetente: "ambulante" (você), "gestor" (prefeitura) ou "sistema" (aviso automático, RN03 e decisões)
  function criarBalao(m) {
    const nova = m.remetente !== "ambulante" && !m.lida;
    const quando = `<time datetime="${escHtml(m.criado_em)}">${formatarData(m.criado_em)}</time>`;
    const selo = nova ? '<span class="selo-nova">Nova</span>' : "";
    if (m.remetente === "sistema") {
      return `<article class="balao balao-sistema${nova ? " nova" : ""}">
        <p class="balao-de">${icone("info")}Aviso automático ${selo}</p>
        <p class="balao-assunto">${escHtml(m.assunto)}</p>
        <p>${escHtml(m.texto)}</p>${quando}
      </article>`;
    }
    const minha = m.remetente === "ambulante";
    return `<article class="balao ${minha ? "balao-meu" : "balao-deles"}${nova ? " nova" : ""}">
      <p class="balao-de">${minha ? "Você" : "Prefeitura de Manaus"} ${selo}</p>
      <p class="balao-assunto">${escHtml(m.assunto)}</p>
      <p>${escHtml(m.texto)}</p>${quando}
    </article>`;
  }

  let primeiraCarga = true;

  async function carregarMensagens({ rolar = true } = {}) {
    if (primeiraCarga) mostrarCarregando(lista, 2, "Carregando a conversa...");
    try {
      const mensagens = (await chamarApi("/mensagens?limite=100")).reverse(); // a API manda da mais nova para a mais antiga
      primeiraCarga = false;
      lista.removeAttribute("aria-busy");
      lista.innerHTML = mensagens.length
        ? mensagens.map(criarBalao).join("")
        : `<div class="vazio vazio-convite">${icone("mensagem")}<div><strong>Nenhuma mensagem ainda.</strong>
            <p>Escreva abaixo para falar com a prefeitura. Quando você fizer um pedido de ponto, os avisos também chegam aqui.</p></div></div>`;
      if (rolar) lista.scrollTop = lista.scrollHeight; // mostra a mais nova

      // Ver a conversa é ler: marca como lidas as recebidas (as novas seguem destacadas até a próxima atualização).
      // O leitor de tela ouve só quantas chegaram, e não a conversa inteira de novo.
      const novas = mensagens.filter((m) => m.remetente !== "ambulante" && !m.lida).length;
      if (novas) mostrarAviso(novas > 1 ? `${novas} mensagens novas.` : "1 mensagem nova.");
      if (novas) {
        chamarApi("/mensagens/lidas", { metodo: "PATCH" }).then(atualizarNaoLidas).catch(() => {});
      }
    } catch (erro) {
      if (erro.status === 401) return; // api.js já levou para o login
      if (primeiraCarga) mostrarErroCarga(lista, erro, () => carregarMensagens());
      else mostrarAviso("Não foi possível atualizar a conversa. " + erro.message);
    }
  }

  /* ---------- Escrever ---------- */
  // Sem assunto escolhido, usa o começo do texto (a API pede um assunto de até 120 caracteres)
  function assuntoDaMensagem(texto) {
    const escolhido = form.querySelector('input[name="assunto"]:checked')?.value;
    if (escolhido) return escolhido;
    const linha = texto.split("\n")[0].trim();
    return linha.length > 60 ? linha.slice(0, 57).trimEnd() + "..." : linha;
  }

  async function enviar(e) {
    e.preventDefault();
    const texto = campoTexto.value.trim();
    if (!texto) {
      mostrarErro("Escreva a mensagem antes de enviar.");
      return campoTexto.focus();
    }

    btnEnviar.disabled = true; // evita clique duplo
    btnEnviar.classList.add("carregando");
    btnEnviar.textContent = "Enviando...";
    try {
      await chamarApi("/mensagens", { metodo: "POST", corpo: { assunto: assuntoDaMensagem(texto), texto } });
      form.reset();
      atualizarContador();
      mostrarAviso("Mensagem enviada para a prefeitura.");
      await carregarMensagens();
    } catch (erro) {
      if (erro.status === 401) return; // api.js já levou para o login
      // O texto continua no campo: é só tentar de novo
      const detalhe = erro.campos?.texto || erro.campos?.assunto || erro.message;
      mostrarErro(`${detalhe} Sua mensagem continua escrita; tente enviar de novo.`);
    } finally {
      btnEnviar.disabled = false;
      btnEnviar.classList.remove("carregando");
      btnEnviar.innerHTML = `${icone("enviar")}Enviar mensagem`;
    }
  }

  function atualizarContador() {
    const n = campoTexto.value.length;
    porId("contaTexto").textContent = `${n} de 1000 caracteres`;
  }

  /* ---------- Início ---------- */
  form.addEventListener("submit", enviar);
  campoTexto.addEventListener("input", () => { mostrarErro(""); atualizarContador(); });
  porId("btnAtualizar").addEventListener("click", () => carregarMensagens());

  carregarMensagens();

  // Se a prefeitura respondeu enquanto a aba ficou aberta, a mensagem aparece ao voltar para ela
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { carregarMensagens({ rolar: false }); atualizarNaoLidas(); }
  });
})();
