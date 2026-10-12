-- 004: turno de trabalho do ambulante (perguntado no cadastro desde o início, mas não era salvo)
-- Valores aceitos: Manhã, Tarde, Noite, Dia todo. Cadastros antigos ficam sem turno (NULL).
-- Pode ser executado mais de uma vez sem erro.
ALTER TABLE ambulantes ADD COLUMN IF NOT EXISTS turno character varying(20);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ambulantes_turno_check') THEN
        ALTER TABLE ambulantes
            ADD CONSTRAINT ambulantes_turno_check
            CHECK (turno IS NULL OR turno IN ('Manhã', 'Tarde', 'Noite', 'Dia todo'));
    END IF;
END $$;
