/* Ambulante Conecta — painel do gestor (RF06, RF07 e RF05), ligado à API.
   Depende de js/api.js e js/app.js (carregue-os antes). Os números do topo vêm de renderResumo() (app.js).
   Rotas: GET /solicitacoes?status=Pendente · PATCH /solicitacoes/:id
          GET /mensagens/conversas · GET /mensagens?ambulante_id= · PATCH /mensagens/lidas · POST /mensagens */

(function () {
  // A proteção da página (data-exige-login) está em app.js. Aqui só evitamos rodar sem sessão de gestor.
  if (!Sessao.token() || perfilAtual() !== "gestor") return;

  const porId = (id) => document.getElementById(id);
  const listaPendentes = porId("listaPendentes");
  const listaConversas = porId("listaConversas");
  const painelConversa = porId("conversa");
  const conversaMensagens = porId("conversaMensagens");
  const formResposta = porId("formResposta");
  const btnResponder = porId("btnResponder");

  const dlgAprovar = porId("dlgAprovar");
  const dlgRecusar = porId("dlgRecusar");
  const formRecusar = porId("formRecusar");
  const campoJustificativa = porId("justificativa");

  let pendentes = [];        // última lista carregada
  let pedidoAtual = null;    // pedido aberto em um dos diálogos
  let conversaAtual = null;  // { id, nome } do ambulante selecionado

  const formatarData = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  function mostrarErro(campo, msg) {
    porId("erro-" + campo).textContent = msg;
    const el = porId(campo);
    if (!el) return;
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    el.classList.toggle("invalido", !!msg);
  }

  // Estado de erro com botão "Tentar de novo", igual ao das outras páginas
  function mostrarFalha(container, erro, tentar) {
    container.innerHTML = `<div class="vazio estado-erro" role="alert"><p>${escHtml(erro.message)}</p>
      <div class="btn-row"><button type="button" class="btn btn-ghost">Tentar de novo</button></div></div>`;
    container.querySelector("button").addEventListener("click", tentar);
  }

  const descreverPonto = (s) => (s.ponto || "Ponto " + s.ponto_id) + (s.bairro ? " — " + s.bairro : "");

  /* ---------- Solicitações pendentes ---------- */
  // Desktop: tabela. Celular: a mesma tabela vira cartões pelo CSS (data-label em cada célula).
  function criarLinha(s, concorrentes) {
    const disputa = concorrentes > 1
      ? `<span class="status orange">${concorrentes} pedidos para este ponto</span>` : "";
    return `<tr>
      <td data-label="Pedido nº"><div>${Number(s.id)}</div></td>
      <td data-label="Ambulante"><div><strong>${escHtml(s.ambulante)}</strong><br><span class="muted">CPF ${escHtml(s.ambulante_cpf)}${s.ambulante_turno ? " · " + escHtml(s.ambulante_turno) : ""}</span></div></td>
      <td data-label="Ponto"><div>${escHtml(s.ponto || "Ponto " + s.ponto_id)}${s.bairro ? `<br><span class="muted">${escHtml(s.bairro)}</span>` : ""}${disputa ? "<br>" + disputa : ""}</div></td>
      <td data-label="Solicitado em"><div>${formatarData(s.data_solicitacao)}</div></td>
      <td class="acoes">
        <button type="button" class="btn btn-primary btn-sm" data-acao="aprovar" data-id="${Number(s.id)}">Aprovar</button>
        <button type="button" class="btn btn-ghost btn-sm" data-acao="recusar" data-id="${Number(s.id)}">Recusar</button>
      </td>
    </tr>`;
  }

  async function carregarPendentes() {
    try {
      pendentes = await chamarApi("/solicitacoes?status=Pendente");
      if (!pendentes.length) {
        listaPendentes.innerHTML = '<p class="vazio">Nenhuma solicitação pendente. Quando um ambulante pedir um ponto, o pedido aparece aqui.</p>';
        return;
      }
      const porPonto = {};
      pendentes.forEach((s) => (porPonto[s.ponto_id] = (porPonto[s.ponto_id] || 0) + 1));
      listaPendentes.innerHTML = `<div class="card tabela-card"><table class="tabela">
        <caption class="muted-note">${pendentes.length} ${pendentes.length > 1 ? "pedidos aguardando" : "pedido aguardando"} decisão</caption>
        <thead><tr><th scope="col">Nº</th><th scope="col">Ambulante</th><th scope="col">Ponto</th><th scope="col">Solicitado em</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
        <tbody>${pendentes.map((s) => criarLinha(s, porPonto[s.ponto_id])).join("")}</tbody>
      </table></div>`;
    } catch (erro) {
      if (erro.status === 401) return; // api.js já levou para o login
      mostrarFalha(listaPendentes, erro, () => {
        listaPendentes.innerHTML = '<p class="vazio">Carregando solicitações...</p>';
        carregarPendentes();
      });
    }
  }

  // Depois de uma decisão: lista, números do topo e contador do menu
  function recarregarTudo() {
    carregarPendentes();
    renderResumo();
    atualizarNaoLidas();
  }

  function abrirAprovar(s) {
    pedidoAtual = s;
    const outros = pendentes.filter((p) => p.ponto_id === s.ponto_id && p.id !== s.id).length;
    porId("aprovarResumo").textContent = `Pedido nº ${s.id} de ${s.ambulante} para ${descreverPonto(s)}.`;
    porId("aprovarAvisoTexto").textContent = outros
      ? `${outros} ${outros > 1 ? "outros pedidos pendentes" : "outro pedido pendente"} para este ponto ${outros > 1 ? "serão recusados" : "será recusado"} automaticamente com a justificativa "Ponto concedido a outro solicitante."`
      : "O ponto passa a ficar ocupado e some da lista de pontos disponíveis.";
    mostrarErro("aprovar", "");
    dlgAprovar.showModal();
  }

  function abrirRecusar(s) {
    pedidoAtual = s;
    porId("recusarResumo").textContent = `Pedido nº ${s.id} de ${s.ambulante} para ${descreverPonto(s)}.`;
    formRecusar.reset();
    porId("contaJustificativa").textContent = "0";
    mostrarErro("justificativa", "");
    dlgRecusar.showModal();
    campoJustificativa.focus();
  }

  // Envia a decisão. Devolve true só se a API aceitou (aí o diálogo fecha).
  async function decidir(status, justificativa, botao, campoErro) {
    const textoBotao = botao.textContent;
    botao.disabled = true; // evita clique duplo
    botao.textContent = "Enviando...";
    try {
      await chamarApi(`/solicitacoes/${Number(pedidoAtual.id)}`, { metodo: "PATCH", corpo: { status, justificativa } });
      mostrarAviso(status === "Aprovada" ? "Pedido aprovado. O aviso foi enviado em Mensagens." : "Pedido recusado. O aviso foi enviado em Mensagens.");
      recarregarTudo();
      return true;
    } catch (erro) {
      if (erro.status === 401) return true;      // api.js já levou para o login
      if (erro.status === 409 || erro.status === 404) {
        // Já foi avaliada (por outro gestor ou pela recusa automática) ou o ponto não está mais livre.
        // O aviso fica no próprio diálogo, em vermelho, e só sobra o botão "Fechar".
        porId("erro-" + campoErro).textContent = `${erro.message} Nada foi alterado. A lista foi atualizada.`;
        botao.hidden = true;
        botao.closest("dialog").querySelector("[data-fechar]").textContent = "Fechar";
        recarregarTudo();
        return false;
      }
      mostrarErro(campoErro, erro.message);       // 400 da justificativa, falta de conexão etc.
      return false;
    } finally {
      botao.textContent = textoBotao;
      botao.disabled = false;
    }
  }

  // Ao fechar um diálogo, volta os botões ao normal (depois de um 409 eles mudam)
  [dlgAprovar, dlgRecusar].forEach((dlg) => dlg.addEventListener("close", () => {
    dlg.querySelector("button[type=submit]").hidden = false;
    dlg.querySelector("[data-fechar]").textContent = "Cancelar";
  }));

  porId("formAprovar").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (await decidir("Aprovada", "", porId("btnConfirmarAprovar"), "aprovar")) dlgAprovar.close();
  });

  formRecusar.addEventListener("submit", async (e) => {
    e.preventDefault();
    const justificativa = campoJustificativa.value.trim();
    if (justificativa.length < 5) {                // RN04: a API também valida
      mostrarErro("justificativa", "Escreva o motivo da recusa (mínimo de 5 caracteres).");
      return campoJustificativa.focus();
    }
    if (await decidir("Recusada", justificativa, porId("btnConfirmarRecusar"), "justificativa")) dlgRecusar.close();
  });

  campoJustificativa.addEventListener("input", () => {
    porId("contaJustificativa").textContent = campoJustificativa.value.length;
    mostrarErro("justificativa", "");
  });

  document.querySelectorAll("dialog [data-fechar]").forEach((b) =>
    b.addEventListener("click", () => b.closest("dialog").close()));

  listaPendentes.addEventListener("click", (e) => {
    const botao = e.target.closest("button[data-acao]");
    if (!botao) return;
    const s = pendentes.find((p) => p.id === Number(botao.dataset.id));
    if (!s) return;
    if (botao.dataset.acao === "aprovar") abrirAprovar(s); else abrirRecusar(s);
  });

  /* ---------- Mensagens ---------- */
  async function carregarConversas() {
    try {
      const conversas = await chamarApi("/mensagens/conversas");
      if (!conversas.length) {
        listaConversas.innerHTML = '<p class="vazio">Nenhum ambulante escreveu ainda.</p>';
        return;
      }
      listaConversas.innerHTML = `<ul class="conversa-lista">${conversas.map((c) => `<li>
        <button type="button" class="conversa-item" data-id="${Number(c.ambulante_id)}" data-nome="${escHtml(c.ambulante)}"
          ${conversaAtual?.id === Number(c.ambulante_id) ? 'aria-current="true"' : ""}>
          <strong>${escHtml(c.ambulante)}</strong>
          ${c.nao_lidas ? `<span class="status red">${Number(c.nao_lidas)} ${c.nao_lidas > 1 ? "novas" : "nova"}</span>` : "<span></span>"}
          <span class="muted">Última: ${formatarData(c.ultima_em)}</span>
        </button></li>`).join("")}</ul>`;
    } catch (erro) {
      if (erro.status === 401) return;
      mostrarFalha(listaConversas, erro, () => {
        listaConversas.innerHTML = '<p class="vazio">Carregando conversas...</p>';
        carregarConversas();
      });
    }
  }

  const NOME_REMETENTE = { gestor: "Prefeitura", sistema: "Aviso automático" };

  function criarMensagem(m) {
    const nova = m.remetente === "ambulante" && !m.lida;
    const de = m.remetente === "ambulante" ? conversaAtual.nome : NOME_REMETENTE[m.remetente] || "Prefeitura";
    return `<details class="msg${nova ? " nova" : ""}" open>
      <summary><span class="msg-de">${escHtml(de)}${nova ? " · Nova" : ""}</span>
        <span class="msg-assunto">${escHtml(m.assunto)}</span>
        <time datetime="${escHtml(m.criado_em)}">${formatarData(m.criado_em)}</time></summary>
      <p>${escHtml(m.texto)}</p>
    </details>`;
  }

  async function abrirConversa(id, nome, { rolar = false } = {}) {
    const trocou = conversaAtual?.id !== id;
    conversaAtual = { id, nome };
    porId("t-conversa").textContent = "Conversa com " + nome;
    porId("conversaDica").hidden = true;
    listaConversas.querySelectorAll(".conversa-item").forEach((b) => {
      if (Number(b.dataset.id) === id) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
    if (trocou) {
      conversaMensagens.innerHTML = '<p class="vazio">Carregando mensagens...</p>';
      formResposta.reset();
      mostrarErro("resp-assunto", "");
      mostrarErro("resp-texto", "");
    }
    if (rolar) painelConversa.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const mensagens = await chamarApi(`/mensagens?ambulante_id=${id}&limite=100`);
      if (conversaAtual?.id !== id) return; // o gestor já trocou de conversa
      conversaMensagens.innerHTML = mensagens.length
        ? mensagens.map(criarMensagem).join("")
        : '<p class="vazio">Ainda não há mensagens nesta conversa.</p>';
      formResposta.hidden = false;

      // Sugere o assunto a partir da última mensagem do ambulante
      const ultima = mensagens.find((m) => m.remetente === "ambulante");
      if (ultima && !formResposta.assunto.value) {
        formResposta.assunto.value = (/^Re: /i.test(ultima.assunto) ? ultima.assunto : "Re: " + ultima.assunto).slice(0, 120);
      }

      // Abrir a conversa marca como lidas as mensagens do ambulante (elas continuam destacadas até recarregar)
      if (mensagens.some((m) => m.remetente === "ambulante" && !m.lida)) {
        await chamarApi("/mensagens/lidas", { metodo: "PATCH", corpo: { ambulante_id: id } });
        carregarConversas();
        atualizarNaoLidas();
        renderResumo();
      }
    } catch (erro) {
      if (erro.status === 401) return;
      mostrarFalha(conversaMensagens, erro, () => abrirConversa(id, nome));
    }
  }

  listaConversas.addEventListener("click", (e) => {
    const botao = e.target.closest(".conversa-item");
    if (botao) abrirConversa(Number(botao.dataset.id), botao.dataset.nome, { rolar: window.innerWidth < 1024 });
  });

  formResposta.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!conversaAtual) return;
    const assunto = formResposta.assunto.value.trim();
    const texto = formResposta.texto.value.trim();
    mostrarErro("resp-assunto", assunto ? "" : "Escreva o assunto.");
    mostrarErro("resp-texto", texto ? "" : "Escreva a resposta.");
    if (!assunto) return formResposta.assunto.focus();
    if (!texto) return formResposta.texto.focus();

    btnResponder.disabled = true; // evita clique duplo
    btnResponder.textContent = "Enviando...";
    try {
      await chamarApi("/mensagens", { metodo: "POST", corpo: { ambulante_id: conversaAtual.id, assunto, texto } });
      formResposta.texto.value = "";
      mostrarAviso("Resposta enviada para " + conversaAtual.nome + ".");
      await abrirConversa(conversaAtual.id, conversaAtual.nome);
      carregarConversas();
    } catch (erro) {
      if (erro.status === 401) return;
      if (erro.status === 400 && (erro.campos.assunto || erro.campos.texto)) {
        mostrarErro("resp-assunto", erro.campos.assunto || "");
        mostrarErro("resp-texto", erro.campos.texto || "");
      } else {
        mostrarErro("resp-texto", erro.message); // 404 (ambulante removido), limite de envios, sem conexão
      }
    } finally {
      btnResponder.textContent = "Enviar resposta";
      btnResponder.disabled = false;
    }
  });
  formResposta.assunto.addEventListener("input", () => mostrarErro("resp-assunto", ""));
  formResposta.texto.addEventListener("input", () => mostrarErro("resp-texto", ""));

  /* ---------- Início ---------- */
  carregarPendentes();
  carregarConversas().then(() => {
    // Veio pelo menu "Mensagens" (painel.html#mensagens): rola até a seção depois de carregar
    if (location.hash === "#mensagens") porId("mensagens").scrollIntoView({ block: "start" });
  });

  // Se chegaram pedidos ou mensagens enquanto a aba ficou aberta, aparecem ao voltar para ela
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || dlgAprovar.open || dlgRecusar.open) return;
    carregarPendentes();
    carregarConversas();
    if (conversaAtual) abrirConversa(conversaAtual.id, conversaAtual.nome);
  });
})();
