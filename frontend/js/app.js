/* Ambulante Conecta — código compartilhado: sessão, menu por perfil, topo e resumo da página inicial.
   Depende de js/api.js e js/icones.js (carregue-os antes). O estado local (localStorage) ficou só para a licença municipal
   e os documentos da Formalização; o MEI, o cadastro, o login, as solicitações e as mensagens usam a API. */

const CHAVE_ESTADO = "ambulante.estado";

const estadoPadrao = () => ({
  cadastro: false,
  perfil: null,
  formalizacao: { mei: false, licenca: false },
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
// Todos os itens possíveis. "movel" é o rótulo curto do menu inferior (celular); "icone" é um nome de js/icones.js.
const itensMenu = {
  index:           { href: "index.html",            icone: "casa",     texto: "Início",          movel: "Início" },
  mapa:            { href: "mapa.html",             icone: "mapa",     texto: "Pontos de venda", movel: "Mapa" },
  formalizacao:    { href: "formalizacao.html",     icone: "selo",     texto: "Formalização",    movel: "MEI" },
  cadastro:        { href: "cadastro.html",         icone: "ficha",    texto: "Cadastro",        movel: "Cadastro" },
  situacao:        { href: "situacao.html",         icone: "pedido",   texto: "Meu pedido",      movel: "Pedido" },
  comunicacao:     { href: "comunicacao.html",      icone: "mensagem", texto: "Mensagens",       movel: "Mensagens", badge: true },
  painel:          { href: "painel.html",           icone: "painel",   texto: "Painel",          movel: "Painel" },
  mensagensGestor: { href: "painel.html#mensagens", icone: "mensagem", texto: "Mensagens",       movel: "Mensagens", badge: true },
  login:           { href: "login.html",            icone: "entrar",   texto: "Entrar",          movel: "Entrar" }
};

// topo:    menu horizontal do computador (no máximo 5 itens, para caber a partir de 1024 px)
// lateral: gaveta aberta pelo botão "Menu" no celular (lista completa)
// movel:   3 atalhos do menu inferior do celular; o 4º botão é sempre "Menu"
const menusPorPerfil = {
  visitante: {
    topo:    ["index", "mapa", "formalizacao", "cadastro"],
    lateral: ["index", "mapa", "formalizacao", "cadastro", "situacao", "comunicacao"],
    movel:   ["index", "mapa", "login"]
  },
  ambulante: {
    topo:    ["index", "situacao", "comunicacao", "formalizacao", "mapa"],
    lateral: ["index", "situacao", "comunicacao", "formalizacao", "mapa"],
    movel:   ["index", "situacao", "comunicacao"]
  },
  gestor: {
    topo:    ["index", "painel", "mensagensGestor", "mapa"],
    lateral: ["index", "painel", "mensagensGestor", "mapa"],
    movel:   ["index", "painel", "mensagensGestor"]
  }
};

const perfilAtual = () => Sessao.usuario()?.perfil || "visitante";

const paginaAtual = (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "index";
let totalNaoLidas = 0; // vem da API quando há usuário logado

// Link para o login que volta para a página atual depois de entrar (no início, no login e no cadastro não precisa)
const linkLogin = () => ["index", "login", "cadastro"].includes(paginaAtual)
  ? "login.html"
  : "login.html?voltar=" + encodeURIComponent(paginaAtual + ".html");

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
    ? `<span class="topbar-nome">${escHtml(usuario.nome)}</span><button type="button" class="btn btn-ghost btn-sm" id="btnSair">${icone("sair")}Sair</button>`
    : `<a class="btn btn-primary btn-sm" href="${linkLogin()}">${icone("entrar")}Entrar</a>`;
  topo.appendChild(caixa);
  document.getElementById("btnSair")?.addEventListener("click", sairDaConta);
}

function renderMenu() {
  const nav = document.getElementById("nav");
  const movel = document.getElementById("mobileNav");
  const perfil = perfilAtual();
  const { topo, lateral, movel: idsMovel } = menusPorPerfil[perfil] || menusPorPerfil.visitante;
  // Item atual: mesma página e, se o item tem âncora (painel.html#mensagens), a mesma âncora do endereço.
  // Na página do painel, "Mensagens" fica selecionado com #mensagens e "Painel" no resto.
  const atual = (href) => {
    const [arquivo, ancora] = href.split("#");
    if (arquivo.replace(".html", "") !== paginaAtual) return "";
    const ancoraAtual = location.hash.slice(1);
    if (ancora) return ancora === ancoraAtual ? ' aria-current="page"' : "";
    const outroItemComAncora = Object.values(itensMenu).some((m) => ancoraAtual && m.href === `${arquivo}#${ancoraAtual}`);
    return outroItemComAncora ? "" : ' aria-current="page"';
  };
  const badge = (m) => (m.badge && totalNaoLidas
    ? `<span class="badge"><span aria-hidden="true">${totalNaoLidas}</span><span class="sr-only">, ${totalNaoLidas} ${totalNaoLidas > 1 ? "mensagens novas" : "mensagem nova"}</span></span>`
    : "");

  // Menu horizontal no topo (computador): entre a marca e o botão Entrar/Sair
  const barra = document.querySelector(".topbar");
  if (barra) {
    let navTopo = document.getElementById("navTopo");
    if (!navTopo) {
      navTopo = document.createElement("nav");
      navTopo.id = "navTopo";
      navTopo.className = "nav-topo";
      navTopo.setAttribute("aria-label", "Principal");
      barra.insertBefore(navTopo, barra.querySelector(".topbar-user"));
    }
    navTopo.innerHTML = topo.map((id) => {
      const m = itensMenu[id];
      return `<a href="${m.href}"${atual(m.href)}>${m.texto}${badge(m)}</a>`;
    }).join("");
  }

  if (nav) {
    nav.innerHTML = lateral.map((id) => {
      const m = itensMenu[id];
      return `<a href="${m.href}"${atual(m.href)}><span class="nav-ico">${icone(m.icone)}</span>${m.texto}${badge(m)}</a>`;
    }).join("");
  }
  if (movel) {
    const aberto = document.querySelector(".sidebar")?.classList.contains("aberta");
    movel.innerHTML = idsMovel.map((id) => {
      const m = itensMenu[id];
      const href = id === "login" ? linkLogin() : m.href;
      return `<a href="${href}"${atual(m.href)}>${icone(m.icone)}<span>${m.movel}</span>${badge(m)}</a>`;
    }).join("") + `<button type="button" id="btnMenu" aria-controls="menuLateral" aria-expanded="${aberto ? "true" : "false"}">${icone(aberto ? "fechar" : "menu")}<span>Menu</span></button>`;
    document.getElementById("btnMenu").addEventListener("click", () => abrirGaveta(!document.querySelector(".sidebar").classList.contains("aberta")));
  }
}

/* ---------- Gaveta do celular: o menu lateral desliza por cima da tela ---------- */
function abrirGaveta(abrir) {
  const lateral = document.querySelector(".sidebar");
  if (!lateral) return;
  let fundo = document.querySelector(".menu-fundo");
  if (!fundo) {
    fundo = document.createElement("div");
    fundo.className = "menu-fundo";
    fundo.addEventListener("click", () => abrirGaveta(false));
    document.body.appendChild(fundo);
  }
  lateral.classList.toggle("aberta", abrir);
  fundo.classList.toggle("aberto", abrir);
  const botao = document.getElementById("btnMenu");
  if (botao) {
    botao.setAttribute("aria-expanded", abrir ? "true" : "false");
    botao.querySelector("svg").outerHTML = icone(abrir ? "fechar" : "menu");
  }
  if (abrir) lateral.querySelector("a")?.focus();
  else if (document.activeElement && lateral.contains(document.activeElement)) botao?.focus();
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.querySelector(".sidebar.aberta")) abrirGaveta(false);
});
// Clicar num item com âncora na mesma página (ex.: Mensagens dentro do painel) só muda o #: atualiza o selecionado
window.addEventListener("hashchange", () => { renderMenu(); abrirGaveta(false); });

