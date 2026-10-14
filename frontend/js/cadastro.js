/* Ambulante Conecta — cadastro em etapas (RF01), ligado à API.
   Depende de js/api.js, js/icones.js e js/app.js (carregue-os antes). O endereço da API fica só em api.js.
   Heurísticas aplicadas: etapa visível (1), linguagem simples (2), voltar e corrigir (3), regras da senha ao vivo e
   validação na hora (5), opções em botões em vez de lembrar (6), erros que dizem o que fazer (9), ajuda nos campos (10). */

const form = document.getElementById("cadastroForm");
const paineis = [...form.querySelectorAll(".step-panel")];
const CHAVE_RASCUNHO = "ambulante.cadastro.rascunho";
const SEM_RASCUNHO = ["cpf", "consentimento", "senha", "confirmarSenha"]; // dados sensíveis não ficam no aparelho
let etapa = 0;
let etapaMaxima = 0; // até onde a pessoa já chegou (pode voltar a qualquer etapa já vista)

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

// Data AAAA-MM-DD com ano de 4 dígitos (barra anos como 11111) e que exista no calendário
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

form.elements.nascimento.min = "1900-01-01";
form.elements.nascimento.max = LIMITE_NASC;

// Regras da senha (as mesmas da API), mostradas ao vivo embaixo do campo
const REGRAS_SENHA = {
  tamanho: (s) => s.length >= 8 && s.length <= 72,
  letra: (s) => /[A-Za-z]/.test(s),
  numero: (s) => /\d/.test(s)
};

const meiSim = () => form.elements.mei.value === "Sim";
const obrig = (msg) => (v) => (String(v).trim() ? "" : msg);
const regras = {
  nome: (v) => (v.trim().split(/\s+/).length >= 2 ? "" : "Escreva o nome e o sobrenome, como no documento."),
  cpf: (v) => (cpfValido(v) ? "" : "Este CPF não é válido. Confira os 11 números."),
  nascimento: (v) => (!dataValida(v) ? "Informe a data de nascimento (dia, mês e ano)." : maiorDeIdade(v) ? "" : "É preciso ter 18 anos ou mais para se cadastrar."),
  telefone: (v) => (digitos(v).length === 11 ? "" : "Escreva o celular com DDD: são 11 números, como (92) 91234-5678."),
  email: (v) => (!v || /^\S+@\S+\.\S+$/.test(v) ? "" : "Este e-mail parece incompleto. Exemplo: nome@email.com. Se não tiver, deixe em branco."),
  senha: (v) => (Object.values(REGRAS_SENHA).every((r) => r(v)) ? "" : "A senha ainda não cumpre as regras marcadas acima."),
  confirmarSenha: (v) => (v && v === form.elements.senha.value ? "" : "As duas senhas estão diferentes. Digite a mesma senha nos dois campos."),
  atividade: obrig("Escolha uma das opções de atividade."),
  mei: obrig("Escolha uma opção: se você já tem MEI, se está tirando ou se não tem."),
  cnpj: (v) => (!meiSim() || cnpjValido(v) ? "" : "Este CNPJ não é válido. Confira os 14 números no seu Certificado do MEI."),
  local: obrig("Escreva o bairro ou a região onde quer vender."),
  turno: obrig("Escolha o turno em que você trabalha."),
  consentimento: (_, el) => (el.checked ? "" : "Para criar a conta, marque que concorda com o uso dos dados.")
};

function marcaErro(campo, msg) {
  const caixa = document.getElementById("erro-" + campo);
  const el = form.elements[campo];
  if (!caixa || !el) return;
  caixa.textContent = msg;
  if (el.length) { // grupo de opções (radio)
    [...el].forEach((r) => { r.setAttribute("aria-invalid", msg ? "true" : "false"); r.closest("label")?.classList.toggle("invalido", !!msg); });
  } else {
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    el.classList.toggle("invalido", !!msg);
  }
}

function valida(campo) {
  const el = form.elements[campo];
  const msg = regras[campo](el.value ?? "", el);
  marcaErro(campo, msg);
  return !msg;
}

// Valida a etapa e leva o foco ao primeiro campo com problema
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

/* ---------- Máscaras e campos que dependem de outros ---------- */
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

// O CNPJ só é pedido para quem já tem MEI
function atualizaCnpj() {
  const mostrar = meiSim();
  document.getElementById("campoCnpj").hidden = !mostrar;
  if (!mostrar) { form.elements.cnpj.value = ""; marcaErro("cnpj", ""); }
}

