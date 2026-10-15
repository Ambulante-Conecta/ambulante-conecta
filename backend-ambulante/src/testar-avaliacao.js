// Testa o bloco 4: gestor aprova/recusa e ambulante acompanha. Precisa do gestor de teste:
//   $env:TESTE_GESTOR_CPF="..."; $env:TESTE_GESTOR_SENHA="..."; node testar-avaliacao.js
// Cada execução ocupa 1 ponto (aprovação). Para liberar os pontos de novo: database/resetar_pontos.sql
const BASE = process.env.API || "http://localhost:3000/api";
const SENHA = "Teste@12345";
if (!process.env.TESTE_GESTOR_CPF || !process.env.TESTE_GESTOR_SENHA) {
  console.error("Defina TESTE_GESTOR_CPF e TESTE_GESTOR_SENHA antes de rodar.");
  process.exit(1);
}

function gerarCpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (a) => { let s = 0; a.forEach((d, i) => (s += d * (a.length + 1 - i))); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  n.push(dv(n)); n.push(dv(n));
  return n.join("");
}
async function chamar(metodo, caminho, corpo, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const r = await fetch(BASE + caminho, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, dados: await r.json().catch(() => ({})) };
}
let falhas = 0;
function conferir(rotulo, obtido, esperado) {
  const ok = obtido === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${rotulo} (esperado ${esperado}, veio ${obtido})`);
}
async function novoAmbulante() {
  const cpf = gerarCpf();
  await chamar("POST", "/ambulantes", { nome_completo: "Teste Avaliacao Silva", cpf, data_nascimento: "1991-04-02", telefone: "92911112222",
    tipo_atividade: "Serviços", possui_mei: true, cnpj_mei: "11.444.777/0001-61", local_pretendido: "Centro", turno: "Manhã", senha: SENHA, consentimento: true });
  const r = await chamar("POST", "/auth/login", { cpf, senha: SENHA });
  return r.dados.token;
}

(async () => {
  const tokenG = (await chamar("POST", "/auth/login", { cpf: process.env.TESTE_GESTOR_CPF, senha: process.env.TESTE_GESTOR_SENHA })).dados.token;
  if (!tokenG) return console.error("Login do gestor falhou: confira CPF e senha.");
  const tokenA = await novoAmbulante(), tokenC = await novoAmbulante();

  const pontos = (await chamar("GET", "/pontos?status=disponivel")).dados.features?.map((f) => f.properties.id) ?? [];
  if (pontos.length < 2) return console.error("São necessários 2 pontos disponíveis. Rode database/resetar_pontos.sql.");
  const [p1, p2] = pontos;

  // A e C disputam o ponto p1; C também pede o ponto p2
  const solA = (await chamar("POST", "/solicitacoes", { ponto_id: p1 }, tokenA)).dados.id;
  const solC1 = (await chamar("POST", "/solicitacoes", { ponto_id: p1 }, tokenC)).dados.id;
  const solC2 = (await chamar("POST", "/solicitacoes", { ponto_id: p2 }, tokenC)).dados.id;

  console.log("--- Permissões ---");
  conferir("ambulante não avalia", (await chamar("PATCH", `/solicitacoes/${solA}`, { status: "Aprovada" }, tokenA)).status, 403);
  conferir("sem login não avalia", (await chamar("PATCH", `/solicitacoes/${solA}`, { status: "Aprovada" })).status, 401);
  conferir("gestor não usa 'minhas'", (await chamar("GET", "/solicitacoes/minhas", null, tokenG)).status, 403);

  console.log("--- Validações (RN04) ---");
  conferir("status inválido", (await chamar("PATCH", `/solicitacoes/${solC2}`, { status: "Talvez" }, tokenG)).status, 400);
  conferir("recusa sem justificativa", (await chamar("PATCH", `/solicitacoes/${solC2}`, { status: "Recusada" }, tokenG)).status, 400);
  conferir("solicitação inexistente", (await chamar("PATCH", "/solicitacoes/99999999", { status: "Aprovada" }, tokenG)).status, 404);

  console.log("--- Avaliação ---");
  let r = await chamar("PATCH", `/solicitacoes/${solC2}`, { status: "Recusada", justificativa: "Documentação incompleta para este ponto." }, tokenG);
  conferir("gestor recusa com justificativa", r.status, 200);
  r = await chamar("PATCH", `/solicitacoes/${solA}`, { status: "Aprovada" }, tokenG);
  conferir("gestor aprova", r.status, 200);
  conferir("avaliar de novo é bloqueado", (await chamar("PATCH", `/solicitacoes/${solA}`, { status: "Recusada", justificativa: "Outra decisão qualquer" }, tokenG)).status, 409);

  console.log("--- Efeitos ---");
  const minhasA = (await chamar("GET", "/solicitacoes/minhas", null, tokenA)).dados;
  conferir("A vê a sua como Aprovada", minhasA.find((s) => s.id === solA)?.status, "Aprovada");
  const minhasC = (await chamar("GET", "/solicitacoes/minhas", null, tokenC)).dados;
  conferir("RN05: pedido concorrente recusado automaticamente", minhasC.find((s) => s.id === solC1)?.status, "Recusada");
  conferir("C: recusa traz a justificativa", Boolean(minhasC.find((s) => s.id === solC2)?.justificativa), true);
  const ocupados = (await chamar("GET", "/pontos?status=ocupado")).dados.features?.map((f) => f.properties.id) ?? [];
  conferir("ponto aprovado ficou ocupado", ocupados.includes(p1), true);
  conferir("novo pedido no ponto ocupado", (await chamar("POST", "/solicitacoes", { ponto_id: p1 }, tokenC)).status, 409);

  console.log("--- Listagem do gestor ---");
  r = await chamar("GET", "/solicitacoes?status=Recusada", null, tokenG);
  conferir("filtro por status", r.status, 200);
  conferir("CPF vem mascarado", String(r.dados[0]?.ambulante_cpf).includes("*"), true);
  conferir("filtro inválido", (await chamar("GET", "/solicitacoes?status=Xyz", null, tokenG)).status, 400);

  console.log(falhas ? `\n${falhas} teste(s) com FALHA` : "\nTodos os testes passaram");
})();