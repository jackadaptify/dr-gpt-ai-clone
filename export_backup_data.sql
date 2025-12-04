-- ===============================================
-- SCRIPT DE EXPORTAÇÃO COMPLETA DO BANCO DE DADOS
-- Execute este script no Supabase SQL Editor
-- ===============================================

-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard > SQL Editor
-- 2. Cole e execute cada bloco abaixo SEPARADAMENTE
-- 3. Copie o resultado de cada query e salve em arquivos CSV

-- ===============================================
-- 1. EXPORTAR TABELA: chats
-- ===============================================
COPY (
  SELECT * FROM chats ORDER BY created_at
) TO STDOUT WITH (FORMAT CSV, HEADER true);
-- Salve o resultado como: backup_chats.csv

-- ===============================================
-- 2. EXPORTAR TABELA: messages
-- ===============================================
COPY (
  SELECT * FROM messages ORDER BY created_at
) TO STDOUT WITH (FORMAT CSV, HEADER true);
-- Salve o resultado como: backup_messages.csv

-- ===============================================
-- 3. EXPORTAR TABELA: agents
-- ===============================================
COPY (
  SELECT * FROM agents ORDER BY created_at
) TO STDOUT WITH (FORMAT CSV, HEADER true);
-- Salve o resultado como: backup_agents.csv

-- ===============================================
-- 4. EXPORTAR TABELA: profiles
-- ===============================================
COPY (
  SELECT * FROM profiles ORDER BY created_at
) TO STDOUT WITH (FORMAT CSV, HEADER true);
-- Salve o resultado como: backup_profiles.csv

-- ===============================================
-- 5. EXPORTAR TABELA: app_settings
-- ===============================================
COPY (
  SELECT * FROM app_settings ORDER BY updated_at
) TO STDOUT WITH (FORMAT CSV, HEADER true);
-- Salve o resultado como: backup_app_settings.csv

-- ===============================================
-- 6. EXPORTAR TABELA: active_models
-- ===============================================
COPY (
  SELECT * FROM active_models ORDER BY created_at
) TO STDOUT WITH (FORMAT CSV, HEADER true);
-- Salve o resultado como: backup_active_models.csv

-- ===============================================
-- 7. EXPORTAR TABELA: user_settings
-- ===============================================
COPY (
  SELECT * FROM user_settings ORDER BY updated_at
) TO STDOUT WITH (FORMAT CSV, HEADER true);
-- Salve o resultado como: backup_user_settings.csv

-- ===============================================
-- ALTERNATIVA: Exportar como INSERT statements
-- ===============================================

-- Se preferir formato SQL ao invés de CSV, use os comandos abaixo:

-- Para CHATS:
SELECT 'INSERT INTO chats (id, user_id, title, created_at, updated_at, agent_id, model) VALUES' 
UNION ALL
SELECT '(' || quote_literal(id) || ', ' || quote_literal(user_id) || ', ' || 
       quote_literal(title) || ', ' || quote_literal(created_at::text) || ', ' || 
       quote_literal(updated_at::text) || ', ' || quote_nullable(agent_id) || ', ' || 
       quote_nullable(model) || '),' 
FROM chats
ORDER BY created_at;
-- (Remova a última vírgula e adicione ponto e vírgula no final)

-- Para MESSAGES:
SELECT 'INSERT INTO messages (id, chat_id, role, content, created_at, model, image_data) VALUES'
UNION ALL
SELECT '(' || quote_literal(id) || ', ' || quote_literal(chat_id) || ', ' || 
       quote_literal(role) || ', ' || quote_literal(content) || ', ' || 
       quote_literal(created_at::text) || ', ' || quote_nullable(model) || ', ' ||
       quote_nullable(image_data) || '),'
FROM messages
ORDER BY created_at;

-- Para AGENTS:
SELECT 'INSERT INTO agents (id, name, description, system_prompt, avatar, created_at, updated_at, is_public, is_active, created_by) VALUES'
UNION ALL
SELECT '(' || quote_literal(id) || ', ' || quote_literal(name) || ', ' || 
       quote_literal(description) || ', ' || quote_literal(system_prompt) || ', ' || 
       quote_nullable(avatar) || ', ' || quote_literal(created_at::text) || ', ' || 
       quote_literal(updated_at::text) || ', ' || is_public || ', ' || 
       is_active || ', ' || quote_nullable(created_by) || '),'
FROM agents
ORDER BY created_at;

-- ===============================================
-- VERIFICAÇÃO: Contar registros em cada tabela
-- ===============================================
SELECT 'chats' as tabela, COUNT(*) as total FROM chats
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'agents', COUNT(*) FROM agents
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'app_settings', COUNT(*) FROM app_settings
UNION ALL
SELECT 'active_models', COUNT(*) FROM active_models
UNION ALL
SELECT 'user_settings', COUNT(*) FROM user_settings;