function atualizaRegrasSenha() {
  const senha = form.elements.senha.value;
  document.querySelectorAll("#regrasSenha li").forEach((li) => {
    const ok = REGRAS_SENHA[li.dataset.regra](senha);
    li.classList.toggle("ok", ok);
    li.querySelector(".sr-only")?.remove();
    li.insertAdjacentHTML("beforeend", `<span class="sr-only">${ok ? " (cumprida)" : " (falta)"}</span>`);
  });
}

// Botões "Mostrar" / "Ocultar" senha
document.querySelectorAll(".mostrar-senha").forEach((b) => b.addEventListener("click", () => {
  const campo = document.getElementById(b.dataset.alvo);
  const mostrar = campo.type === "password";
  campo.type = mostrar ? "text" : "password";
  b.textContent = mostrar ? "Ocultar" : "Mostrar";
  b.setAttribute("aria-pressed", mostrar ? "true" : "false");
}));

form.addEventListener("change", (e) => {
  if (e.target.name === "mei") atualizaCnpj();
  // Opções (radio): o erro some assim que a pessoa escolhe
  if (e.target.type === "radio" && regras[e.target.name]) valida(e.target.name);
  if (e.target.name === "consentimento") valida("consentimento");
});
form.addEventListener("input", (e) => {
  const c = e.target.name;
  if (c === "senha") atualizaRegrasSenha();
  // Com erro aparecendo, confere a cada letra: o aviso some assim que o campo fica certo
  if (c && regras[c] && e.target.getAttribute("aria-invalid") === "true") valida(c);
});
form.addEventListener("focusout", (e) => {
  const c = e.target.name;
  if (c && regras[c] && e.target.type !== "radio" && e.target.value) valida(c);
});

/* ---------- Etapas ---------- */
function renderEtapas() {
  const total = paineis.length;
  document.getElementById("etapaTexto").innerHTML = `<strong>Etapa ${etapa + 1} de ${total}:</strong> ${escHtml(paineis[etapa].dataset.titulo)}`;
  document.getElementById("etapaBarra").style.width = `${((etapa + 1) / total) * 100}%`;
  document.querySelector(".etapas-barra").setAttribute("aria-valuenow", String(etapa + 1));
  document.getElementById("etapasLista").innerHTML = paineis.map((p, i) => {
    const estado = i < etapa ? "feita" : i === etapa ? "atual" : "";
    const marca = i < etapa ? icone("check") : `<span aria-hidden="true">${i + 1}</span>`;
    const rotulo = `${escHtml(p.dataset.titulo)}<span class="sr-only">${i < etapa ? " (concluída)" : i === etapa ? " (etapa atual)" : ""}</span>`;
    // Etapas já vistas viram botão: dá para voltar direto a elas
    const conteudo = i <= etapaMaxima && i !== etapa
      ? `<button type="button" data-ir="${i}"><span class="etapa-num">${marca}</span>${rotulo}</button>`
      : `<span class="etapa-item"><span class="etapa-num">${marca}</span>${rotulo}</span>`;
    return `<li class="${estado}"${i === etapa ? ' aria-current="step"' : ""}>${conteudo}</li>`;
  }).join("");
}

// Texto do botão principal conforme a etapa
function rotuloAvancar() {
  document.getElementById("avancar").innerHTML = etapa === paineis.length - 1
    ? `${icone("check")}Criar minha conta` : `Continuar${icone("avancar")}`;
}

function mostrarEtapa(i, focar = true) {
  etapa = i;
  etapaMaxima = Math.max(etapaMaxima, i);
  paineis.forEach((p, k) => (p.hidden = k !== i));
  if (i === paineis.length - 1) montarRevisao();
  document.getElementById("voltar").hidden = i === 0;
  rotuloAvancar();
  document.getElementById("erroEnvio").textContent = "";
  renderEtapas();
  if (focar) {
    paineis[i].querySelector("input:not([type=hidden]),select,textarea")?.focus({ preventScroll: true });
    document.getElementById("cadastroCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

document.getElementById("etapasLista").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-ir]");
  if (b) mostrarEtapa(Number(b.dataset.ir));
});
document.getElementById("voltar").addEventListener("click", () => mostrarEtapa(etapa - 1));

/* ---------- Revisão: um bloco por etapa, com "Corrigir" ---------- */
const GRUPOS_REVISAO = [
  { etapa: 0, titulo: "Dados pessoais", campos: [["nome", "Nome"], ["cpf", "CPF"], ["nascimento", "Nascimento"]] },
  { etapa: 1, titulo: "Contato", campos: [["telefone", "Celular"], ["email", "E-mail"]] },
  { etapa: 2, titulo: "Atividade", campos: [["atividade", "Atividade"], ["mei", "MEI"], ["cnpj", "CNPJ do MEI"]] },
  { etapa: 3, titulo: "Onde e quando", campos: [["local", "Bairro ou região"], ["turno", "Turno"]] }
];

