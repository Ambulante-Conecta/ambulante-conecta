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
  constructor(status, mensagem, campos = {}) {
    super(mensagem);
    this.status = status;   // 0 = não conseguiu falar com o servidor
    this.campos = campos;   // erros por campo, quando a API devolve
  }
}

// Chama a API enviando o token. Se a sessão expirou (401 com token), limpa e leva para o login.
async function chamarApi(caminho, { metodo = "GET", corpo } = {}) {
  const headers = {};
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  const token = Sessao.token();
  if (token) headers.Authorization = "Bearer " + token;

  let resposta;
  try {
    resposta = await fetch(API_BASE + caminho, {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined
    });
  } catch (_) {
    throw new ErroApi(0, "Não foi possível conectar ao servidor. Verifique se a API está rodando.");
  }

  const dados = await resposta.json().catch(() => ({}));
  if (resposta.status === 401 && token) {
    Sessao.limpar();
    const pagina = location.pathname.split("/").pop() || "index.html";
    location.href = `login.html?expirou=1&voltar=${encodeURIComponent(pagina)}`;
    throw new ErroApi(401, "Sessão expirada.");
  }
  if (!resposta.ok) throw new ErroApi(resposta.status, dados.erro || "Erro inesperado.", dados.campos || {});
  return dados;
}