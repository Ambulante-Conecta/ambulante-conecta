-- 006: liga a solicitacao ao ambulante e ao ponto (apagar um deles apaga os pedidos junto)
-- Sem essa ligacao, apagar um ambulante deixava pedidos "orfaos": o gestor nao os via, mas ao aprovar
-- outro pedido do mesmo ponto a RN05 tentava avisar o dono inexistente e a aprovacao falhava (erro 500).
-- Pode ser executado mais de uma vez sem erro.
DO $$
BEGIN
    -- 1) Remove os pedidos orfaos (e o que depende deles na tabela antiga "mensagem")
    DELETE FROM mensagem m
     WHERE m.id_solicitacao IN (
        SELECT s.id_solicitacao FROM solicitacao s
         WHERE NOT EXISTS (SELECT 1 FROM ambulantes a WHERE a.id = s.id_ambulante)
            OR NOT EXISTS (SELECT 1 FROM pontos_venda p WHERE p.id = s.id_ponto));
    DELETE FROM solicitacao s
     WHERE NOT EXISTS (SELECT 1 FROM ambulantes a WHERE a.id = s.id_ambulante)
        OR NOT EXISTS (SELECT 1 FROM pontos_venda p WHERE p.id = s.id_ponto);

    -- 2) Cria as ligacoes
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_solicitacao_ambulante') THEN
        ALTER TABLE solicitacao
            ADD CONSTRAINT fk_solicitacao_ambulante
            FOREIGN KEY (id_ambulante) REFERENCES ambulantes(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_solicitacao_ponto') THEN
        ALTER TABLE solicitacao
            ADD CONSTRAINT fk_solicitacao_ponto
            FOREIGN KEY (id_ponto) REFERENCES pontos_venda(id) ON DELETE CASCADE;
    END IF;
END $$;
