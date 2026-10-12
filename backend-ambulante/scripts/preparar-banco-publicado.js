// Prepara o banco PUBLICADO (Neon) a partir dos arquivos de database/.
// - Banco vazio: cria a estrutura (schema.sql), aplica as migrações e carrega os dados de exemplo (seed.sql).
// - Banco que já tem as tabelas: só aplica as migrações (todas podem rodar mais de uma vez); NÃO apaga nada.
// Uso (PowerShell), sem gravar a URL no .env:
//   $env:DATABASE_URL="postgresql://...neon.tech/...?sslmode=require"; node scripts/preparar-banco-publicado.js --sim
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const PASTA = path.join(__dirname, "..", "..", "database");
const MIGRACOES = ["001_cadastro.sql", "002_auth_mensagens.sql", "003_fk_avaliador.sql", "004_turno.sql"];

// O schema.sql é um pg_dump do banco local. No Neon o dono das tabelas não é "postgres" e o comentário
// da extensão exige ser o dono dela: essas linhas saem. As tabelas continuam com o nome completo (public.x).
function schemaLimpo() {
  return fs.readFileSync(path.join(PASTA, "schema.sql"), "utf8")
    .split(/\r?\n/)
    .filter((l) => !/OWNER TO /.test(l) && !/^COMMENT ON EXTENSION/.test(l) && !/set_config\('search_path'/.test(l) && !/^\\/.test(l))
    .join("\n");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Defina DATABASE_URL (a string de conexão do Neon) antes de rodar.");
    return 1;
  }
  let host;
  try { host = new URL(url).hostname; } catch (_) { console.error("DATABASE_URL inválida."); return 1; }
  if (["localhost", "127.0.0.1", "::1"].includes(host)) {
    console.error("Recusado: este script é para o banco publicado. No banco local use schema.sql e seed.sql.");
    return 1;
  }
  if (!process.argv.includes("--sim")) {
    console.log(`Vai preparar o banco em ${host}.\nPara continuar, rode de novo com --sim`);
    return 1;
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO public");
    const existe = (await client.query("SELECT to_regclass('public.ambulantes') IS NOT NULL AS ok")).rows[0].ok;

    if (!existe) {
      console.log("Banco vazio: criando a estrutura (schema.sql)...");
      await client.query("BEGIN");
      await client.query(schemaLimpo());
      await client.query("SET search_path TO public"); // o dump mexe nas configurações da sessão
      await client.query("COMMIT");
    } else {
      console.log("As tabelas já existem: a estrutura não será recriada.");
    }

    for (const m of MIGRACOES) {
      await client.query(fs.readFileSync(path.join(PASTA, "migracoes", m), "utf8"));
      console.log(`Migração ${m} aplicada.`);
    }

    if (!existe) {
      await client.query(fs.readFileSync(path.join(PASTA, "seed.sql"), "utf8"));
      console.log("Dados de exemplo carregados (seed.sql).");
    }

    // Conferência final: PostGIS funcionando e o que há no banco
    const v = await client.query("SELECT postgis_lib_version() AS postgis");
    const c = await client.query(`SELECT (SELECT COUNT(*) FROM pontos_venda)::int AS pontos,
                                         (SELECT COUNT(*) FROM ambulantes)::int AS ambulantes,
                                         (SELECT COUNT(*) FROM usuarios WHERE perfil = 'gestor')::int AS gestores`);
    const g = await client.query("SELECT COUNT(*)::int AS n FROM pontos_venda WHERE ST_AsGeoJSON(geometria) IS NOT NULL");
    console.log(`\nPronto. PostGIS ${v.rows[0].postgis} · ${c.rows[0].pontos} pontos (${g.rows[0].n} com coordenadas) · ` +
                `${c.rows[0].ambulantes} ambulantes · ${c.rows[0].gestores} gestor(es)`);
    if (!c.rows[0].gestores) console.log("Falta o gestor: node scripts/criar-gestor.js <CPF válido>  (com a mesma DATABASE_URL)");
    return 0;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Erro ao preparar o banco:", e.message);
    return 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().then((codigo) => process.exit(codigo));
