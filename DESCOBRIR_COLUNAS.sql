-- ===============================================
-- 🔍 DESCOBRIR COLUNAS DAS TABELAS
-- ===============================================
-- Execute este script PRIMEIRO para ver quais
-- colunas existem em cada tabela
-- ===============================================

-- Ver colunas da tabela CHATS
SELECT 
  '=== TABELA: chats ===' as info
UNION ALL
SELECT 
  column_name || ' (' || data_type || ')'
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'chats'
ORDER BY ordinal_position;

-- Ver colunas da tabela MESSAGES
SELECT 
  '=== TABELA: messages ===' as info
UNION ALL
SELECT 
  column_name || ' (' || data_type || ')'
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
ORDER BY ordinal_position;

-- Ver colunas da tabela AGENTS
SELECT 
  '=== TABELA: agents ===' as info
UNION ALL
SELECT 
  column_name || ' (' || data_type || ')'
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'agents'
ORDER BY ordinal_position;

-- Ver colunas da tabela PROFILES
SELECT 
  '=== TABELA: profiles ===' as info
UNION ALL
SELECT 
  column_name || ' (' || data_type || ')'
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Ver colunas da tabela APP_SETTINGS
SELECT 
  '=== TABELA: app_settings ===' as info
UNION ALL
SELECT 
  column_name || ' (' || data_type || ')'
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'app_settings'
ORDER BY ordinal_position;

-- Ver colunas da tabela ACTIVE_MODELS
SELECT 
  '=== TABELA: active_models ===' as info
UNION ALL
SELECT 
  column_name || ' (' || data_type || ')'
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'active_models'
ORDER BY ordinal_position;

-- Ver colunas da tabela USER_SETTINGS
SELECT 
  '=== TABELA: user_settings ===' as info
UNION ALL
SELECT 
  column_name || ' (' || data_type || ')'
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_settings'
ORDER BY ordinal_position;

-- ===============================================
-- Listar TODAS as tabelas do schema public
-- ===============================================
SELECT 
  '=== TODAS AS TABELAS ===' as info
UNION ALL
SELECT 
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
