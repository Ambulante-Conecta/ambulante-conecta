-- A coluna ambulantes.local_pretendido já existe no seu banco; nada para criar.

-- 1) A API grava o CPF só com dígitos (11 caracteres). Confira como estão os dados atuais:
--    SELECT id, cpf FROM ambulantes LIMIT 10;
--    Se houver CPF com máscara (000.000.000-00), normalize antes do índice:
-- UPDATE ambulantes SET cpf = regexp_replace(cpf, '\D', '', 'g');

-- 2) Impede CPF repetido (a API responde 409). Falha se já houver duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS ux_ambulantes_cpf ON ambulantes (cpf);

-- 3) Conferências que a API assume:
--    Valores de status dos pontos (a API compara com "disponivel", sem diferenciar maiúsculas e o acento de "Disponível"):
--    SELECT DISTINCT status FROM pontos_venda;
--    Sistema de coordenadas (o mapa espera longitude/latitude, SRID 4326):
--    SELECT DISTINCT ST_SRID(geometria) FROM pontos_venda;