function valorParaRevisao(campo) {
  const el = form.elements[campo];
  let v = el.length ? [...el].find((r) => r.checked)?.closest("label").textContent.trim() || "" : el.value;
  if (!v) return "Não informado";
  if (campo === "nascimento") v = v.split("-").reverse().join("/");
  if (campo === "cpf") v = v.replace(/^\d{3}\.\d{3}\.\d{3}/, "•••.•••.•••");
  return v;
}

function montarRevisao() {
  document.getElementById("revisao").innerHTML = GRUPOS_REVISAO.map((g) => `
    <section class="revisao-bloco" aria-labelledby="rev-${g.etapa}">
      <div class="revisao-topo">
        <h3 id="rev-${g.etapa}">${g.titulo}</h3>
        <button type="button" class="btn btn-ghost btn-sm" data-ir="${g.etapa}">${icone("editar")}Corrigir<span class="sr-only"> ${g.titulo.toLowerCase()}</span></button>
      </div>
      <dl class="review">${g.campos.filter(([c]) => c !== "cnpj" || meiSim())
        .map(([c, r]) => `<div><dt>${r}</dt><dd>${escHtml(valorParaRevisao(c))}</dd></div>`).join("")}</dl>
    </section>`).join("");
}
document.getElementById("revisao").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-ir]");
  if (b) mostrarEtapa(Number(b.dataset.ir));
});

/* ---------- Rascunho (sem CPF e sem senha) ---------- */
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

// Devolve true se havia algo preenchido
function carregarRascunho() {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || "{}");
    let algum = false;
    Object.entries(d).forEach(([nome, valor]) => {
      const el = form.elements[nome];
      if (!el || !valor) return;
      if (el.length) [...el].forEach((r) => (r.checked = r.value === valor));
      else el.value = valor;
      algum = true;
    });
    return algum;
  } catch (_) { return false; }
}
form.addEventListener("input", salvarRascunho);
form.addEventListener("change", salvarRascunho);

document.getElementById("limparRascunho").addEventListener("click", () => {
  try { localStorage.removeItem(CHAVE_RASCUNHO); } catch (_) {}
  form.reset();
  Object.keys(regras).forEach((c) => marcaErro(c, ""));
  atualizaCnpj();
  atualizaRegrasSenha();
  etapaMaxima = 0;
  document.getElementById("avisoRascunho").hidden = true;
  mostrarEtapa(0);
  mostrarAviso("Formulário limpo. Pode começar de novo.");
});

/* ---------- Envio para a API ---------- */
// Nomes dos campos na API -> nomes dos campos do formulário
const CAMPO_FORM = { nome_completo: "nome", data_nascimento: "nascimento", tipo_atividade: "atividade", possui_mei: "mei", cnpj_mei: "cnpj", local_pretendido: "local" };

// Mostra os erros devolvidos pela API nos campos certos e leva a pessoa até o primeiro
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
    if (!validaEtapa(i)) { mostrarEtapa(i, false); validaEtapa(i); return; }
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
    local_pretendido: fd.get("local").trim(),
    turno: fd.get("turno"),
    senha: fd.get("senha"),
    consentimento: true // o formulário só chega aqui com a caixa marcada
  };

  const botao = document.getElementById("avancar");
  const erroEnvio = document.getElementById("erroEnvio");
  erroEnvio.textContent = "";
  botao.disabled = true;
  botao.classList.add("carregando");
  botao.textContent = "Criando sua conta...";
  try {
    await chamarApi("/ambulantes", { metodo: "POST", corpo: dados });
    try { localStorage.removeItem(CHAVE_RASCUNHO); } catch (_) {}
    document.getElementById("cadastroCard").hidden = true;
    document.getElementById("avisoRascunho").hidden = true;
    document.querySelector(".page-head").hidden = true;
    const ok = document.getElementById("sucesso");
    ok.hidden = false;
    ok.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (erro) {
    if (erro.status === 409) {
      mostrarErrosDaApi({ cpf: "Este CPF já tem uma conta. Se a conta é sua, use o botão Entrar no topo da página." });
    } else if (erro.status === 400 && mostrarErrosDaApi(erro.campos)) {
      // erros já mostrados nos campos
    } else {
      // Sem internet, servidor fora do ar etc.: nada se perde, o formulário continua preenchido
      erroEnvio.textContent = `${erro.message} Seus dados continuam preenchidos.`;
    }
  } finally {
    botao.disabled = false;
    botao.classList.remove("carregando");
    rotuloAvancar();
  }
});

/* ---------- Início ---------- */
document.getElementById("avisoRascunho").hidden = !carregarRascunho();
atualizaCnpj();
atualizaRegrasSenha();
mostrarEtapa(0, false);
