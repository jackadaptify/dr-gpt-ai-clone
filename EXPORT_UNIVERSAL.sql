-- ===============================================
-- 📥 EXPORTAR TUDO - VERSÃO UNIVERSAL (100%)
-- ===============================================
-- Este script funciona para QUALQUER estrutura de tabela
-- Ele descobre automaticamente as colunas e gera os INSERTs
-- ===============================================

-- IMPORTANTE: Execute CADA bloco SEPARADAMENTE
-- Copie o resultado de cada um e junte tudo em um arquivo

-- ===============================================
-- TABELA: chats
-- ===============================================
SELECT 
  format(
    'INSERT INTO chats %s VALUES %s;',
    '(' || string_agg(column_name, ', ' ORDER BY ordinal_position) || ')',
    string_agg(
      '(' || array_to_string(
        ARRAY(
          SELECT CASE 
            WHEN value IS NULL THEN 'NULL'
            ELSE quote_literal(value)
          END
          FROM jsonb_each_text(to_jsonb(t.*))
          ORDER BY key
        ),
        ', '
      ) || ')',
      ', '
    )
  )
FROM chats t
CROSS JOIN (
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) as cols
  FROM information_schema.columns
  WHERE table_name = 'chats' AND table_schema = 'public'
) cols;

-- ===============================================
-- TABELA: messages  
-- ===============================================
SELECT 
  format(
    'INSERT INTO messages %s VALUES %s;',
    '(' || string_agg(column_name, ', ' ORDER BY ordinal_position) || ')',
    string_agg(
      '(' || array_to_string(
        ARRAY(
          SELECT CASE 
            WHEN value IS NULL THEN 'NULL'
            ELSE quote_literal(value)
          END
          FROM jsonb_each_text(to_jsonb(t.*))
          ORDER BY key
        ),
        ', '
      ) || ')',
      ', '
    )
  )
FROM messages t
CROSS JOIN (
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) as cols
  FROM information_schema.columns
  WHERE table_name = 'messages' AND table_schema = 'public'
) cols;

-- ===============================================
-- TABELA: agents
-- ===============================================
SELECT 
  format(
    'INSERT INTO agents %s VALUES %s;',
    '(' || string_agg(column_name, ', ' ORDER BY ordinal_position) || ')',
    string_agg(
      '(' || array_to_string(
        ARRAY(
          SELECT CASE 
            WHEN value IS NULL THEN 'NULL'
            ELSE quote_literal(value)
          END
          FROM jsonb_each_text(to_jsonb(t.*))
          ORDER BY key
        ),
        ', '
      ) || ')',
      ', '
    )
  )
FROM agents t
CROSS JOIN (
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) as cols
  FROM information_schema.columns
  WHERE table_name = 'agents' AND table_schema = 'public'
) cols;

-- ===============================================
-- TABELA: profiles
-- ===============================================  
SELECT 
  format(
    'INSERT INTO profiles %s VALUES %s;',
    '(' || string_agg(column_name, ', ' ORDER BY ordinal_position) || ')',
    string_agg(
      '(' || array_to_string(
        ARRAY(
          SELECT CASE 
            WHEN value IS NULL THEN 'NULL'
            ELSE quote_literal(value)
          END
          FROM jsonb_each_text(to_jsonb(t.*))
          ORDER BY key
        ),
        ', '
      ) || ')',
      ', '
    )
  )
FROM profiles t
CROSS JOIN (
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) as cols
  FROM information_schema.columns
  WHERE table_name = 'profiles' AND table_schema = 'public'
) cols;

-- ===============================================
-- TABELA: app_settings
-- ===============================================
SELECT 
  format(
    'INSERT INTO app_settings %s VALUES %s;',
    '(' || string_agg(column_name, ', ' ORDER BY ordinal_position) || ')',
    string_agg(
      '(' || array_to_string(
        ARRAY(
          SELECT CASE 
            WHEN value IS NULL THEN 'NULL'
            ELSE quote_literal(value)
          END
          FROM jsonb_each_text(to_jsonb(t.*))
          ORDER BY key
        ),
        ', '
      ) || ')',
      ', '
    )
  )
FROM app_settings t
CROSS JOIN (
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) as cols
  FROM information_schema.columns
  WHERE table_name = 'app_settings' AND table_schema = 'public'
) cols;

-- ===============================================
-- TABELA: active_models
-- ===============================================
SELECT 
  format(
    'INSERT INTO active_models %s VALUES %s;',
    '(' || string_agg(column_name, ', ' ORDER BY ordinal_position) || ')',
    string_agg(
      '(' || array_to_string(
        ARRAY(
          SELECT CASE 
            WHEN value IS NULL THEN 'NULL'
            ELSE quote_literal(value)
          END
          FROM jsonb_each_text(to_jsonb(t.*))
          ORDER BY key
        ),
        ', '
      ) || ')',
      ', '
    )
  )
FROM active_models t
CROSS JOIN (
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) as cols
  FROM information_schema.columns
  WHERE table_name = 'active_models' AND table_schema = 'public'
) cols;

-- ===============================================
-- TABELA: user_settings
-- ===============================================
SELECT 
  format(
    'INSERT INTO user_settings %s VALUES %s;',
    '(' || string_agg(column_name, ', ' ORDER BY ordinal_position) || ')',
    string_agg(
      '(' || array_to_string(
        ARRAY(
          SELECT CASE 
            WHEN value IS NULL THEN 'NULL'
            ELSE quote_literal(value)
          END
          FROM jsonb_each_text(to_jsonb(t.*))
          ORDER BY key
        ),
        ', '
      ) || ')',
      ', '
    )
  )
FROM user_settings t
CROSS JOIN (
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) as cols
  FROM information_schema.columns
  WHERE table_name = 'user_settings' AND table_schema = 'public'
) cols;
