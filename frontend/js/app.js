/* Ambulante Conecta — código compartilhado: sessão, menu por perfil, topo e resumo da página inicial.
   Depende de js/api.js (carregue-o antes). O estado local (localStorage) ficou só para a Formalização,
   que ainda não tem API; cadastro, login, solicitações e mensagens usam a API. */

const CHAVE_ESTADO = "ambulante.estado";

const estadoPadrao = () => ({
  cadastro: false,
  perfil: null,
  formalizacao: { mei: false, licenca: false },
  docs: [],
  solicitacao: null
});

function lerEstado() {
  try { return { ...estadoPadrao(), ...JSON.parse(localStorage.getItem(CHAVE_ESTADO) || "{}") }; }
  catch (_) { return estadoPadrao(); }
}
function salvarEstado(e) {
  try { localStorage.setItem(CHAVE_ESTADO, JSON.stringify(e)); } catch (_) {}
}

/* ---------- Menu por perfil ---------- */
// Todos os itens possíveis. "movel" é o rótulo curto do menu inferior (celular).
const itensMenu = {
  index:           { href: "index.html",          icone: "⌂", texto: "Início",          movel: "Início" },
  mapa:            { href: "mapa.html",           icone: "⌖", texto: "Pontos de venda", movel: "Mapa" },
  formalizacao:    { href: "formalizacao.html",   icone: "✓", texto: "Formalização",    movel: "Formalização" },
  cadastro:        { href: "cadastro.html",       icone: "☷", texto: "Cadastro",        movel: "Cadastro" },
  situacao:        { href: "situacao.html",       icone: "◷", texto: "Solicitação",     movel: "Solicitação" },
  comunicacao:     { href: "comunicacao.html",    icone: "✉", texto: "Comunicação",     movel: "Mensagens", badge: true },
  painel:          { href: "painel.html",         icone: "▤", texto: "Painel",          movel: "Painel" },
  mensagensGestor: { href: "painel.html#mensagens", icone: "✉", texto: "Mensagens",      movel: "Mensagens", badge: true },
  login:           { href: "login.html",          icone: "⇥", texto: "Entrar",          movel: "Entrar" }
};

// Quais itens cada perfil vê (menu lateral e menu inferior)
const menusPorPerfil = {
  visitante: {
    lateral: ["index", "mapa", "formalizacao", "cadastro", "situacao", "comunicacao"],
    movel:   ["index", "mapa", "formalizacao", "comunicacao", "login"]
  },
  ambulante: {
    lateral: ["index", "mapa", "formalizacao", "situacao", "comunicacao"],
    movel:   ["index", "mapa", "formalizacao", "comunicacao", "situacao"]
  },
  gestor: {
    lateral: ["index", "painel", "mensagensGestor", "mapa"],
    movel:   ["index", "painel", "mensagensGestor", "mapa"]
  }
};

const perfilAtual = () => Sessao.usuario()?.perfil || "visitante";

