/* Ambulante Conecta — tela de login.
   Depende de js/api.js e js/icones.js (carregue-os antes).
   Heurísticas: erro embaixo do campo certo e dizendo o que fazer (9), mostrar senha (3), "Entrando..." enquanto
   espera (1), aviso de sessão terminada (1), caminho para criar conta e voltar ao início sempre visíveis (3 e 6). */

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
  gestor: ["index", "painel"] // o gestor que entra a partir do mapa vai para o início (pedido do usuário, 14/10)
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

function mostrarErro(campo, msg) {
  document.getElementById("erro-" + campo).textContent = msg;
  const el = form.elements[campo];
  el.setAttribute("aria-invalid", msg ? "true" : "false");
  el.classList.toggle("invalido", !!msg);
}

campoCpf.addEventListener("input", () => {
  campoCpf.value = digitos(campoCpf.value).slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  mostrarErro("cpf", "");
  erroLogin.textContent = "";
});
campoSenha.addEventListener("input", () => { mostrarErro("senha", ""); erroLogin.textContent = ""; });

document.getElementById("verSenha").addEventListener("click", (e) => {
  const mostrar = campoSenha.type === "password";
  campoSenha.type = mostrar ? "text" : "password";
  e.currentTarget.textContent = mostrar ? "Ocultar" : "Mostrar";
  e.currentTarget.setAttribute("aria-pressed", mostrar ? "true" : "false");
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  erroLogin.textContent = "";
  const cpfOk = digitos(campoCpf.value).length === 11;
  mostrarErro("cpf", cpfOk ? "" : "Informe os 11 números do seu CPF.");
  mostrarErro("senha", campoSenha.value ? "" : "Digite a sua senha.");
  if (!cpfOk) return campoCpf.focus();
  if (!campoSenha.value) return campoSenha.focus();

  botao.disabled = true;
  botao.classList.add("carregando");
  botao.textContent = "Entrando...";
  try {
    const r = await chamarApi("/auth/login", { metodo: "POST", corpo: { cpf: digitos(campoCpf.value), senha: campoSenha.value } });
    Sessao.salvar(r.token, r.usuario);
    location.href = destino(r.usuario.perfil);
  } catch (erro) {
    // 401: não diz qual dos dois está errado (segurança); 429: muitas tentativas; 0: sem conexão
    erroLogin.textContent = erro.status === 401
      ? "CPF ou senha incorretos. Confira os números do CPF e tente a senha de novo."
      : erro.message;
    campoSenha.value = "";
    campoSenha.focus();
  } finally {
    botao.disabled = false;
    botao.classList.remove("carregando");
    botao.innerHTML = `${icone("entrar")}Entrar`;
  }
});
