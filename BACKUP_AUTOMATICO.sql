-- ===============================================
-- 📥 BACKUP AUTOMÁTICO - SEM ERROS! (v3)
-- ===============================================
-- Este script funciona independente da estrutura
-- Ele descobre as colunas automaticamente
-- ===============================================

-- INSTRUÇÕES:
-- 1. Cole TUDO no SQL Editor do Supabase
-- 2. Clique em RUN
-- 3. Olhe na aba "Messages" ou "Notices"
-- 4. Copie TODOS os INSERTs
-- 5. Salve em backup_dados.sql
-- ===============================================

-- EXPORTAR CHATS
DO $$
DECLARE
  rec RECORD;
  insert_sql TEXT;
BEGIN
  RAISE NOTICE '-- ========================================';
  RAISE NOTICE '-- TABELA: chats';
  RAISE NOTICE '-- ========================================';
  RAISE NOTICE '';
  
  FOR rec IN SELECT * FROM chats ORDER BY created_at
  LOOP
    insert_sql := format(
      'INSERT INTO chats (%s) VALUES (%s);',
      (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
       FROM information_schema.columns 
       WHERE table_name = 'chats' AND table_schema = 'public'),
      (SELECT string_agg(
         CASE 
           WHEN column_name = 'id' THEN quote_literal(rec.id::text)
           WHEN column_name = 'user_id' THEN quote_literal(rec.user_id::text)
           WHEN column_name = 'title' THEN COALESCE(quote_literal(rec.title), 'NULL')
           WHEN column_name = 'created_at' THEN quote_literal(rec.created_at::text)
           WHEN column_name = 'updated_at' THEN COALESCE(quote_literal(rec.updated_at::text), 'NULL')
           WHEN column_name = 'agent_id' THEN COALESCE(quote_literal(rec.agent_id), 'NULL')
           WHEN column_name = 'model_id' THEN COALESCE(quote_literal(rec.model_id), 'NULL')
           ELSE 'NULL'
         END,
         ', ' ORDER BY ordinal_position)
       FROM information_schema.columns 
       WHERE table_name = 'chats' AND table_schema = 'public')
    );
    RAISE NOTICE '%', insert_sql;
  END LOOP;
  RAISE NOTICE '';
END $$;

-- EXPORTAR MESSAGES
DO $$
DECLARE
  rec RECORD;
  insert_sql TEXT;
BEGIN
  RAISE NOTICE '-- ========================================';
  RAISE NOTICE '-- TABELA: messages';
  RAISE NOTICE '-- ========================================';
  RAISE NOTICE '';
  
  FOR rec IN SELECT * FROM messages ORDER BY created_at
  LOOP
    insert_sql := format(
      'INSERT INTO messages (%s) VALUES (%s);',
      (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
       FROM information_schema.columns 
       WHERE table_name = 'messages' AND table_schema = 'public'),
      (SELECT string_agg(
         CASE 
           WHEN column_name = 'id' THEN quote_literal(rec.id::text)
           WHEN column_name = 'chat_id' THEN quote_literal(rec.chat_id::text)
           WHEN column_name = 'role' THEN quote_literal(rec.role)
           WHEN column_name = 'content' THEN COALESCE(quote_literal(rec.content), 'NULL')
           WHEN column_name = 'created_at' THEN quote_literal(rec.created_at::text)
           ELSE 'NULL'
         END,
         ', ' ORDER BY ordinal_position)
       FROM information_schema.columns 
       WHERE table_name = 'messages' AND table_schema = 'public')
    );
    RAISE NOTICE '%', insert_sql;
  END LOOP;
  RAISE NOTICE '';
END $$;

-- EXPORTAR AGENTS (com estrutura flexível)
DO $$
DECLARE
  rec RECORD;
  cols TEXT[];
  vals TEXT[];
  col_name TEXT;
BEGIN
  RAISE NOTICE '-- ========================================';
  RAISE NOTICE '-- TABELA: agents';
  RAISE NOTICE '-- ========================================';
  RAISE NOTICE '';
  
  FOR rec IN SELECT * FROM agents ORDER BY created_at
  LOOP
    cols := ARRAY[]::TEXT[];
    vals := ARRAY[]::TEXT[];
    
    -- Pegar todas as colunas dinamicamente
    FOR col_name IN 
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agents' AND table_schema = 'public'
      ORDER BY ordinal_position
    LOOP
      cols := array_append(cols, col_name);
      
      -- Usar to_jsonb para acessar valores dinamicamente
      vals := array_append(vals, 
        CASE 
          WHEN (to_jsonb(rec)->col_name) IS NOT NULL 
          THEN quote_literal((to_jsonb(rec)->>col_name)::text)
          ELSE 'NULL'
        END
      );
    END LOOP;
    
    RAISE NOTICE 'INSERT INTO agents (%) VALUES (%);',
      array_to_string(cols, ', '),
      array_to_string(vals, ', ');
  END LOOP;
  RAISE NOTICE '';
END $$;

-- EXPORTAR PROFILES
DO $$
DECLARE
  rec RECORD;
  cols TEXT[];
  vals TEXT[];
  col_name TEXT;
