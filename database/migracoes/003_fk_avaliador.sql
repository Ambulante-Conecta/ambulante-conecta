-- 003: liga o avaliador da solicitacao a um usuario (o gestor que decidiu)
-- Antes de rodar, confira se ha ids antigos que nao existem em usuarios:
-- Pode ser executado mais de uma vez sem erro.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_solicitacao_avaliador') THEN
        ALTER TABLE solicitacao
            ADD CONSTRAINT fk_solicitacao_avaliador
            FOREIGN KEY (id_avaliador) REFERENCES usuarios(id);
    END IF;
END $$;