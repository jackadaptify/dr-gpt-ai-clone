-- ===============================================
-- 📥 EXPORTAR TUDO - TESTADO E FUNCIONANDO (v2)
-- ===============================================
-- Execute CADA BLOCO separadamente no SQL Editor
-- Copie cada resultado e junte tudo em backup_dados.sql
-- ===============================================

-- ===============================================
-- 1. PRIMEIRO: Contar quantos dados existem
-- ===============================================
SELECT 'chats' as tabela, COUNT(*) as total FROM chats
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL  
SELECT 'agents', COUNT(*) FROM agents
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'app_settings', COUNT(*) FROM app_settings WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_settings')
UNION ALL
SELECT 'active_models', COUNT(*) FROM active_models WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_models')
UNION ALL
SELECT 'user_settings', COUNT(*) FROM user_settings WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings');

-- ===============================================
-- 2. EXPORTAR: chats
-- ===============================================
-- Execute esta query separadamente
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '-- DADOS DA TABELA: chats';
  
  FOR rec IN SELECT * FROM chats ORDER BY created_at
  LOOP
    RAISE NOTICE 'INSERT INTO chats (id, user_id, title, created_at, updated_at, agent_id, model_id) VALUES (%, %, %, %, %, %, %);',
      quote_literal(rec.id::text),
      quote_literal(rec.user_id::text),
      COALESCE(quote_literal(rec.title), 'NULL'),
      quote_literal(rec.created_at::text),
      COALESCE(quote_literal(rec.updated_at::text), 'NULL'),
      COALESCE(quote_literal(rec.agent_id), 'NULL'),
      COALESCE(quote_literal(rec.model_id), 'NULL');
  END LOOP;
END $$;

--===============================================
-- 3. EXPORTAR: messages
-- ===============================================
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '-- DADOS DA TABELA: messages';
  
  FOR rec IN SELECT * FROM messages ORDER BY created_at
  LOOP
    RAISE NOTICE 'INSERT INTO messages (id, chat_id, role, content, created_at) VALUES (%, %, %, %, %);',
      quote_literal(rec.id::text),
      quote_literal(rec.chat_id::text),
      quote_literal(rec.role),
      COALESCE(quote_literal(rec.content), 'NULL'),
      quote_literal(rec.created_at::text);
  END LOOP;
END $$;

-- ===============================================
-- 4. EXPORTAR: agents
-- ===============================================
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '-- DADOS DA TABELA: agents';
  
  FOR rec IN SELECT * FROM agents ORDER BY created_at
  LOOP
    RAISE NOTICE 'INSERT INTO agents (id, name, description, system_prompt, avatar, created_at, updated_at, is_public, is_active, created_by) VALUES (%, %, %, %, %, %, %, %, %, %);',
      quote_literal(rec.id),
      quote_literal(rec.name),
      quote_literal(rec.description),
      quote_literal(rec.system_prompt),
      COALESCE(quote_literal(rec.avatar), 'NULL'),
      quote_literal(rec.created_at::text),
      quote_literal(rec.updated_at::text),
      rec.is_public::text,
      rec.is_active::text,
      COALESCE(quote_literal(rec.created_by::text), 'NULL');
  END LOOP;
END $$;

-- ===============================================
-- 5. EXPORTAR: profiles  
-- ===============================================
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '-- DADOS DA TABELA: profiles';
  
  FOR rec IN SELECT * FROM profiles
  LOOP
    RAISE NOTICE 'INSERT INTO profiles (id, email, role, created_at, updated_at) VALUES (%, %, %, %, %);',
      quote_literal(rec.id::text),
      COALESCE(quote_literal(rec.email), 'NULL'),
      COALESCE(quote_literal(rec.role), '''user'''),
      COALESCE(quote_literal(rec.created_at::text), 'NOW()'),
      COALESCE(quote_literal(rec.updated_at::text), 'NOW()');
  END LOOP;
END $$;

-- TABELA: agents
-- ===============================================
SELECT 
  'INSERT INTO agents (id, name, description, system_prompt, avatar, created_at, updated_at, is_public, is_active, created_by) VALUES ' ||
  string_agg(
    '(' || 
    quote_literal(id) || ', ' ||
    quote_literal(name) || ', ' ||
    quote_literal(description) || ', ' ||
    quote_literal(system_prompt) || ', ' ||
    COALESCE(quote_literal(avatar), 'NULL') || ', ' ||
    quote_literal(created_at::text) || ', ' ||
    quote_literal(updated_at::text) || ', ' ||
    is_public::text || ', ' ||
    is_active::text || ', ' ||
    COALESCE(quote_literal(created_by::text), 'NULL') ||
    ')',
    ', '
  ) || ';'
FROM agents;

-- TABELA: profiles
-- ===============================================
SELECT 
  'INSERT INTO profiles (id, email, role, created_at, updated_at) VALUES ' ||
  string_agg(
    '(' || 
    quote_literal(id::text) || ', ' ||
    COALESCE(quote_literal(email), 'NULL') || ', ' ||
    quote_literal(role) || ', ' ||
    quote_literal(created_at::text) || ', ' ||
    quote_literal(updated_at::text) ||
    ')',
    ', '
  ) || ';'
FROM profiles;

-- TABELA: app_settings
-- ===============================================
SELECT 
  'INSERT INTO app_settings (id, openrouter_api_key, default_model, updated_at) VALUES ' ||
  string_agg(
    '(' || 
    quote_literal(id::text) || ', ' ||
    COALESCE(quote_literal(openrouter_api_key), 'NULL') || ', ' ||
    COALESCE(quote_literal(default_model), 'NULL') || ', ' ||
    quote_literal(updated_at::text) ||
    ')',
    ', '
  ) || ';'
FROM app_settings;

-- TABELA: active_models
-- ===============================================
SELECT 
  'INSERT INTO active_models (id, model_id, is_active, created_at) VALUES ' ||
  string_agg(
    '(' || 
    quote_literal(id::text) || ', ' ||
    quote_literal(model_id) || ', ' ||
    is_active::text || ', ' ||
    quote_literal(created_at::text) ||
    ')',
    ', '
  ) || ';'
FROM active_models;

-- TABELA: user_settings
-- ===============================================
SELECT 
  'INSERT INTO user_settings (id, user_id, nickname, specialty, other_specialty, professional_focus, created_at, updated_at) VALUES ' ||
  string_agg(
    '(' || 
    quote_literal(id::text) || ', ' ||
    quote_literal(user_id::text) || ', ' ||
    COALESCE(quote_literal(nickname), 'NULL') || ', ' ||
    COALESCE(quote_literal(specialty), 'NULL') || ', ' ||
    COALESCE(quote_literal(other_specialty), 'NULL') || ', ' ||
    COALESCE(quote_literal(professional_focus), 'NULL') || ', ' ||
    quote_literal(created_at::text) || ', ' ||
    quote_literal(updated_at::text) ||
    ')',
    ', '
  ) || ';'
FROM user_settings;

-- ===============================================
-- ✅ PRONTO!
-- ===============================================
-- Copie TODA a saída acima e salve como backup_dados.sql
-- Este arquivo pode ser executado em qualquer Supabase novo
-- para restaurar TODOS os dados!
-- ===============================================
