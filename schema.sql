-- Limpar tabelas existentes para evitar erros de duplicado
DROP TABLE IF EXISTS user_progress_logs CASCADE;
DROP TABLE IF EXISTS user_missions CASCADE;
DROP TABLE IF EXISTS missions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- Mission Reality - Base de Dados Supabase (PostgreSQL)
-- ==========================================

-- Habilitar a extensão para gerir UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABELA: users
-- Tabela para gerir o perfil e avanço de cada utilizador
-- ==========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, 
  avatar_url TEXT DEFAULT 'default_avatar.png',
  level INT DEFAULT 1,
  current_month_points INT DEFAULT 0,
  total_points INT DEFAULT 0,
  completed_tasks INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- TABELA: missions 
-- Catálogo de Missões possíveis do sistema
-- ==========================================
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL, 
  points_reward INT DEFAULT 5,
  difficulty INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- TABELA: user_missions
-- As missões atribuídas aos utilizadores como tarefas diárias
-- ==========================================
CREATE TABLE user_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL, 
  custom_title TEXT NOT NULL,
  category TEXT NOT NULL,
  points_reward INT DEFAULT 5,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_date DATE DEFAULT CURRENT_DATE NOT NULL, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- TABELA: user_progress_logs
-- Para uso estatístico e registo temporal
-- ==========================================
CREATE TABLE user_progress_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  points_earned INT NOT NULL,
  description TEXT,
  level_up_occurred BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Segurança (Row Level Security) básicas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Permitir inserção pública" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura pública" ON users FOR SELECT USING (true);
CREATE POLICY "Permitir atualização pública" ON users FOR UPDATE USING (true);
CREATE POLICY "Missões visíveis para todos" ON missions FOR SELECT USING (true);
