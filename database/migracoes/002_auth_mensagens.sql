-- 002: login (usuarios), mensagens e consentimento LGPD
-- Pode ser executado mais de uma vez: todos os comandos verificam se ja existem.

-- 1) Usuarios que podem entrar no sistema (RN01, RN06)
--    perfil 'ambulante' -> ligado a um cadastro em ambulantes
--    perfil 'gestor'    -> nao tem cadastro de ambulante
CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    cpf           VARCHAR(14) UNIQUE NOT NULL,
    senha_hash    VARCHAR(100) NOT NULL,            -- hash bcrypt (60 caracteres); nunca a senha em texto
    perfil        VARCHAR(20) NOT NULL CHECK (perfil IN ('ambulante', 'gestor')),
    ambulante_id  INT UNIQUE REFERENCES ambulantes(id) ON DELETE CASCADE,
    criado_em     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_perfil_vinculo_chk CHECK (
        (perfil = 'ambulante' AND ambulante_id IS NOT NULL) OR
        (perfil = 'gestor'    AND ambulante_id IS NULL)
    )
);

-- 2) Mensagens (RF05). Cada mensagem pertence a conversa de um ambulante.
--    remetente indica quem escreveu: o proprio ambulante, o gestor ou o sistema.
CREATE TABLE IF NOT EXISTS mensagens (
    id            SERIAL PRIMARY KEY,
    ambulante_id  INT NOT NULL REFERENCES ambulantes(id) ON DELETE CASCADE,
    remetente     VARCHAR(20) NOT NULL CHECK (remetente IN ('ambulante', 'gestor', 'sistema')),
    usuario_id    INT REFERENCES usuarios(id) ON DELETE SET NULL,   -- quem enviou (nulo para o sistema)
    assunto       VARCHAR(120) NOT NULL,
    texto         TEXT NOT NULL,
    lida          BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mensagens_ambulante ON mensagens (ambulante_id, criado_em DESC);

-- 3) Registro do aceite da LGPD no cadastro (RN05)
ALTER TABLE ambulantes ADD COLUMN IF NOT EXISTS consentimento_em TIMESTAMP;