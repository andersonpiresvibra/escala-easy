-- =====================================================================
-- SCRIPT COMPLETO DE CRIAÇÃO E CARGA DE DADOS - ESCALA EASY VIBRA
-- Execute este script no SQL Editor do seu painel do Supabase
-- =====================================================================

-- 1. ADICIONA COLUNAS CASO A TABELA "colaboradores" JÁ EXISTA SEM ELAS
-- Isso resolve o erro: ERROR: column "birthday" of relation "colaboradores" does not exist
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS special_dates JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS folga_requests JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS bh_balance INT DEFAULT 0;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS score INT DEFAULT 90;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS schedule VARCHAR(50);
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS grupo VARCHAR(100);
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS shift VARCHAR(100);
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS sector VARCHAR(100);

-- 2. GARANTE A EXISTÊNCIA DE TODAS AS TABELAS COM A ESTRUTURA COMPLETA
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id VARCHAR(100) PRIMARY KEY, -- ID com prefixo 'collab_'
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL, -- 'OPERADOR', 'LIDER', 'SUPERVISOR'
  schedule VARCHAR(50) NOT NULL, -- Horário de trabalho
  grupo VARCHAR(100) NOT NULL, -- Grupo/Turno visual
  shift VARCHAR(100) NOT NULL, -- 'MANHÃ', 'TARDE', 'MADRUGADA', 'ADMINISTRATIVO'
  sector VARCHAR(100) NOT NULL, -- 'AERÓDROMO', 'VIP'
  bh_balance INT DEFAULT 0,
  score INT DEFAULT 90,
  birthday DATE,
  special_dates JSONB DEFAULT '[]'::jsonb,
  folga_requests JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.escala_diaria (
  collaborator_id VARCHAR(100) REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  day INT NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  value VARCHAR(50) NOT NULL, -- M, T, N, ADM, F, etc.
  PRIMARY KEY (collaborator_id, day, month, year)
);

