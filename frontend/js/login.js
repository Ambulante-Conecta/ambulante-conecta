/* Ambulante Conecta — tela de login */

const form = document.getElementById("loginForm");
const campoCpf = form.elements.cpf;
const campoSenha = form.elements.senha;
const erroLogin = document.getElementById("erroLogin");
const botao = document.getElementById("entrar");
const digitos = (v) => String(v ?? "").replace(/\D/g, "");

// Páginas que cada perfil usa (as mesmas do menu). Voltar para uma página de outro perfil leva ao início:
// ex.: o gestor que clicou em "Entrar" na Formalização vai para o início, e não fica numa página de ambulante.
const PAGINAS_DO_PERFIL = {
  ambulante: ["index", "mapa", "formalizacao", "situacao", "comunicacao"],
  gestor: ["index", "mapa", "painel"]
};

// Só aceita voltar para uma página do próprio site (ex.: situacao.html ou situacao.html?ponto=5#nova)
// e que faça parte do perfil de quem entrou.
function destino(perfil) {
  const voltar = new URLSearchParams(location.search).get("voltar");
  const valido = voltar && /^[a-z]+\.html(\?ponto=\d{1,9})?(#[a-z]+)?$/.test(voltar);
  if (!valido) return "index.html";
  const pagina = voltar.split(".html")[0];
  // login.html criaria um laço; cadastro.html é só para quem não entrou; as outras dependem do perfil
  return (PAGINAS_DO_PERFIL[perfil] || []).includes(pagina) ? voltar : "index.html";
}

if (Sessao.token()) location.replace(destino(Sessao.usuario()?.perfil));
if (new URLSearchParams(location.search).get("expirou")) document.getElementById("avisoSessao").hidden = false;

campoCpf.addEventListener("input", () => {
  campoCpf.value = digitos(campoCpf.value).slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
});

document.getElementById("verSenha").addEventListener("click", (e) => {
  const mostrar = campoSenha.type === "password";
  campoSenha.type = mostrar ? "text" : "password";
  e.currentTarget.textContent = mostrar ? "Ocultar" : "Mostrar";
  e.currentTarget.setAttribute("aria-pressed", mostrar);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  erroLogin.textContent = "";
  if (digitos(campoCpf.value).length !== 11) { erroLogin.textContent = "Informe os 11 números do CPF."; return campoCpf.focus(); }
  if (!campoSenha.value) { erroLogin.textContent = "Digite sua senha."; return campoSenha.focus(); }

  botao.disabled = true;
  botao.textContent = "Entrando...";
  try {
    const r = await chamarApi("/auth/login", { metodo: "POST", corpo: { cpf: digitos(campoCpf.value), senha: campoSenha.value } });
    Sessao.salvar(r.token, r.usuario);
    location.href = destino(r.usuario.perfil);
  } catch (erro) {
    erroLogin.textContent = erro.status === 401 ? "CPF ou senha incorretos." : erro.message;
    campoSenha.value = "";
    campoSenha.focus();
  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
});