BEGIN
  RAISE NOTICE '-- ========================================';
  RAISE NOTICE '-- TABELA: profiles';
  RAISE NOTICE '-- ========================================';
  RAISE NOTICE '';
  
  FOR rec IN SELECT * FROM profiles
  LOOP
    cols := ARRAY[]::TEXT[];
    vals := ARRAY[]::TEXT[];
    
    FOR col_name IN 
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' AND table_schema = 'public'
      ORDER BY ordinal_position
    LOOP
      cols := array_append(cols, col_name);
      vals := array_append(vals, 
        CASE 
          WHEN (to_jsonb(rec)->col_name) IS NOT NULL 
          THEN quote_literal((to_jsonb(rec)->>col_name)::text)
          ELSE 'NULL'
        END
      );
    END LOOP;
    
    RAISE NOTICE 'INSERT INTO profiles (%) VALUES (%);',
      array_to_string(cols, ', '),
      array_to_string(vals, ', ');
  END LOOP;
  RAISE NOTICE '';
END $$;

-- EXPORTAR APP_SETTINGS (se existir)
DO $$
DECLARE
  rec RECORD;
  cols TEXT[];
  vals TEXT[];
  col_name TEXT;
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'app_settings' AND table_schema = 'public'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '-- ========================================';
    RAISE NOTICE '-- TABELA: app_settings';
    RAISE NOTICE '-- ========================================';
    RAISE NOTICE '';
    
    FOR rec IN SELECT * FROM app_settings
    LOOP
      cols := ARRAY[]::TEXT[];
      vals := ARRAY[]::TEXT[];
      
      FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'app_settings' AND table_schema = 'public'
        ORDER BY ordinal_position
      LOOP
        cols := array_append(cols, col_name);
        vals := array_append(vals, 
          CASE 
            WHEN (to_jsonb(rec)->col_name) IS NOT NULL 
            THEN quote_literal((to_jsonb(rec)->>col_name)::text)
            ELSE 'NULL'
          END
        );
      END LOOP;
      
      RAISE NOTICE 'INSERT INTO app_settings (%) VALUES (%);',
        array_to_string(cols, ', '),
        array_to_string(vals, ', ');
    END LOOP;
    RAISE NOTICE '';
  END IF;
END $$;

-- EXPORTAR ACTIVE_MODELS (se existir)
DO $$
DECLARE
  rec RECORD;
  cols TEXT[];
  vals TEXT[];
  col_name TEXT;
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'active_models' AND table_schema = 'public'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '-- ========================================';
    RAISE NOTICE '-- TABELA: active_models';
    RAISE NOTICE '-- ========================================';
    RAISE NOTICE '';
    
    FOR rec IN SELECT * FROM active_models
    LOOP
      cols := ARRAY[]::TEXT[];
      vals := ARRAY[]::TEXT[];
      
      FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'active_models' AND table_schema = 'public'
        ORDER BY ordinal_position
      LOOP
        cols := array_append(cols, col_name);
        vals := array_append(vals, 
          CASE 
            WHEN (to_jsonb(rec)->col_name) IS NOT NULL 
            THEN quote_literal((to_jsonb(rec)->>col_name)::text)
            ELSE 'NULL'
          END
        );
      END LOOP;
      
      RAISE NOTICE 'INSERT INTO active_models (%) VALUES (%);',
        array_to_string(cols, ', '),
        array_to_string(vals, ', ');
    END LOOP;
    RAISE NOTICE '';
  END IF;
END $$;

-- EXPORTAR USER_SETTINGS (se existir)
DO $$
DECLARE
  rec RECORD;
  cols TEXT[];
  vals TEXT[];
  col_name TEXT;
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_settings' AND table_schema = 'public'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '-- ========================================';
    RAISE NOTICE '-- TABELA: user_settings';
    RAISE NOTICE '-- ========================================';
    RAISE NOTICE '';
    
    FOR rec IN SELECT * FROM user_settings
    LOOP
      cols := ARRAY[]::TEXT[];
      vals := ARRAY[]::TEXT[];
      
      FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_settings' AND table_schema = 'public'
        ORDER BY ordinal_position
      LOOP
        cols := array_append(cols, col_name);
        vals := array_append(vals, 
          CASE 
            WHEN (to_jsonb(rec)->col_name) IS NOT NULL 
            THEN quote_literal((to_jsonb(rec)->>col_name)::text)
            ELSE 'NULL'
          END
        );
      END LOOP;
      
      RAISE NOTICE 'INSERT INTO user_settings (%) VALUES (%);',
        array_to_string(cols, ', '),
        array_to_string(vals, ', ');
    END LOOP;
    RAISE NOTICE '';
  END IF;
END $$;

-- MENSAGEM FINAL
DO $$
BEGIN
  RAISE NOTICE '-- ========================================';
  RAISE NOTICE '-- ✅ EXPORTAÇÃO COMPLETA!';
  RAISE NOTICE '-- ========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Copie TODOS os INSERTs acima e salve em: backup_dados.sql';
  RAISE NOTICE '';
END $$;
