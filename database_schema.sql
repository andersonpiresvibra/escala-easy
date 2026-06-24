-- =====================================================================
-- MALHA - JETFUEL MANAGEMENT SYSTEM
-- SCRIPT DE RECRIAÇÃO DO BANCO DE DADOS - SUPABASE / POSTGRESQL
-- =====================================================================

-- Limpeza de tabelas antigas (Garante um recomeço limpo)
DROP TABLE IF EXISTS escala_diaria CASCADE;
DROP TABLE IF EXISTS cursos_certificacoes CASCADE;
DROP TABLE IF EXISTS treinamentos CASCADE;
DROP TABLE IF EXISTS datas_magnas CASCADE;
DROP TABLE IF EXISTS colaboradores CASCADE;

-- 1. Tabela Principal de Colaboradores
-- IDs sequenciais fixos, independentes de turno ou alocação (ex: '001', '002', ..., '082')
CREATE TABLE colaboradores (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUPERVISOR', 'LIDER', 'OPERADOR')),
    schedule VARCHAR(50) NOT NULL,
    grupo VARCHAR(50) NOT NULL, -- ex: 'Manhã', 'Tarde', 'Madrugada', 'VIP', 'Líderes'
    shift VARCHAR(50) NOT NULL CHECK (shift IN ('MANHÃ', 'TARDE', 'MADRUGADA', 'ADMINISTRATIVO')),
    sector VARCHAR(50) NOT NULL CHECK (sector IN ('AERÓDROMO', 'VIP', 'TREINAMENTO')),
    bh_balance INT DEFAULT 0,
    score INT DEFAULT 90
);

-- 2. Tabela de Datas Magnas (Eventos Especiais / Aniversários)
-- Vinculado diretamente ao Colaborador via ID imutável
CREATE TABLE datas_magnas (
    id SERIAL PRIMARY KEY,
    collaborator_id VARCHAR(50) NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    label VARCHAR(150) NOT NULL, -- ex: 'Aniversário', 'Casamento', 'Data Especial'
    day INT NOT NULL CHECK (day >= 1 AND day <= 31),
    month INT NOT NULL CHECK (month >= 1 AND month <= 12),
    year INT, -- Se for NULL, indica evento recorrente anual (ideal para Aniversários)!
    priority INT DEFAULT 1 CHECK (priority >= 1 AND priority <= 4), -- 1: Crítica, 2: Alta, 3: Média, 4: Baixa
    icon_type VARCHAR(50) DEFAULT 'star' CHECK (icon_type IN ('cake', 'star'))
);

-- 3. Tabela de Histórico de Treinamentos
-- Vinculado diretamente ao cadastro de cada Colaborador
CREATE TABLE treinamentos (
    id SERIAL PRIMARY KEY,
    collaborator_id VARCHAR(50) NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL, -- ex: 'Abastecimento sob Pressão', 'Segurança de Pátio e Pistas'
    completion_date DATE NOT NULL,
    expiration_date DATE, -- Data de vencimento (se aplicável para reciclagens)
    status VARCHAR(50) DEFAULT 'CONCLUÍDO' CHECK (status IN ('CONCLUÍDO', 'EXPIRADO', 'EM_CURSO'))
);

-- 4. Tabela de Cursos e Certificações Profissionais
-- Vinculado diretamente ao cadastro de cada Colaborador
CREATE TABLE cursos_certificacoes (
    id SERIAL PRIMARY KEY,
    collaborator_id VARCHAR(50) NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- ex: 'Curso de Fatores Humanos', 'Direção Defensiva de Ativos VIP'
    institution VARCHAR(150) NOT NULL DEFAULT 'GOL', -- ex: 'GOL', 'ANAC', 'INFRAERO', 'MALHA ACADEMY'
    issue_date DATE NOT NULL,
    certificate_code VARCHAR(100) -- Código identificador da certificação
);

-- Criar índices para busca rápida por colaborador (Otimização de Performance)
CREATE INDEX idx_datas_magnas_colab ON datas_magnas(collaborator_id);
CREATE INDEX idx_treinamentos_colab ON treinamentos(collaborator_id);
CREATE INDEX idx_cursos_colab ON cursos_certificacoes(collaborator_id);

-- 5. Tabela de Escalas e Turnos Diários (Células da Grade)
-- Guarda em tempo real as folgas e turnos de cada colaborador por dia
CREATE TABLE escala_diaria (
    collaborator_id VARCHAR(50) NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    day INT NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    value VARCHAR(50) NOT NULL DEFAULT '', -- ex: 'F' (Folga), 'M' (Manhã), 'T' (Tarde), 'N' (Noite), 'BH', etc.
    PRIMARY KEY (collaborator_id, day, month, year)
);

CREATE INDEX idx_escala_diaria_colab ON escala_diaria(collaborator_id);


-- =====================================================================
-- POPULANDO O INVENTÁRIO COMPLETO DE COLABORADORES (82 ATIVOS)
-- IDs SEQUENCIAIS ESTÁVEIS ('001' a '082')
-- =====================================================================

