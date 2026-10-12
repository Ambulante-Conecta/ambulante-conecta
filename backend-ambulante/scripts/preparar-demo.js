// Prepara o banco para ensaios e para a apresentação.
// APAGA todos os cadastros de ambulantes, solicitações e mensagens (o gestor é mantido) e libera os pontos de venda.
// Uso: node scripts/preparar-demo.js --sim        (ou: npm run demo)
require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../src/config/database");

const HOSTS_LOCAIS = ["localhost", "127.0.0.1", "::1"];
// Com DATABASE_URL (banco publicado), o endereço real está na URL, não em DB_HOST
const host = process.env.DATABASE_URL
  ? (() => { try { return new URL(process.env.DATABASE_URL).hostname; } catch (_) { return "desconhecido"; } })()
  : process.env.DB_HOST || "localhost";

// CPF e CNPJ fictícios, porém válidos
const DEMOS = [
  { nome: "João Demo Silva",    cpf: "52998224725", nasc: "1985-05-12", tel: "92991112222", atividade: "Alimentação", mei: true,  cnpj: "11222333000181", turno: "Manhã" },
  { nome: "Maria Demo Oliveira", cpf: "11144477735", nasc: "1990-08-20", tel: "92988887777", atividade: "Artesanato",  mei: false, cnpj: null,             turno: "Tarde" },
  { nome: "Ana Demo Souza",      cpf: "93541134780", nasc: "1992-03-03", tel: "92977776666", atividade: "Vestuário",   mei: true,  cnpj: "11444777000161", turno: "Dia todo" },
];
const CPF_LIVRE_PARA_CADASTRO_AO_VIVO = "404.147.996-74";

const mensagem = (client, ambulanteId, remetente, assunto, texto) =>
  client.query("INSERT INTO mensagens (ambulante_id, remetente, assunto, texto) VALUES ($1, $2, $3, $4)", [ambulanteId, remetente, assunto, texto]);

async function main() {
  if (!HOSTS_LOCAIS.includes(host) && process.env.PERMITIR_PREPARAR_DEMO !== "sim") {
    console.error(`Recusado: o banco (${host}) não é local, e este script apaga dados.`);
    return 1;
  }
  if (!process.argv.includes("--sim")) {
    console.log("Este comando APAGA todos os cadastros de ambulantes, solicitações e mensagens (o gestor é mantido)\ne libera os pontos de venda.\nPara continuar, rode: node scripts/preparar-demo.js --sim");
    return 1;
  }

  const senha = process.env.DEMO_SENHA || crypto.randomBytes(7).toString("base64url") + "a1";
  if (senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
    console.error("DEMO_SENHA precisa ter 8 caracteres ou mais, com letras e números.");
    return 1;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Os pontos voltam ao catálogo ANTES de apagar os ambulantes: a chave estrangeira apagaria o ponto junto
    await client.query("UPDATE pontos_venda SET ambulante_id = NULL, status = $1", ["disponível"]);
    await client.query("DELETE FROM mensagens");
    await client.query("DELETE FROM solicitacao");
    await client.query("DELETE FROM usuarios WHERE perfil = 'ambulante'");
    await client.query("DELETE FROM ambulantes");

    const pontos = (await client.query("SELECT id FROM pontos_venda ORDER BY id")).rows.map((r) => r.id);
    if (pontos.length < 3) throw new Error("São necessários pelo menos 3 pontos de venda. Rode database/seed.sql.");

    const hash = await bcrypt.hash(senha, 10);
    const ids = [];
    for (const d of DEMOS) {
      const a = await client.query(
        `INSERT INTO ambulantes (nome_completo, cpf, data_nascimento, telefone, tipo_atividade, possui_mei, cnpj_mei,
                                 local_pretendido, turno, criado_em, consentimento_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Centro', $8, NOW(), NOW()) RETURNING id`,
        [d.nome, d.cpf, d.nasc, d.tel, d.atividade, d.mei, d.cnpj, d.turno]
      );
      await client.query("INSERT INTO usuarios (cpf, senha_hash, perfil, ambulante_id) VALUES ($1, $2, 'ambulante', $3)", [d.cpf, hash, a.rows[0].id]);
      ids.push(a.rows[0].id);
    }

    // João ocupa o primeiro ponto (aparece como ocupado no mapa)
    await client.query("UPDATE pontos_venda SET status = 'ocupado', ambulante_id = $1 WHERE id = $2", [ids[0], pontos[0]]);

    // Ana tem um pedido pendente no segundo ponto, para o gestor ter o que avaliar (com o aviso da RN03)
    const sol = await client.query(
      "INSERT INTO solicitacao (id_ambulante, id_ponto, data_solicitacao, status_solicitacao) VALUES ($1, $2, NOW(), 'Pendente') RETURNING id_solicitacao",
      [ids[2], pontos[1]]
    );
    await mensagem(client, ids[2], "sistema", "Solicitação recebida", `Sua solicitação (nº ${sol.rows[0].id_solicitacao}) foi registrada como Pendente e está em análise.`);

    // Maria escreveu para a prefeitura: aparece na caixa de entrada do gestor
    await mensagem(client, ids[1], "ambulante", "Dúvida sobre o MEI", "Ainda não tenho MEI. Como faço para solicitar um ponto?");

    await client.query("COMMIT");

    const gestor = await pool.query("SELECT 1 FROM usuarios WHERE perfil = 'gestor' LIMIT 1");
    console.log("Banco pronto para a demonstração.\n");
    console.log(`Senha das contas de demonstração (anote, não será mostrada de novo): ${senha}`);
    DEMOS.forEach((d) => console.log(`  ${d.nome.padEnd(22)} CPF ${d.cpf}  ${d.mei ? "com MEI" : "sem MEI"}`));
    console.log(`\nCPF livre para fazer um cadastro ao vivo: ${CPF_LIVRE_PARA_CADASTRO_AO_VIVO}`);
    console.log(`Pontos: 1 ocupado, 1 com pedido pendente (Ana) e ${pontos.length - 2} disponíveis.`);
    if (!gestor.rowCount) console.log("\nATENÇÃO: não há gestor cadastrado. Rode: node scripts/criar-gestor.js <CPF válido>");
    return 0;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Erro ao preparar o banco (nada foi alterado):", e.message);
    return 1;
  } finally {
    client.release();
  }
}

main().then((codigo) => pool.end().then(() => process.exit(codigo)));