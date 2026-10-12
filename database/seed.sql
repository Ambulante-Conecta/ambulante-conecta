-- Dados de teste (fictícios). ATENÇÃO: apaga os dados atuais das 3 tabelas e reinicia os IDs.
-- Use só em banco de desenvolvimento.
-- Os valores de status ('ocupado', 'disponível') precisam bater com a restrição pontos_venda_status_check do banco.
TRUNCATE solicitacao, pontos_venda, ambulantes RESTART IDENTITY CASCADE;

-- CPF e CNPJ fictícios, porém válidos; CPF e telefone só com dígitos (como a API grava)
INSERT INTO ambulantes (nome_completo, cpf, data_nascimento, telefone, email, tipo_atividade, possui_mei, cnpj_mei, local_pretendido, turno)
VALUES
('João da Silva',  '52998224725', '1985-05-12', '92991112222', 'joao.silva@email.com',     'Alimentação', TRUE,  '11222333000181', 'Centro', 'Manhã'),
('Maria Oliveira', '11144477735', '1990-08-20', '92988887777', 'maria.oliveira@email.com', 'Artesanato', FALSE, NULL,              'Centro', 'Tarde'),
('Ana Souza',      '93541134780', '1992-03-03', '92977776666', 'ana.souza@email.com',      'Vestuário',   TRUE,  '11444777000161', 'Centro', 'Dia todo');

-- Pontos de venda. Coordenadas: ST_MakePoint(LONGITUDE, LATITUDE). Valores aproximados: confira no Google Maps.
-- Ocupados (ambulante_id preenchido)
INSERT INTO pontos_venda (ambulante_id, descricao_local, bairro, geometria, status) VALUES
(1, 'Próximo ao Mercado Municipal Adolpho Lisboa', 'Centro', ST_SetSRID(ST_MakePoint(-60.0232, -3.1302), 4326), 'ocupado'),
(2, 'Praça da Matriz',                              'Centro', ST_SetSRID(ST_MakePoint(-60.0217, -3.1317), 4326), 'ocupado');

-- Disponíveis (ambulante_id nulo)
INSERT INTO pontos_venda (descricao_local, bairro, geometria, status) VALUES
('Calçada da Av. Eduardo Ribeiro',        'Centro', ST_SetSRID(ST_MakePoint(-60.0238, -3.1322), 4326), 'disponível'),
('Entorno da Praça Heliodoro Balbi',      'Centro', ST_SetSRID(ST_MakePoint(-60.0210, -3.1296), 4326), 'disponível'),
('Rua Henrique Martins, esquina',         'Centro', ST_SetSRID(ST_MakePoint(-60.0252, -3.1337), 4326), 'disponível'),
('Largo São Sebastião, lateral da praça', 'Centro', ST_SetSRID(ST_MakePoint(-60.0228, -3.1308), 4326), 'disponível');

-- Uma solicitação pendente de exemplo (Ana pede o ponto 5), para o gestor ter o que avaliar depois
INSERT INTO solicitacao (id_ambulante, id_ponto, data_solicitacao, status_solicitacao)
VALUES (3, 5, NOW(), 'Pendente');