CREATE TABLE IF NOT EXISTS public.sigla_types (
  code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  color VARCHAR(50) NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS public.shift_types (
  code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  hours VARCHAR(50) NOT NULL,
  color VARCHAR(50) NOT NULL,
  "startTime" VARCHAR(50),
  "endTime" VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS public.audit_history (
  id VARCHAR(100) PRIMARY KEY,
  timestamp VARCHAR(100) NOT NULL,
  author VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  description TEXT NOT NULL
);

-- 3. LIMPEZA DE DADOS EXISTENTES PARA EVITAR DUPLICIDADE E ERROS DE CONFLITO
TRUNCATE TABLE public.escala_diaria CASCADE;
TRUNCATE TABLE public.colaboradores CASCADE;
TRUNCATE TABLE public.sigla_types CASCADE;
TRUNCATE TABLE public.shift_types CASCADE;

-- 4. INSERÇÃO DOS TIPOS DE SIGLAS PADRÃO
INSERT INTO public.sigla_types (code, label, color, description) VALUES
('M', 'Manhã', '#0ea5e9', 'Turno padrão matutino'),
('T', 'Tarde', '#f59e0b', 'Turno padrão vespertino'),
('N', 'Noite/Madrugada', '#6366f1', 'Turno padrão noturno'),
('ADM', 'Administrativo', '#10b981', 'Horário comercial administrativo'),
('F', 'Folga', '#475569', 'Folga semanal programada'),
('FE', 'Férias', '#a855f7', 'Período de férias regulamentares'),
('LM', 'Licença Médica', '#ef4444', 'Afastamento por atestado ou recomendação médica'),
('TR', 'Treinamento', '#06b6d4', 'Capacitação ou treinamento interno corporativo')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, color = EXCLUDED.color, description = EXCLUDED.description;

-- 5. INSERÇÃO DOS TURNOS PADRÃO
INSERT INTO public.shift_types (code, label, hours, color, "startTime", "endTime") VALUES
('M', 'Manhã', '7h20', '#0ea5e9', '06:00', '15:00'),
('T', 'Tarde', '7h20', '#f59e0b', '14:42', '23:30'),
('N', 'Noite/Madrugada', '7h20', '#6366f1', '21:12', '06:00'),
('ADM', 'Administrativo', '8h00', '#10b981', '08:00', '17:00')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, hours = EXCLUDED.hours, color = EXCLUDED.color, "startTime" = EXCLUDED."startTime", "endTime" = EXCLUDED."endTime";

-- 6. CARGA DOS 82 COLABORADORES ATIVOS (JULHO/2026 ATUALIZADA)
INSERT INTO public.colaboradores (id, name, role, schedule, grupo, shift, sector, bh_balance, score, birthday, special_dates, folga_requests) VALUES
-- 05:00 – 14:00 (5 Operadores - Aeródromo)
('collab_1', 'Michel', 'OPERADOR', '05:00 - 14:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 95, '1992-04-12', '[]'::jsonb, '[]'::jsonb),
('collab_2', 'Joao', 'OPERADOR', '05:00 - 14:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 2, 90, '1995-08-22', '[]'::jsonb, '[]'::jsonb),
('collab_3', 'Adauto', 'OPERADOR', '05:00 - 14:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', -1, 92, '1990-11-05', '[]'::jsonb, '[]'::jsonb),
('collab_4', 'Paulo', 'OPERADOR', '05:00 - 14:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 98, '1988-02-14', '[]'::jsonb, '[]'::jsonb),
('collab_5', 'Ewerton', 'OPERADOR', '05:00 - 14:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 4, 91, '1994-07-30', '[]'::jsonb, '[]'::jsonb),

-- 06:00 – 15:00 (24 Operadores - Aeródromo)
('collab_6', 'Alex Barbosa', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 94, '1993-01-15', '[]'::jsonb, '[]'::jsonb),
('collab_7', 'Douglas', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', -3, 88, '1991-09-18', '[]'::jsonb, '[]'::jsonb),
('collab_8', 'Tavares', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 1, 95, '1987-12-01', '[]'::jsonb, '[]'::jsonb),
('collab_9', 'Julio', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 90, '1989-05-25', '[]'::jsonb, '[]'::jsonb),
('collab_10', 'Sandro', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 2, 93, '1990-03-14', '[]'::jsonb, '[]'::jsonb),
('collab_11', 'Cleber', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', -1, 92, '1992-06-11', '[]'::jsonb, '[]'::jsonb),
('collab_12', 'Jose', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 96, '1985-04-20', '[]'::jsonb, '[]'::jsonb),
('collab_13', 'Calazans', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 5, 89, '1994-10-31', '[]'::jsonb, '[]'::jsonb),
('collab_14', 'Silva', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', -2, 91, '1991-02-08', '[]'::jsonb, '[]'::jsonb),
('collab_15', 'Guilherme', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 97, '1996-07-24', '[]'::jsonb, '[]'::jsonb),
('collab_16', 'Ildo', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 1, 90, '1988-11-13', '[]'::jsonb, '[]'::jsonb),
('collab_17', 'Peterson', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 94, '1993-05-05', '[]'::jsonb, '[]'::jsonb),
('collab_18', 'Renilson', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', -1, 87, '1990-08-30', '[]'::jsonb, '[]'::jsonb),
('collab_19', 'Ramos', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 3, 92, '1992-12-19', '[]'::jsonb, '[]'::jsonb),
('collab_20', 'Vagner', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 95, '1986-03-27', '[]'::jsonb, '[]'::jsonb),
('collab_21', 'Evandro', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 2, 89, '1991-06-03', '[]'::jsonb, '[]'::jsonb),
('collab_22', 'Cesar JC', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 93, '1989-10-14', '[]'::jsonb, '[]'::jsonb),
('collab_23', 'Flavio', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', -4, 91, '1994-01-28', '[]'::jsonb, '[]'::jsonb),
('collab_24', 'Carlos', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 1, 96, '1987-05-17', '[]'::jsonb, '[]'::jsonb),
('collab_25', 'Belentani', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 92, '1995-11-20', '[]'::jsonb, '[]'::jsonb),
('collab_26', 'Eules', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 2, 90, '1992-09-09', '[]'::jsonb, '[]'::jsonb),
('collab_27', 'Souza', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', -1, 94, '1990-07-12', '[]'::jsonb, '[]'::jsonb),
('collab_28', 'Luna', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 95, '1993-03-24', '[]'::jsonb, '[]'::jsonb),
('collab_29', 'Huan', 'OPERADOR', '06:00 - 15:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 3, 93, '1996-12-05', '[]'::jsonb, '[]'::jsonb),

-- 06:00 – 16:00 (3 Operadores - Aeródromo)
('collab_30', 'Luis', 'OPERADOR', '06:00 - 16:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 0, 95, '1991-10-10', '[]'::jsonb, '[]'::jsonb),
('collab_31', 'Caio', 'OPERADOR', '06:00 - 16:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', 1, 92, '1994-02-15', '[]'::jsonb, '[]'::jsonb),
('collab_32', 'Idenilson', 'OPERADOR', '06:00 - 16:00', 'Manhã', 'MANHÃ', 'AERÓDROMO', -2, 89, '1988-06-21', '[]'::jsonb, '[]'::jsonb),

-- 14:42 – 23:30 (7 Operadores - Aeródromo)
('collab_33', 'Rodolfo', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 93, '1993-07-07', '[]'::jsonb, '[]'::jsonb),
('collab_34', 'Leonardo', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', -1, 94, '1995-11-11', '[]'::jsonb, '[]'::jsonb),
('collab_35', 'Junior', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', 2, 91, '1990-01-02', '[]'::jsonb, '[]'::jsonb),
('collab_36', 'Kleysson', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 96, '1989-08-14', '[]'::jsonb, '[]'::jsonb),
('collab_37', 'Lucas', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', 3, 90, '1996-05-19', '[]'::jsonb, '[]'::jsonb),
('collab_38', 'Wesley', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', -3, 88, '1992-03-31', '[]'::jsonb, '[]'::jsonb),
('collab_39', 'Pettinelli', 'OPERADOR', '14:42 - 23:30', 'Tarde', 'TARDE', 'AERÓDROMO', 1, 95, '1987-12-25', '[]'::jsonb, '[]'::jsonb),

-- 15:15 – 00:00 (17 Operadores - Aeródromo)
('collab_40', 'Predison', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 94, '1994-09-09', '[]'::jsonb, '[]'::jsonb),
('collab_41', 'Alves', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', -2, 90, '1991-05-15', '[]'::jsonb, '[]'::jsonb),
('collab_42', 'Leandro Eufra', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 1, 92, '1993-02-28', '[]'::jsonb, '[]'::jsonb),
('collab_43', 'Jose Edson', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 95, '1986-12-14', '[]'::jsonb, '[]'::jsonb),
('collab_44', 'Feitosa', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 4, 87, '1989-10-05', '[]'::jsonb, '[]'::jsonb),
('collab_45', 'Lopes', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', -1, 93, '1992-04-22', '[]'::jsonb, '[]'::jsonb),
('collab_46', 'Givani', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 91, '1988-07-17', '[]'::jsonb, '[]'::jsonb),
('collab_47', 'Renato', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 2, 96, '1995-03-03', '[]'::jsonb, '[]'::jsonb),
('collab_48', 'Costa', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', -3, 89, '1990-11-12', '[]'::jsonb, '[]'::jsonb),
('collab_49', 'Manoel', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 1, 94, '1987-08-25', '[]'::jsonb, '[]'::jsonb),
('collab_50', 'Ronald', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 98, '1996-01-30', '[]'::jsonb, '[]'::jsonb),
('collab_51', 'Barbosa', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 97, '1994-06-18', '[]'::jsonb, '[]'::jsonb),
('collab_52', 'Bastos', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 2, 95, '1991-09-04', '[]'::jsonb, '[]'::jsonb),
('collab_53', 'Gilvan', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', -1, 92, '1989-12-08', '[]'::jsonb, '[]'::jsonb),
('collab_54', 'Milton', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 3, 91, '1992-05-27', '[]'::jsonb, '[]'::jsonb),
('collab_55', 'Marques', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 0, 94, '1995-10-15', '[]'::jsonb, '[]'::jsonb),
('collab_56', 'Laercio', 'OPERADOR', '15:15 - 00:00', 'Tarde', 'TARDE', 'AERÓDROMO', 1, 96, '1993-03-12', '[]'::jsonb, '[]'::jsonb),

-- 21:12 – 06:00 (9 Operadores - Aeródromo)
('collab_57', 'Horacio', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 0, 95, '1990-02-28', '[]'::jsonb, '[]'::jsonb),
('collab_58', 'Norman', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', -1, 91, '1992-07-14', '[]'::jsonb, '[]'::jsonb),
('collab_59', 'Rafael', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 2, 93, '1994-11-23', '[]'::jsonb, '[]'::jsonb),
('collab_60', 'Dourado', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 0, 96, '1987-04-05', '[]'::jsonb, '[]'::jsonb),
('collab_61', 'Venancio', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 3, 89, '1991-09-30', '[]'::jsonb, '[]'::jsonb),
('collab_62', 'Diogo', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', -2, 92, '1993-01-08', '[]'::jsonb, '[]'::jsonb),
('collab_63', 'Willian', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 0, 94, '1989-06-12', '[]'::jsonb, '[]'::jsonb),
('collab_64', 'Silverio', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 1, 95, '1995-05-17', '[]'::jsonb, '[]'::jsonb),
('collab_65', 'Regis', 'OPERADOR', '21:12 - 06:00', 'Madrugada', 'MADRUGADA', 'AERÓDROMO', 0, 90, '1992-10-25', '[]'::jsonb, '[]'::jsonb),

-- Líderes de Turno (9 Líderes - Aeródromo)
-- 06:00 – 15:00
('collab_66', 'Cesario', 'LIDER', '06:00 - 15:00', 'Líderes', 'MANHÃ', 'AERÓDROMO', 0, 98, '1985-03-12', '[]'::jsonb, '[]'::jsonb),
('collab_67', 'Martinez', 'LIDER', '06:00 - 15:00', 'Líderes', 'MANHÃ', 'AERÓDROMO', 1, 97, '1988-08-20', '[]'::jsonb, '[]'::jsonb),
('collab_68', 'Paschoal', 'LIDER', '06:00 - 15:00', 'Líderes', 'MANHÃ', 'AERÓDROMO', -1, 96, '1986-01-15', '[]'::jsonb, '[]'::jsonb),
('collab_69', 'Marcio', 'LIDER', '06:00 - 15:00', 'Líderes', 'MANHÃ', 'AERÓDROMO', 0, 99, '1984-07-29', '[]'::jsonb, '[]'::jsonb),
-- 14:30 – 23:30
('collab_70', 'Spedini', 'LIDER', '14:30 - 23:30', 'Líderes', 'TARDE', 'AERÓDROMO', 2, 95, '1989-11-04', '[]'::jsonb, '[]'::jsonb),
('collab_71', 'Marcko', 'LIDER', '14:30 - 23:30', 'Líderes', 'TARDE', 'AERÓDROMO', 0, 96, '1991-04-18', '[]'::jsonb, '[]'::jsonb),
('collab_72', 'Jonatan', 'LIDER', '14:30 - 23:30', 'Líderes', 'TARDE', 'AERÓDROMO', -2, 94, '1993-09-02', '[]'::jsonb, '[]'::jsonb),
-- 21:12 – 06:00
('collab_73', 'Pereira', 'LIDER', '21:12 - 06:00', 'Líderes', 'MADRUGADA', 'AERÓDROMO', 0, 97, '1987-05-11', '[]'::jsonb, '[]'::jsonb),
('collab_74', 'Gustavo', 'LIDER', '21:12 - 06:00', 'Líderes', 'MADRUGADA', 'AERÓDROMO', 1, 96, '1990-12-24', '[]'::jsonb, '[]'::jsonb),

-- Pátio VIP (8 Operadores - VIP)
('collab_75', 'Fernando', 'OPERADOR', '07:00 - 16:00', 'VIP', 'MANHÃ', 'VIP', 0, 94, '1993-06-18', '[]'::jsonb, '[]'::jsonb),
('collab_76', 'Renata', 'OPERADOR', '06:00 - 15:00', 'VIP', 'MANHÃ', 'VIP', -1, 95, '1995-02-14', '[]'::jsonb, '[]'::jsonb),
('collab_77', 'Zago', 'OPERADOR', '06:00 - 15:00', 'VIP', 'MANHÃ', 'VIP', 1, 92, '1991-10-30', '[]'::jsonb, '[]'::jsonb),
('collab_78', 'Torres', 'OPERADOR', '06:00 - 15:00', 'VIP', 'MANHÃ', 'VIP', 0, 93, '1989-04-05', '[]'::jsonb, '[]'::jsonb),
('collab_79', 'Solange', 'OPERADOR', '14:30 - 23:30', 'VIP', 'TARDE', 'VIP', 2, 96, '1992-08-12', '[]'::jsonb, '[]'::jsonb),
('collab_80', 'Loyola', 'OPERADOR', '14:30 - 23:30', 'VIP', 'TARDE', 'VIP', 0, 94, '1994-01-22', '[]'::jsonb, '[]'::jsonb),
('collab_81', 'Norival', 'OPERADOR', '21:00 - 06:00', 'VIP', 'MADRUGADA', 'VIP', -1, 91, '1988-12-07', '[]'::jsonb, '[]'::jsonb),
('collab_82', 'Pires', 'OPERADOR', '22:00 - 07:00', 'VIP', 'MADRUGADA', 'VIP', 0, 95, '1990-07-15', '[]'::jsonb, '[]'::jsonb);

-- 7. POPULA A TABELA "escala_diaria" COM FOLGAS INTELIGENTES (5x2) PARA JULHO DE 2026 USANDO CROSS JOIN (COMPATÍVEL SUPABASE)
INSERT INTO public.escala_diaria (collaborator_id, day, month, year, value)
WITH collab_indexed AS (
  SELECT 
    id, 
    shift,
    (ROW_NUMBER() OVER (ORDER BY id) - 1) AS collab_idx
  FROM public.colaboradores
),
days AS (
  SELECT generate_series(1, 31) AS day
)
SELECT 
  c.id AS collaborator_id,
  d.day,
  7 AS month,
  2026 AS year,
  CASE 
    -- Se for folga baseada no escalonamento 5x2 inteligente
    WHEN (
      (c.collab_idx % 3 = 0 AND ((d.day + 2) % 7 = 6 OR (d.day + 2) % 7 = 0)) OR
      (c.collab_idx % 3 = 1 AND ((d.day + 2) % 7 = 5 OR (d.day + 2) % 7 = 6)) OR
      (c.collab_idx % 3 = 2 AND ((d.day + 2) % 7 = 0 OR (d.day + 2) % 7 = 1))
    ) THEN 'F'
    -- Senão, usa o código do turno correspondente
    ELSE 
      CASE 
        WHEN c.shift = 'MADRUGADA' THEN 'N'
        WHEN c.shift = 'TARDE' THEN 'T'
        WHEN c.shift = 'ADMINISTRATIVO' THEN 'ADM'
        ELSE 'M'
      END
  END AS value
FROM collab_indexed c
CROSS JOIN days d
ON CONFLICT (collaborator_id, day, month, year) DO UPDATE SET value = EXCLUDED.value;

-- 8. REGISTRO DE AUDITORIA DE CRIAÇÃO DA ESCALA ATUALIZADA
INSERT INTO public.audit_history (id, timestamp, author, action, description)
VALUES (
  'bk_init_' || EXTRACT(EPOCH FROM NOW())::int,
  TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
  'Sistema (Malha Eng.)',
  'CARGA_INICIAL',
  'Sincronização de todos os 82 colaboradores e ativação da nova escala para Julho/2026.'
);
