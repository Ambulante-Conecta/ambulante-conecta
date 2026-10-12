-- 001: ajustes do cadastro (ja aplicado no banco de desenvolvimento)
-- Pode ser executado mais de uma vez sem causar erro.
--
-- Observacao: a coluna pontos_venda.status (com sua restricao CHECK) e a tabela solicitacao
-- foram criadas direto no pgAdmin e nao tem arquivo proprio. O schema.sql, gerado com pg_dump,
-- ja contem essas estruturas.

-- 1) Local pretendido informado no cadastro
ALTER TABLE ambulantes ADD COLUMN IF NOT EXISTS local_pretendido VARCHAR(255);

-- 2) O CPF passa a ser gravado so com digitos (11 caracteres), como a API faz
UPDATE ambulantes SET cpf = regexp_replace(cpf, '\D', '', 'g');

-- 3) A coluna cpf ja e UNIQUE no schema (indice ambulantes_cpf_key).
--    O indice ux_ambulantes_cpf, criado antes, era duplicado e deve ser removido.
DROP INDEX IF EXISTS ux_ambulantes_cpf;