-- ===============================================
-- 🚀 SCRIPT COMPLETO: EXPORTAR TODOS OS DADOS
-- ===============================================
-- Execute este script no Supabase SQL Editor
-- Copie TODO o resultado e salve como: backup_completo.sql
-- ===============================================

-- INSTRUÇÕES:
-- 1. Vá em: https://supabase.com/dashboard
-- 2. SQL Editor (menu lateral)
-- 3. Cole ESTE SCRIPT COMPLETO
-- 4. Clique em RUN
-- 5. Copie TODO o output e salve como backup_completo.sql
-- 6. Pronto! Você terá TODOS os dados em 1 arquivo!

-- ===============================================
-- GERAR INSERTs PARA TODAS AS TABELAS
-- ===============================================

DO $$
DECLARE
    r RECORD;
    insert_stmt TEXT;
    table_data TEXT;
BEGIN
    -- Para cada tabela no schema public
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
        ORDER BY tablename
    LOOP
        -- Cabeçalho
        RAISE NOTICE '';
        RAISE NOTICE '-- ===============================================';
        RAISE NOTICE '-- TABELA: %', r.tablename;
        RAISE NOTICE '-- ===============================================';
        
        -- Contar registros
        EXECUTE format('SELECT COUNT(*) FROM %I', r.tablename) INTO table_data;
        RAISE NOTICE '-- Registros: %', table_data;
        RAISE NOTICE '';
        
        -- Gerar DELETE (para limpar antes de inserir)
        RAISE NOTICE 'DELETE FROM % WHERE TRUE;', r.tablename;
        
        -- Gerar INSERTs
        EXECUTE format('
            SELECT string_agg(
                ''INSERT INTO %I VALUES ('' || 
                string_agg(
                    CASE 
                        WHEN value IS NULL THEN ''NULL''
                        ELSE quote_literal(value)
                    END, 
                    '', ''
                ) || 
                '');'',
                E''\n''
            )
            FROM (
                SELECT json_each_text(row_to_json(t.*)) 
                FROM %I t
            ) AS j(key, value)
            GROUP BY j.key
        ', r.tablename, r.tablename) INTO insert_stmt;
        
        IF insert_stmt IS NOT NULL THEN
            RAISE NOTICE '%', insert_stmt;
        ELSE
            RAISE NOTICE '-- (Nenhum dado nesta tabela)';
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '-- ===============================================';
    RAISE NOTICE '-- ✅ EXPORTAÇÃO COMPLETA!';
    RAISE NOTICE '-- ===============================================';
END $$;
