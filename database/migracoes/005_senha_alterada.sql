-- 005: data da última troca de senha (recuperação de senha pelo site)
-- Os tokens de login emitidos antes dessa data deixam de valer: a troca encerra as sessões abertas.
-- Pode ser executado mais de uma vez sem erro.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_alterada_em TIMESTAMPTZ;