INSERT INTO colaboradores (id, name, role, schedule, grupo, shift, sector, bh_balance, score) VALUES
-- 05:00 - 14:00 (Manhã / Aeródromo)
('001', 'MICHEL', 'OPERADOR', '05:00 - 14:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('002', 'JOAO', 'OPERADOR', '05:00 - 14:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('003', 'ADAUTO', 'OPERADOR', '05:00 - 14:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('004', 'PAULO', 'OPERADOR', '05:00 - 14:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('005', 'EWERTON', 'OPERADOR', '05:00 - 14:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),

-- 06:00 - 15:00 (Manhã / Aeródromo)
('006', 'ALEX BARBOSA', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('007', 'DOUGLAS', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('008', 'TAVARES', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('009', 'JULIO', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('010', 'SANDRO', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('011', 'CLEBER', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('012', 'JOSE', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('013', 'CALAZANS', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('014', 'SILVA', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('015', 'GUILHERME', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('016', 'ILDO', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('017', 'PETERSON', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('018', 'RENILSON', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('019', 'RAMOS', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('020', 'VAGNER', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('021', 'EVANDRO', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('022', 'BARBOSA', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('023', 'CESAR JC', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('024', 'FLAVIO', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('025', 'CARLOS', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('026', 'BELENTANI', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('027', 'EULES', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('028', 'SOUZA', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('029', 'LUNA', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),
('030', 'HUAN', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90),

-- 06:00 - 16:00 (Administrativo)
('031', 'LUIS', 'OPERADOR', '06:00 - 16:00', 'Manhã', 'ADMINISTRATIVO', 'AERÓDROMO', 0, 90),
('032', 'CAIO', 'OPERADOR', '06:00 - 16:00', 'Manhã', 'ADMINISTRATIVO', 'AERÓDROMO', 0, 90),
('033', 'IDENILSON', 'OPERADOR', '06:00 - 16:00', 'Manhã', 'ADMINISTRATIVO', 'AERÓDROMO', 0, 90),

-- 14:42 - 23:30 (Tarde / Aeródromo)
('034', 'RODOLFO', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('035', 'LEONARDO', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('036', 'GILVAN', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('037', 'VIEIRA', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('038', 'LUCAS', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('039', 'WESLEY', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('040', 'PETTINELLI', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),

-- 15:15 - 00:00 (Tarde / Aeródromo)
('041', 'FREDISON', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('042', 'ALVES', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('043', 'LEANDRO EUFRA', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('044', 'JOSE EDSON', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('045', 'FEITOSA', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('046', 'LOPES', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('047', 'GIVANI', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('048', 'RENATO', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('049', 'COSTA', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('050', 'MANOEL', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('051', 'RONALD', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('052', 'KLEYSSON', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('053', 'BASTOS', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('054', 'JUNIOR', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('055', 'MILTON', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),

-- 16:00 - 00:37 (Tarde / Aeródromo)
('056', 'MARQUES', 'OPERADOR', '16:00 - 00:37', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),
('057', 'LAERCIO', 'OPERADOR', '16:00 - 00:37', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 90),

-- 21:12 - 06:00 (Madrugada / Aeródromo)
('058', 'HORACIO', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 12, 98),
('059', 'NORMAN', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', -4, 92),
('060', 'RAFAEL', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 6, 95),
('061', 'DOURADO', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 0, 89),
('062', 'VENANCIO', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', -8, 90),
('063', 'DIOGO', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 16, 97),
('064', 'WILLIAN', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 2, 91),
('065', 'SILVERIO', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 4, 93),
('066', 'REGIS', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', -2, 87),

-- LÍDERES DE TURNO
('067', 'CESARIO', 'LIDER', '06:00 - 15:00', 'Líderes', 'MANHÃ', 'AERÓDROMO', 8, 94),
('068', 'MARTINEZ', 'LIDER', '06:00 - 15:00', 'Líderes', 'MANHÃ', 'AERÓDROMO', 0, 95),
('069', 'PASCHOAL', 'LIDER', '06:00 - 15:00', 'Líderes', 'MANHÃ', 'AERÓDROMO', 0, 95),
('070', 'SPEDINI', 'LIDER', '14:30 - 23:30', 'Líderes', 'TARDE', 'AERÓDROMO', 0, 95),
('071', 'MARCIO', 'LIDER', '14:30 - 23:30', 'Líderes', 'TARDE', 'AERÓDROMO', 0, 95),
('072', 'JONATAN', 'LIDER', '14:30 - 23:30', 'Líderes', 'TARDE', 'AERÓDROMO', 0, 95),
('073', 'PEREIRA', 'LIDER', '21:12 - 06:00', 'Líderes', 'MADRUGADA', 'AERÓDROMO', 0, 99),
('074', 'GUSTAVO', 'LIDER', '21:12 - 06:00', 'Líderes', 'MADRUGADA', 'AERÓDROMO', 2, 96),

-- PÁTIO VIP
('075', 'FERNANDO', 'OPERADOR', '07:00 - 16:00', 'VIP', 'MANHÃ', 'VIP', 0, 91),
('076', 'RENATA', 'OPERADOR', '06:00 - 15:00', 'VIP', 'MANHÃ', 'VIP', 0, 93),
('077', 'ZAGO', 'OPERADOR', '06:00 - 15:00', 'VIP', 'MANHÃ', 'VIP', 0, 93),
('078', 'TORRES', 'OPERADOR', '14:30 - 23:30', 'VIP', 'TARDE', 'VIP', 0, 93),
('079', 'SOLANGE', 'OPERADOR', '14:30 - 23:30', 'VIP', 'TARDE', 'VIP', 0, 93),
('080', 'LOYOLA', 'OPERADOR', '14:30 - 23:30', 'VIP', 'TARDE', 'VIP', 0, 93),
('081', 'NORIVAL', 'OPERADOR', '21:00 - 06:00', 'VIP', 'MADRUGADA', 'VIP', 2, 94),
('082', 'PIRES', 'OPERADOR', '22:00 - 06:00', 'VIP', 'MADRUGADA', 'VIP', 2, 94);


-- =====================================================================
-- SEED DE DATAS MAGNAS / ANIVERSÁRIOS DO CADASTRO DOS COLABORADORES
-- =====================================================================

INSERT INTO datas_magnas (collaborator_id, label, day, month, year, priority, icon_type) VALUES
-- Aniversário do Horácio ('058') em 5 de Março (Recorrente)
('058', 'Aniversário do Horácio', 5, 3, NULL, 1, 'cake'),
-- Aniversário do Michel ('001') em 12 de Outubro (Recorrente)
('001', 'Aniversário do Michel', 12, 10, NULL, 2, 'cake'),
-- Aniversário do Lider Cesario ('067') em 20 de Janeiro (Recorrente)
('067', 'Aniversário do Cesário', 20, 1, NULL, 1, 'cake'),
-- Outra Data Especial para o Norival ('081') do VIP
('081', 'Aniversário do Norival', 14, 7, NULL, 2, 'cake');


-- =====================================================================
-- SEED DE HISTÓRICO DE TREINAMENTOS (CONFORMIDADE OPERACIONAL GOL)
-- =====================================================================

INSERT INTO treinamentos (collaborator_id, title, completion_date, expiration_date, status) VALUES
-- Michel ('001')
('001', 'Abastecimento sob Pressão (Hidrantes e Pátio)', '2025-01-15', '2026-01-15', 'EXPIRADO'),
('001', 'Reciclagem de Abastecimento de Aeronaves B737-8', '2026-02-10', '2027-02-10', 'CONCLUÍDO'),
-- Douglas ('007')
('007', 'Segurança em Área de Manobra de Aeronaves (SAMA)', '2025-11-05', '2026-11-05', 'CONCLUÍDO'),
-- Horacio ('058')
('058', 'Operação Noturna sob Condição Adversa', '2026-01-20', '2027-01-20', 'CONCLUÍDO'),
-- Cesario ('067')
('067', 'Liderança e Gestão de Incidentes de Abastecimento', '2025-08-12', NULL, 'CONCLUÍDO'),
-- Fernando ('075')
('075', 'Procedimentos de Atendimento de Fretamento Executivo VIP', '2026-03-01', '2027-03-01', 'CONCLUÍDO');


-- =====================================================================
-- SEED DE CURSOS E CERTIFICAÇÕES
-- =====================================================================

INSERT INTO cursos_certificacoes (collaborator_id, name, institution, issue_date, certificate_code) VALUES
-- Michel ('001')
('001', 'SGIPA - Sistema de Gestão de Segurança Operacional', 'GOL Linhas Aéreas', '2025-06-20', 'SGIPA-99214-001'),
-- Horacio ('058')
('058', 'AVSEC - Segurança da Aviação Civil contra Atos de Interferência Ilícita', 'ANAC', '2024-10-15', 'AVSEC-ANAC-2810'),
-- Cesario ('067')
('067', 'Curso Avançado de Combate a Incêndio em Aeródromos', 'MALHA ACADEMY', '2025-02-28', 'CI-ACAD-2025-99'),
-- Renata ('076')
('076', 'Direção Defensiva de Caminhões Tanque Abastecedores (CTA)', 'SENAT', '2025-04-10', 'DIRDEF-99120-VIP');


-- =====================================================================
-- HABILITANDO REPLICAÇÃO EM TEMPO REAL (REALTIME) NO SUPABASE
-- Para que as alterações no banco reflitam instantaneamente no app!
-- =====================================================================

alter publication supabase_realtime add table colaboradores;
alter publication supabase_realtime add table datas_magnas;
alter publication supabase_realtime add table treinamentos;
alter publication supabase_realtime add table cursos_certificacoes;
alter publication supabase_realtime add table escala_diaria;