/* ---------- Componentes de estado reutilizáveis ---------- */
// Carregando: blocos "esqueleto" no lugar do conteúdo (o texto escondido é lido pelo leitor de tela)
function mostrarCarregando(container, blocos = 2, texto = "Carregando...") {
  container.setAttribute("aria-busy", "true");
  container.innerHTML = `<div class="esqueleto"><span class="sr-only">${escHtml(texto)}</span>` +
    '<div class="esqueleto-bloco" aria-hidden="true"></div>'.repeat(blocos) + "</div>";
}

// Erro ao carregar: explica o que houve e oferece "Tentar de novo". Se a internet voltar, tenta sozinho.
function mostrarErroCarga(container, erro, tentar) {
  container.removeAttribute("aria-busy");
  const semRede = erro.status === 0;
  const titulo = erro.tipo === "offline" ? "Sem internet" : semRede ? "Não conseguimos carregar" : "Algo deu errado";
  container.innerHTML = `<div class="vazio estado-erro" role="alert">
      <p><strong>${titulo}</strong><br>${escHtml(erro.message)}</p>
      <div class="btn-row"><button type="button" class="btn btn-ghost">${icone("recarregar")}Tentar de novo</button></div>
    </div>`;
  const repetir = () => { document.removeEventListener("conexao:voltou", repetir); tentar(); };
  container.querySelector("button").addEventListener("click", repetir);
  document.addEventListener("conexao:voltou", repetir);
}

