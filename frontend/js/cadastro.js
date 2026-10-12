/* Ambulante Conecta — cadastro em etapas, ligado à API.
   Depende de js/api.js e js/app.js (carregue-os antes). O endereço da API fica só em api.js (API_BASE). */

const form = document.getElementById("cadastroForm");
const paineis = [...form.querySelectorAll(".step-panel")];
const CHAVE_RASCUNHO = "ambulante.cadastro.rascunho";
const SEM_RASCUNHO = ["cpf", "consentimento", "senha", "confirmarSenha"]; // dados sensíveis não ficam no navegador
let etapa = 0;

/* ---------- Validação ---------- */
const digitos = (v) => String(v ?? "").replace(/\D/g, "");

function cpfValido(v) {
  const n = digitos(v);
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  const dv = (t) => {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += +n[i] * (t + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === +n[9] && dv(10) === +n[10];
}

function cnpjValido(v) {
  const n = digitos(v);
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
  const dv = (t) => {
    const pesos = t === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < t; i++) soma += +n[i] * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === +n[12] && dv(13) === +n[13];
}

// Data no formato AAAA-MM-DD com ano de exatamente 4 dígitos (barra anos como 11111) e que exista no calendário
function dataValida(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return a >= 1900 && dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hoje = new Date();
const LIMITE_NASC = isoLocal(new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate()));
const maiorDeIdade = (iso) => iso <= LIMITE_NASC; // datas AAAA-MM-DD comparam bem como texto

// O próprio campo de data também passa a limitar o ano
form.elements.nascimento.min = "1900-01-01";
form.elements.nascimento.max = LIMITE_NASC;
// Ano com mais de 4 dígitos (ex.: 11111): o erro aparece na hora, sem esperar sair do campo
form.elements.nascimento.addEventListener("input", (e) => {
  if (/^\d{5,}-/.test(e.target.value)) valida("nascimento");
});

const meiSim = () => form.elements.mei.value === "Sim";
const obrig = (msg) => (v) => (v.trim() ? "" : msg);
const regras = {
  nome: (v) => (v.trim().split(/\s+/).length >= 2 ? "" : "Digite seu nome e sobrenome."),
  cpf: (v) => (cpfValido(v) ? "" : "CPF inválido. Verifique os 11 números."),
  nascimento: (v) => (!dataValida(v) ? "Informe uma data válida, com ano de 4 dígitos." : maiorDeIdade(v) ? "" : "É preciso ter 18 anos ou mais."),
  telefone: (v) => (digitos(v).length === 11 ? "" : "O telefone deve ter 11 dígitos, com DDD."),
  email: (v) => (!v || /^\S+@\S+\.\S+$/.test(v) ? "" : "Digite um e-mail válido, como nome@email.com."),
  senha: (v) => (v.length >= 8 && v.length <= 72 && /[A-Za-z]/.test(v) && /\d/.test(v) ? "" : "A senha deve ter de 8 a 72 caracteres, com letras e números."),
  confirmarSenha: (v) => (v === form.elements.senha.value ? "" : "As senhas não são iguais."),
  atividade: obrig("Escolha o tipo de atividade."),
  mei: obrig("Informe se você tem MEI."),
  cnpj: (v) => (!meiSim() || cnpjValido(v) ? "" : "Informe um CNPJ válido do MEI (14 números)."),
  local: obrig("Informe o bairro ou região."),
  turno: obrig("Escolha o turno de trabalho."),
  consentimento: (_, el) => (el.checked ? "" : "Marque a caixa para enviar o cadastro.")
};

function marcaErro(campo, msg) {
  const caixa = document.getElementById("erro-" + campo);
  const el = form.elements[campo];
  if (!caixa || !el) return;
  caixa.textContent = msg;
  const alvo = el.length ? el[0] : el; // radios
  alvo.setAttribute("aria-invalid", msg ? "true" : "false");
  if (el.length) [...el].forEach((r) => r.closest("label")?.classList.toggle("invalido", !!msg));
  else el.classList.toggle("invalido", !!msg);
}

function valida(campo) {
  const el = form.elements[campo];
  const msg = regras[campo](el.value ?? "", el);
  marcaErro(campo, msg);
  return !msg;
}

function validaEtapa(i) {
  const campos = paineis[i].dataset.campos.split(",");
  const primeiro = campos.map((c) => [c, valida(c)]).find(([, ok]) => !ok);
  if (primeiro) {
    const el = form.elements[primeiro[0]];
    (el.length ? el[0] : el).focus();
    return false;
  }
  return true;
}

/* ---------- Máscaras ---------- */
function mascara(el, fn) {
  el.addEventListener("input", () => (el.value = fn(digitos(el.value))));
}
mascara(form.elements.cpf, (n) =>
  n.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"));
mascara(form.elements.telefone, (n) =>
  n.slice(0, 11).replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2"));
mascara(form.elements.cnpj, (n) =>
  n.slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2"));

// O campo de CNPJ só aparece para quem tem MEI
function atualizaCnpj() {
  const mostrar = meiSim();
  document.getElementById("campoCnpj").hidden = !mostrar;
  if (!mostrar) { form.elements.cnpj.value = ""; marcaErro("cnpj", ""); }
}
form.addEventListener("change", (e) => { if (e.target.name === "mei") atualizaCnpj(); });

/* ---------- Etapas ---------- */
function renderProgresso() {
  document.getElementById("progress").innerHTML = paineis.map((p, i) => {
    const estado = i < etapa ? "done" : i === etapa ? "current" : "";
    return `<li class="${estado}"${i === etapa ? ' aria-current="step"' : ""}>
      <span class="bubble">${i < etapa ? "✓" : i + 1}</span>
      <span class="bubble-label">${p.dataset.titulo}</span></li>`;
  }).join("");
}

function mostrarEtapa(i, focar = true) {
  etapa = i;
  paineis.forEach((p, k) => (p.hidden = k !== i));
  if (i === paineis.length - 1) montarRevisao();
  document.getElementById("voltar").hidden = i === 0;
  document.getElementById("avancar").textContent = i === paineis.length - 1 ? "Enviar cadastro" : "Continuar";
  renderProgresso();
  if (focar) {
    paineis[i].querySelector("input,select,textarea")?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function montarRevisao() {
  const rotulos = [
    ["nome", "Nome"], ["cpf", "CPF"], ["nascimento", "Nascimento"], ["telefone", "Telefone"], ["email", "E-mail"],
    ["atividade", "Atividade"], ["produtos", "Produtos ou serviços"], ["mei", "MEI"], ["cnpj", "CNPJ do MEI"],
    ["local", "Local pretendido"], ["turno", "Turno"]
  ].filter(([c]) => c !== "cnpj" || meiSim());
  const fmtData = (v) => v.split("-").reverse().join("/");
  document.getElementById("revisao").innerHTML = rotulos.map(([c, r]) => {
    let v = form.elements[c].value || "Não informado";
    if (c === "nascimento" && form.elements[c].value) v = fmtData(v);
    if (c === "cpf") v = v.replace(/^\d{3}\.\d{3}\.\d{3}/, "•••.•••.•••");
    return `<div><dt>${r}</dt><dd>${v.replace(/</g, "&lt;")}</dd></div>`;
  }).join("");
}

document.getElementById("voltar").addEventListener("click", () => mostrarEtapa(etapa - 1));

// Validação ao sair do campo
form.addEventListener("focusout", (e) => {
  const c = e.target.name;
  if (c && regras[c] && e.target.getAttribute("aria-invalid") === "true") valida(c);
});

/* ---------- Rascunho (sem CPF) ---------- */
function salvarRascunho() {
  try {
    const d = {};
    [...form.elements].forEach((el) => {
      if (!el.name || SEM_RASCUNHO.includes(el.name)) return;
      if (el.type === "radio" && !el.checked) return;
      d[el.name] = el.value;
    });
    localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(d));
  } catch (_) {}
}

function carregarRascunho() {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || "{}");
    Object.entries(d).forEach(([nome, valor]) => {
      const el = form.elements[nome];
      if (!el) return;
      if (el.length) [...el].forEach((r) => (r.checked = r.value === valor));
      else el.value = valor;
    });
  } catch (_) {}
}
form.addEventListener("input", salvarRascunho);
form.addEventListener("change", salvarRascunho);

/* ---------- Envio para a API ---------- */
// Nomes dos campos na API -> nomes dos campos do formulário
const CAMPO_FORM = { nome_completo: "nome", data_nascimento: "nascimento", tipo_atividade: "atividade", possui_mei: "mei", cnpj_mei: "cnpj" };

// Mostra os erros devolvidos pela API nos campos certos e leva o usuário até o primeiro
function mostrarErrosDaApi(erros) {
  const lista = Object.entries(erros).map(([k, msg]) => [CAMPO_FORM[k] || k, msg]);
  lista.forEach(([campo, msg]) => marcaErro(campo, msg));
  const primeiro = lista.find(([campo]) => form.elements[campo]);
  if (!primeiro) return false;
  const i = paineis.findIndex((p) => p.dataset.campos.split(",").includes(primeiro[0]));
  if (i >= 0) {
    mostrarEtapa(i, false);
    const el = form.elements[primeiro[0]];
    (el.length ? el[0] : el).focus();
  }
  return true;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validaEtapa(etapa)) return;
  if (etapa < paineis.length - 1) return mostrarEtapa(etapa + 1);

  for (let i = 0; i < paineis.length; i++) {
    if (!validaEtapa(i)) { mostrarEtapa(i); validaEtapa(i); return; }
  }

  const fd = new FormData(form);
  const dados = {
    nome_completo: fd.get("nome").trim(),
    cpf: digitos(fd.get("cpf")),
    data_nascimento: fd.get("nascimento"),
    telefone: digitos(fd.get("telefone")),
    email: (fd.get("email") || "").trim() || null,
    tipo_atividade: fd.get("atividade"),
    possui_mei: meiSim(),
    cnpj_mei: meiSim() ? digitos(fd.get("cnpj")) : null,
    local_pretendido: fd.get("local"),
    turno: fd.get("turno"),
    senha: fd.get("senha"),
    consentimento: true // o formulário só chega aqui com a caixa marcada
  };

  const botao = document.getElementById("avancar");
  botao.disabled = true;
  botao.textContent = "Enviando...";
  try {
    await chamarApi("/ambulantes", { metodo: "POST", corpo: dados });
    try { localStorage.removeItem(CHAVE_RASCUNHO); } catch (_) {}
    document.getElementById("cadastroCard").hidden = true;
    const ok = document.getElementById("sucesso");
    ok.hidden = false;
    ok.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (erro) {
    if (erro.status === 409) {
      mostrarErrosDaApi({ cpf: "Este CPF já está cadastrado. Se a conta é sua, use Entrar." });
    } else if (erro.status === 400 && mostrarErrosDaApi(erro.campos)) {
      // erros já exibidos nos campos
    } else {
      mostrarAviso(erro.message); // inclui a falta de conexão (status 0), com a mensagem do api.js
    }
  } finally {
    botao.disabled = false;
    botao.textContent = "Enviar cadastro";
  }
});

carregarRascunho();
atualizaCnpj();
mostrarEtapa(0, false);