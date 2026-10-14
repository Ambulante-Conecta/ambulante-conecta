/* Ambulante Conecta — pedido de ponto de venda (RF04), ligado à API.
   Depende de js/api.js, js/icones.js e js/app.js (carregue-os antes).
   Rotas: GET /pontos?status=disponivel · POST /solicitacoes · GET /solicitacoes/minhas
   Heurísticas: situação em linha do tempo (1), "Em análise" em vez de "Pendente" (2), pontos em cartões para
   reconhecer em vez de lembrar (6), pontos já pedidos ficam bloqueados (5), erro do MEI com o caminho para resolver (9). */

(function () {
  // A proteção da página (data-exige-login) está em app.js. Aqui só evitamos rodar sem sessão de ambulante.
  if (!Sessao.token() || perfilAtual() !== "ambulante") return;

  const porId = (id) => document.getElementById(id);
  const form = porId("formSolicitacao");
  const listaPontos = porId("listaPontos");
  const btnEnviar = porId("btnEnviar");
  const erroPonto = porId("erro-ponto");
  const avisoMei = porId("avisoMei");
  const listaMinhas = porId("minhas");
  const escolhaAtual = porId("escolhaAtual");

  // Palavras da API -> palavras de quem usa
  const STATUS = {
    Pendente: { texto: "Em análise", cor: "orange" },
    Aprovada: { texto: "Aprovado", cor: "green" },
    Recusada: { texto: "Recusado", cor: "red" }
  };

  let pontos = [];
  let minhas = [];
  let preferido = new URLSearchParams(location.search).get("ponto"); // vem do mapa: situacao.html?ponto=5#nova

  const formatarData = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };
  // Lê o ponto marcado de verdade (com um só ponto, form.elements.ponto.value viria preenchido mesmo sem marcar)
  const pontoEscolhido = () => form.querySelector('input[name="ponto"]:checked')?.value || "";
  const nomePonto = (p) => p.descricao_local || p.ponto || "Ponto " + (p.id ?? p.ponto_id);

  function mostrarErroPonto(msg) {
    erroPonto.textContent = msg;
    listaPontos.querySelectorAll("input").forEach((r) => r.setAttribute("aria-invalid", msg ? "true" : "false"));
  }

  /* ---------- Meus pedidos: cartão com linha do tempo ---------- */
  function linhaDoTempo(s) {
    const decidido = s.status !== "Pendente";
    const aprovado = s.status === "Aprovada";
    const passo = (classe, ic, titulo, detalhe) =>
      `<li class="${classe}"><span class="lt-marca">${icone(ic)}</span><div><strong>${titulo}</strong>${detalhe ? `<span class="muted">${detalhe}</span>` : ""}</div></li>`;
    return `<ol class="linha-tempo" aria-label="Andamento do pedido">
      ${passo("feito", "check", "Pedido enviado", formatarData(s.data_solicitacao))}
      ${passo(decidido ? "feito" : "atual", decidido ? "check" : "relogio", "Análise da prefeitura", decidido ? "" : "Aguardando a decisão do gestor")}
      ${decidido
        ? passo(aprovado ? "feito aprovado" : "feito recusado", aprovado ? "check" : "fechar", aprovado ? "Pedido aprovado" : "Pedido recusado", formatarData(s.data_avaliacao))
        : passo("futuro", "mais", "Resposta", "Você recebe um aviso em Mensagens")}
    </ol>`;
  }

  function criarCartao(s) {
    const st = STATUS[s.status] || { texto: s.status, cor: "gray" };
    let rodape = "";
    if (s.status === "Aprovada") {
      rodape = `<div class="notice notice-ok"><div><strong>Este ponto agora é seu.</strong>
        <p>Ele aparece como ocupado no mapa.</p></div></div>`;
    } else if (s.status === "Recusada") {
      rodape = `<div class="notice notice-recusa"><div><strong>Motivo da recusa</strong><p>${escHtml(s.justificativa || "Não informado.")}</p>
        <div class="btn-row"><a class="btn btn-ghost btn-sm" href="#nova">${icone("mais")}Pedir outro ponto</a></div></div></div>`;
    }
    return `<article class="card solic-card" aria-labelledby="ped-${Number(s.id)}">
      <div class="solic-top">
        <div><h3 id="ped-${Number(s.id)}">${escHtml(nomePonto(s))}</h3>
          <p class="muted">${s.bairro ? escHtml(s.bairro) + " · " : ""}Pedido nº ${Number(s.id)}</p></div>
        <span class="status ${st.cor}">${escHtml(st.texto)}</span>
      </div>
      ${linhaDoTempo(s)}
      ${rodape}
    </article>`;
  }

  async function carregarMinhas() {
    // O esqueleto só aparece na primeira vez; nas atualizações a lista atual fica na tela até chegar a nova
    if (!listaMinhas.children.length) mostrarCarregando(listaMinhas, 1, "Carregando seus pedidos...");
    try {
      minhas = await chamarApi("/solicitacoes/minhas");
      listaMinhas.removeAttribute("aria-busy");
      listaMinhas.innerHTML = minhas.length
        ? minhas.map(criarCartao).join("")
        : `<div class="vazio vazio-convite">${icone("pedido")}<div><strong>Você ainda não fez nenhum pedido.</strong>
            <p>Escolha um ponto livre logo abaixo. A resposta da prefeitura aparece aqui.</p></div></div>`;
      desenharPontos(); // marca os pontos que já têm pedido em análise
    } catch (erro) {
      if (erro.status === 401) return; // api.js já levou para o login
      mostrarErroCarga(listaMinhas, erro, carregarMinhas);
    }
  }

  /* ---------- Pontos livres: cartões de opção ---------- */
  const emAnalise = (id) => minhas.some((s) => s.ponto_id === id && s.status === "Pendente");

  function desenharPontos() {
    if (!pontos.length) return;
    const escolhido = pontoEscolhido() || preferido;
    listaPontos.innerHTML = pontos.map((p) => {
      const bloqueado = emAnalise(p.id);
      return `<label class="opcao-card${bloqueado ? " bloqueada" : ""}">
        <input type="radio" name="ponto" value="${p.id}" ${bloqueado ? "disabled" : ""} ${!bloqueado && String(p.id) === String(escolhido) ? "checked" : ""}>
        <span class="opcao-texto"><strong>${escHtml(nomePonto(p))}</strong>
          <span class="muted">${p.bairro ? escHtml(p.bairro) : ""}${bloqueado ? (p.bairro ? " · " : "") + "você já pediu este ponto" : ""}</span></span>
        ${bloqueado ? '<span class="status orange">Em análise</span>' : ""}
      </label>`;
    }).join("");
    btnEnviar.disabled = !pontos.some((p) => !emAnalise(p.id));
    atualizarEscolha();
  }

  function atualizarEscolha() {
    const id = pontoEscolhido();
    const p = pontos.find((x) => String(x.id) === String(id));
    escolhaAtual.hidden = !p;
    if (p) escolhaAtual.innerHTML = `Você vai pedir: <strong>${escHtml(nomePonto(p))}</strong>${p.bairro ? ", " + escHtml(p.bairro) : ""}.`;
  }

  async function carregarPontos() {
    btnEnviar.disabled = true;
    mostrarErroPonto("");
    mostrarCarregando(listaPontos, 2, "Carregando os pontos livres...");
    try {
      const geo = await chamarApi("/pontos?status=disponivel");
      pontos = (geo.features || []).map((f) => ({ ...f.properties, id: Number(f.properties.id) }));
      listaPontos.removeAttribute("aria-busy");
      if (!pontos.length) {
        listaPontos.innerHTML = `<div class="vazio">Nenhum ponto livre agora. Os pontos são liberados pela prefeitura;
          veja o <a href="mapa.html">mapa</a> ou volte mais tarde.</div>`;
        return;
      }
      desenharPontos();
      if (preferido && location.hash === "#nova") porId("nova").scrollIntoView({ block: "start" });
    } catch (erro) {
      if (erro.status === 401) return;
      mostrarErroCarga(listaPontos, erro, carregarPontos);
    }
  }

  /* ---------- Enviar pedido ---------- */
  async function enviar(e) {
    e.preventDefault();
    avisoMei.hidden = true;
    mostrarErroPonto("");

    const id = pontoEscolhido();
    if (!id) {
      mostrarErroPonto("Escolha um dos pontos da lista antes de enviar.");
      return listaPontos.querySelector("input:not(:disabled)")?.focus();
    }

    btnEnviar.disabled = true; // evita clique duplo
    btnEnviar.classList.add("carregando");
    btnEnviar.textContent = "Enviando pedido...";
    try {
      await chamarApi("/solicitacoes", { metodo: "POST", corpo: { ponto_id: Number(id) } });
      mostrarAviso("Pedido enviado! Agora é aguardar a análise da prefeitura.");
      preferido = null;
      await Promise.all([carregarMinhas(), carregarPontos()]);
      atualizarNaoLidas(); // a RN03 criou um aviso em Mensagens: atualiza o contador do menu
      listaMinhas.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (erro) {
      if (erro.status === 401) return;              // api.js já levou para o login
      if (erro.status === 422) {                    // RN02: sem MEI
        avisoMei.hidden = false;
        avisoMei.focus();
        avisoMei.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (erro.status === 409) {             // ponto ocupado agora ou pedido repetido
        await Promise.all([carregarMinhas(), carregarPontos()]);
        mostrarErroPonto(erro.message + " A lista foi atualizada; escolha outro ponto.");
      } else {
        mostrarErroPonto(erro.message);             // sem internet, servidor lento etc.
      }
    } finally {
      btnEnviar.classList.remove("carregando");
      btnEnviar.innerHTML = `${icone("enviar")}Enviar pedido`;
      btnEnviar.disabled = !pontos.some((p) => !emAnalise(p.id));
    }
  }

  /* ---------- Início ---------- */
  form.addEventListener("submit", enviar);
  form.addEventListener("change", () => { mostrarErroPonto(""); atualizarEscolha(); });
  porId("btnAtualizar").addEventListener("click", () => { carregarMinhas(); carregarPontos(); });

  carregarMinhas();
  carregarPontos();

  // Se o gestor decidiu enquanto a aba ficou aberta, a resposta aparece ao voltar para ela
  document.addEventListener("visibilitychange", () => { if (!document.hidden) carregarMinhas(); });
})();
