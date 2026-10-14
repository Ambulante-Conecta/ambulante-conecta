/* Ambulante Conecta — acesso à API e sessão do usuário. Carregue antes de app.js */

// Em desenvolvimento (Live Server) usa a API local; publicado (GitHub Pages) usa a API no Render.
const API_BASE = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://localhost:3000/api"
  : "https://ambulante-conecta.onrender.com/api";

// A sessão fica só na aba (sessionStorage): some ao fechá-la.
const Sessao = {
  token() { try { return sessionStorage.getItem("ambulante.token"); } catch (_) { return null; } },
  usuario() { try { return JSON.parse(sessionStorage.getItem("ambulante.usuario") || "null"); } catch (_) { return null; } },
  salvar(token, usuario) {
    try {
      sessionStorage.setItem("ambulante.token", token);
      sessionStorage.setItem("ambulante.usuario", JSON.stringify(usuario));
    } catch (_) {}
  },
  limpar() {
    try { sessionStorage.removeItem("ambulante.token"); sessionStorage.removeItem("ambulante.usuario"); } catch (_) {}
  }
};

class ErroApi extends Error {
  constructor(status, mensagem, campos = {}, tipo = "") {
    super(mensagem);
    this.status = status;   // 0 = não conseguiu falar com o servidor
    this.campos = campos;   // erros por campo, quando a API devolve
    this.tipo = tipo;       // com status 0: "offline", "tempo" (demorou demais) ou "rede"
  }
}

/* ---------- Conexão: pensada para rede móvel instável ----------
   - Tempo limite em toda chamada: 20 s se o servidor respondeu nos últimos 10 minutos; 75 s se ele pode estar
     "dormindo" (o Render gratuito leva cerca de 1 minuto para acordar).
   - Consultas (GET) tentam de novo uma vez sozinhas. Envios (POST/PATCH) não, para não duplicar pedidos.
   - Faixa na tela: sem internet, servidor acordando/conexão lenta e conexão de volta.
   - Quando a internet volta, a página recebe o evento "conexao:voltou" (app.js refaz o que tinha falhado). */
const CHAVE_RESPOSTA = "ambulante.api.respondeuEm";
const servidorAcordado = () => {
  try { return Date.now() - Number(sessionStorage.getItem(CHAVE_RESPOSTA) || 0) < 10 * 60 * 1000; } catch (_) { return false; }
};
const marcarResposta = () => { try { sessionStorage.setItem(CHAVE_RESPOSTA, String(Date.now())); } catch (_) {} };
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const MSG_OFFLINE = "Você está sem internet. Confira os dados móveis ou o Wi-Fi e tente de novo.";

const Conexao = {
  pendentes: 0,
  timerLento: null,
  el: null,
  faixa(tipo, texto) {
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.id = "conexao";
      document.body.appendChild(this.el);
    }
    this.el.className = "conexao conexao-" + tipo;
    this.el.dataset.tipo = tipo;
    this.el.setAttribute("role", tipo === "offline" ? "alert" : "status");
    this.el.textContent = texto;
    this.el.hidden = false;
  },
  esconder(tipo) {
    if (this.el && (!tipo || this.el.dataset.tipo === tipo)) this.el.hidden = true;
  },
  inicio() {
    this.pendentes++;
    if (this.timerLento) return;
    this.timerLento = setTimeout(() => {
      if (!this.pendentes || !navigator.onLine) return;
      this.faixa("lento", servidorAcordado()
        ? "A conexão está lenta. Ainda estamos esperando a resposta..."
        : "O servidor está acordando. Na primeira vez isso pode levar até 1 minuto.");
    }, 5000);
  },
  fim() {
    this.pendentes = Math.max(0, this.pendentes - 1);
    if (this.pendentes) return;
    clearTimeout(this.timerLento);
    this.timerLento = null;
    this.esconder("lento");
  }
};

window.addEventListener("offline", () => Conexao.faixa("offline", "Você está sem internet. Quando a conexão voltar, a tela se atualiza sozinha."));
window.addEventListener("online", () => {
  Conexao.faixa("ok", "Conexão de volta.");
  setTimeout(() => Conexao.esconder("ok"), 3000);
  document.dispatchEvent(new Event("conexao:voltou"));
});
if (!navigator.onLine) Conexao.faixa("offline", "Você está sem internet. Quando a conexão voltar, a tela se atualiza sozinha.");

// Chama a API enviando o token. Se a sessão expirou (401 com token), limpa e leva para o login.
async function chamarApi(caminho, { metodo = "GET", corpo } = {}) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await chamarUmaVez(caminho, metodo, corpo);
    } catch (erro) {
      const podeRepetir = metodo === "GET" && erro.status === 0 && erro.tipo !== "offline" && tentativa < 2;
      if (!podeRepetir) throw erro;
      await esperar(1500);
    }
  }
}

async function chamarUmaVez(caminho, metodo, corpo) {
  if (!navigator.onLine) throw new ErroApi(0, MSG_OFFLINE, {}, "offline");

  const headers = {};
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  const token = Sessao.token();
  if (token) headers.Authorization = "Bearer " + token;

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), servidorAcordado() ? 20000 : 75000);
  Conexao.inicio();
  let resposta, dados;
  try {
    resposta = await fetch(API_BASE + caminho, {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal: controle.signal
    });
    dados = await resposta.json().catch(() => ({}));
  } catch (_) {
    if (!navigator.onLine) throw new ErroApi(0, MSG_OFFLINE, {}, "offline");
    if (controle.signal.aborted) throw new ErroApi(0, "A conexão está lenta e a resposta não chegou a tempo. Tente de novo.", {}, "tempo");
    throw new ErroApi(0, "Não foi possível falar com o servidor. Tente de novo em instantes.", {}, "rede");
  } finally {
    clearTimeout(timer);
    Conexao.fim();
  }
  marcarResposta();

  if (resposta.status === 401 && token) {
    Sessao.limpar();
    const pagina = location.pathname.split("/").pop() || "index.html";
    location.href = `login.html?expirou=1&voltar=${encodeURIComponent(pagina)}`;
    throw new ErroApi(401, "Sessão expirada.");
  }
  if (!resposta.ok) throw new ErroApi(resposta.status, dados.erro || "Algo deu errado. Tente de novo.", dados.campos || {});
  return dados;
}