/* ---------- Resumo da página inicial ---------- */
async function renderResumo() {
  const lista = document.getElementById("stats");
  if (!lista) return;
  const usuario = Sessao.usuario();
  const etapas = Object.values(lerEstado().formalizacao).filter(Boolean).length;
  const formalizacao = { rotulo: "Formalização", valor: etapas ? `${etapas} de 2` : "Não iniciada",
    status: etapas === 2 ? "Concluída" : etapas ? "Em andamento" : "Veja os passos",
    cor: etapas === 2 ? "green" : etapas ? "blue" : "gray", icone: "selo", href: "formalizacao.html" };

  let cards;
  if (!usuario) {
    cards = [
      { rotulo: "Cadastro", valor: "Não iniciado", status: "Comece por aqui", cor: "blue", icone: "ficha", href: "cadastro.html" },
      formalizacao,
      { rotulo: "Solicitação", valor: "Entre para ver", status: "Faça login", cor: "gray", icone: "pedido", href: "login.html?voltar=situacao.html" },
      { rotulo: "Mensagens", valor: "Entre para ver", status: "Faça login", cor: "gray", icone: "mensagem", href: "login.html?voltar=comunicacao.html" }
    ];
  } else if (usuario.perfil === "gestor") {
    let p = null;
    try { p = await chamarApi("/painel"); } catch (_) {}
    const n = (valor) => (p ? valor : "—");
    cards = [
      { rotulo: "Solicitações pendentes", valor: n(p?.solicitacoes.pendentes), status: "Aguardando decisão", cor: p?.solicitacoes.pendentes ? "orange" : "gray", icone: "relogio", href: "painel.html#pendentes" },
      { rotulo: "Pontos disponíveis", valor: n(p?.pontos.disponiveis), status: "Para novas solicitações", cor: "green", icone: "mapa", href: "mapa.html" },
      { rotulo: "Ambulantes", valor: n(p?.ambulantes.total), status: p ? `${p.ambulantes.com_mei} com MEI` : "", cor: "blue", icone: "usuario" },
      { rotulo: "Mensagens", valor: n(p?.mensagens_nao_lidas), status: "Não lidas", cor: p?.mensagens_nao_lidas ? "red" : "gray", icone: "mensagem", href: "painel.html#mensagens" }
    ];
  } else {
    let minhas = [];
    try { minhas = await chamarApi("/solicitacoes/minhas"); } catch (_) {}
    const ultima = minhas[0];
    const corStatus = { Pendente: "orange", Aprovada: "green", Recusada: "red" };
    cards = [
      { rotulo: "Cadastro", valor: "Concluído", status: "Tudo certo", cor: "green", icone: "check" },
      formalizacao,
      { rotulo: "Solicitação", valor: ultima ? ultima.status : "Nenhuma", status: ultima ? "Última solicitação" : "Faça seu pedido",
        cor: ultima ? corStatus[ultima.status] || "blue" : "gray", icone: "pedido", href: "situacao.html" },
      { rotulo: "Mensagens", valor: totalNaoLidas ? `${totalNaoLidas} ${totalNaoLidas > 1 ? "novas" : "nova"}` : "Nenhuma nova",
        status: totalNaoLidas ? "Leia agora" : "Tudo em dia", cor: totalNaoLidas ? "red" : "gray", icone: "mensagem", href: "comunicacao.html" }
    ];
  }

  lista.innerHTML = cards.map((s) => {
    const miolo = `<span class="stat-top"><span>${s.rotulo}</span><span class="icon-circle">${icone(s.icone)}</span></span>
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
  mostrarAviso.timer = setTimeout(() => (t.style.display = "none"), 5000);
}

if (protegerPagina()) {
  document.querySelector(".sidebar")?.setAttribute("id", "menuLateral");
  renderTopo();
  renderMenu();
  atualizarNaoLidas().then(renderResumo);
}