const paginaAtual = (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "index";
let totalNaoLidas = 0; // vem da API quando há usuário logado

const escHtml = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Sessão e acesso às páginas ---------- */
// Para exigir login numa página: <body data-exige-login="ambulante"> (ou "gestor", ou "qualquer").
// "visitante" faz o contrário: a página é só para quem não entrou (ex.: cadastro).
// É só conveniência da tela: quem protege os dados de verdade é a API.
function protegerPagina() {
  const exigido = document.body.dataset.exigeLogin;
  if (!exigido) return true;
  const usuario = Sessao.usuario();
  if (exigido === "visitante") {
    if (usuario && Sessao.token()) { location.replace("index.html"); return false; }
    return true;
  }
  if (!usuario || !Sessao.token()) {
    // Leva junto o ponto escolhido no mapa (situacao.html?ponto=5#nova), para não se perder no login
    location.replace("login.html?voltar=" + encodeURIComponent(paginaAtual + ".html" + location.search + location.hash));
    return false;
  }
  if (exigido !== "qualquer" && usuario.perfil !== exigido) {
    location.replace("index.html");
    return false;
  }
  return true;
}

// Logout: apaga a sessão e os dados pessoais guardados no navegador
function sairDaConta() {
  Sessao.limpar();
  try { localStorage.removeItem(CHAVE_ESTADO); localStorage.removeItem("ambulante.cadastro.rascunho"); } catch (_) {}
  location.href = "index.html";
}

async function atualizarNaoLidas() {
  if (!Sessao.token()) return;
  try { totalNaoLidas = (await chamarApi("/mensagens/nao-lidas")).total; renderMenu(); } catch (_) {}
}

/* ---------- Topo e menus ---------- */
function renderTopo() {
  const topo = document.querySelector(".topbar");
  if (!topo) return;
  topo.querySelector(".topbar-user")?.remove();
  const usuario = Sessao.usuario();
  const caixa = document.createElement("div");
  caixa.className = "topbar-user";
  caixa.innerHTML = usuario
    ? `<span class="topbar-nome">${escHtml(usuario.nome)}</span><button type="button" class="btn btn-ghost btn-sm" id="btnSair">Sair</button>`
    : `<a class="btn btn-primary btn-sm" href="login.html">Entrar</a>`;
  topo.appendChild(caixa);
  document.getElementById("btnSair")?.addEventListener("click", sairDaConta);
}

function renderMenu() {
  const nav = document.getElementById("nav");
  const movel = document.getElementById("mobileNav");
  const perfil = perfilAtual();
  const { lateral, movel: idsMovel } = menusPorPerfil[perfil] || menusPorPerfil.visitante;
  const atual = (href) => (href.replace(".html", "").split("#")[0] === paginaAtual && !href.includes("#") ? ' aria-current="page"' : "");

  if (nav) {
    nav.innerHTML = lateral.map((id) => {
      const m = itensMenu[id];
      const badge = m.badge && totalNaoLidas ? `<span class="badge" aria-label="${totalNaoLidas} mensagens novas">${totalNaoLidas}</span>` : "";
      return `<a href="${m.href}"${atual(m.href)}><span class="nav-ico" aria-hidden="true">${m.icone}</span>${m.texto}${badge}</a>`;
    }).join("");
  }
  if (movel) {
    movel.innerHTML = idsMovel.map((id) => {
      const m = itensMenu[id];
      return `<a href="${m.href}"${atual(m.href)}><span aria-hidden="true">${m.icone}</span>${m.movel}</a>`;
    }).join("");
  }
}

/* ---------- Resumo da página inicial ---------- */
async function renderResumo() {
  const lista = document.getElementById("stats");
  if (!lista) return;
  const usuario = Sessao.usuario();
  const etapas = Object.values(lerEstado().formalizacao).filter(Boolean).length;
  const formalizacao = { rotulo: "Formalização", valor: etapas ? `${etapas} de 2` : "Não iniciada",
    status: etapas === 2 ? "Concluída" : etapas ? "Em andamento" : "Veja os passos",
    cor: etapas === 2 ? "green" : etapas ? "blue" : "gray", icone: "↗", href: "formalizacao.html" };

  let cards;
  if (!usuario) {
    cards = [
      { rotulo: "Cadastro", valor: "Não iniciado", status: "Comece por aqui", cor: "blue", icone: "☷", href: "cadastro.html" },
      formalizacao,
      { rotulo: "Solicitação", valor: "Entre para ver", status: "Faça login", cor: "gray", icone: "◷", href: "login.html?voltar=situacao.html" },
      { rotulo: "Mensagens", valor: "Entre para ver", status: "Faça login", cor: "gray", icone: "✉", href: "login.html?voltar=comunicacao.html" }
    ];
  } else if (usuario.perfil === "gestor") {
    let p = null;
    try { p = await chamarApi("/painel"); } catch (_) {}
    const n = (valor) => (p ? valor : "—");
    cards = [
      { rotulo: "Solicitações pendentes", valor: n(p?.solicitacoes.pendentes), status: "Aguardando decisão", cor: p?.solicitacoes.pendentes ? "orange" : "gray", icone: "◷", href: "painel.html#pendentes" },
      { rotulo: "Pontos disponíveis", valor: n(p?.pontos.disponiveis), status: "Para novas solicitações", cor: "green", icone: "⌖", href: "mapa.html" },
      { rotulo: "Ambulantes", valor: n(p?.ambulantes.total), status: p ? `${p.ambulantes.com_mei} com MEI` : "", cor: "blue", icone: "☷" },
      { rotulo: "Mensagens", valor: n(p?.mensagens_nao_lidas), status: "Não lidas", cor: p?.mensagens_nao_lidas ? "red" : "gray", icone: "✉", href: "painel.html#mensagens" }
    ];
  } else {
    let minhas = [];
    try { minhas = await chamarApi("/solicitacoes/minhas"); } catch (_) {}
    const ultima = minhas[0];
    const corStatus = { Pendente: "orange", Aprovada: "green", Recusada: "red" };
    cards = [
      { rotulo: "Cadastro", valor: "Concluído", status: "Tudo certo", cor: "green", icone: "✓" },
      formalizacao,
      { rotulo: "Solicitação", valor: ultima ? ultima.status : "Nenhuma", status: ultima ? "Última solicitação" : "Faça seu pedido",
        cor: ultima ? corStatus[ultima.status] || "blue" : "gray", icone: "◷", href: "situacao.html" },
      { rotulo: "Mensagens", valor: totalNaoLidas ? `${totalNaoLidas} ${totalNaoLidas > 1 ? "novas" : "nova"}` : "Nenhuma nova",
        status: totalNaoLidas ? "Leia agora" : "Tudo em dia", cor: totalNaoLidas ? "red" : "gray", icone: "✉", href: "comunicacao.html" }
    ];
  }

  lista.innerHTML = cards.map((s) => {
    const miolo = `<span class="stat-top"><span>${s.rotulo}</span><span class="icon-circle ${s.cor}" aria-hidden="true">${s.icone}</span></span>
      <span class="stat-number">${escHtml(s.valor)}</span><span class="status ${s.cor}">${escHtml(s.status)}</span>`;
    return `<li>${s.href ? `<a class="card stat-link" href="${s.href}">${miolo}</a>` : `<div class="card stat-link">${miolo}</div>`}</li>`;
  }).join("");

  // Ajustes da página inicial conforme o perfil
  if (usuario) document.querySelector('.hero-actions a[href="cadastro.html"]')?.setAttribute("hidden", "");
  if (usuario?.perfil === "gestor") {
    document.querySelector(".hero-actions")?.setAttribute("hidden", "");              // botões de ambulante
    document.querySelector('[aria-labelledby="t-acoes"]')?.setAttribute("hidden", ""); // ações rápidas de ambulante
  }
}

function mostrarAviso(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(mostrarAviso.timer);
  mostrarAviso.timer = setTimeout(() => (t.style.display = "none"), 2800);
}

if (protegerPagina()) {
  renderTopo();
  renderMenu();
  atualizarNaoLidas().then(renderResumo);
}
