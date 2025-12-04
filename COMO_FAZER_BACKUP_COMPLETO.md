# ✅ CHECKLIST: Como Fazer Backup Completo (100%)

## PASSO 1: Backup do Código ✅ (JÁ FEITO!)

Você já tem este arquivo:
```
/Users/user/Downloads/dr-gpt-ai-clone-backup-[data].zip
```

## PASSO 2: Backup dos Dados do Banco 📊 (FAZER AGORA)

### Opção A: Método Simples (Recomendado)

1. **Acesse o Supabase:**
   - Abra: https://supabase.com/dashboard
   - Entre no seu projeto

2. **Vá no Table Editor:**
   - Menu lateral → **Table Editor**

3. **Para cada tabela, exporte como CSV:**
   
   Para cada uma destas tabelas:
   - `chats`
   - `messages`  
   - `agents`
   - `profiles`
   - `app_settings`
   - `active_models`
   - `user_settings`
   
   Faça:
   - Clique na tabela
   - Botão **"Download as CSV"** (ícone de download)
   - Salve como `backup_[nome-da-tabela].csv`

4. **Salve todos os CSVs em uma pasta:**
   ```
   /Users/user/Downloads/dr-gpt-backup-database/
   ```

### Opção B: Método via SQL (Mais Rápido)

1. **Acesse: SQL Editor no Supabase**

2. **Execute este comando e copie o resultado:**

```sql
-- Cole este comando no SQL Editor e execute:

-- Isso vai gerar um script SQL completo com todos os dados
SELECT 'INSERT INTO chats VALUES ' || 
  string_agg('(' || 
    quote_literal(id::text) || ',' ||
    quote_literal(user_id::text) || ',' ||
    quote_literal(title) || ',' ||
    quote_literal(created_at::text) || ',' ||
    quote_literal(updated_at::text) || ',' ||
    COALESCE(quote_literal(agent_id::text), 'NULL') || ',' ||
    COALESCE(quote_literal(model), 'NULL') ||
  ')', ',')
FROM chats;
```

3. **Copie o resultado e salve como `backup_chats.sql`**

4. **Repita para as outras tabelas** (ou use o arquivo `export_backup_data.sql` que criei)

---

## ✅ PRONTO! Agora você tem TUDO:

Depois de fazer o PASSO 2, você terá:

1. ✅ **code.zip** - Todo o código
2. ✅ **CSVs ou SQLs** - Todos os dados do banco

## 🔄 COMO RESTAURAR (Quando Precisar)

### No computador novo ou para replicar:

1. **Descompactar o código:**
```bash
unzip dr-gpt-ai-clone-backup-*.zip -d novo-projeto
cd novo-projeto
npm install
```

2. **Configurar Supabase:**

   **Opção A - Usar o MESMO Supabase:**
   - Não precisa fazer nada, as credenciais já estão no `.env`

   **Opção B - Criar NOVO Supabase:**
   - Vá em https://supabase.com → New Project
   - Copie URL e chaves
   - Atualize `.env` e `.env.local`
   - Execute os SQLs da pasta `sql/`
   - Importe os CSVs via Table Editor

3. **Deploy das Edge Functions:**
```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_ID
npx supabase functions deploy openrouter-chat
npx supabase secrets set OPENROUTER_API_KEY=sua-chave
```

4. **Rodar:**
```bash
npm run dev
```

---

## 🎯 RESUMÃO: O que falta você fazer AGORA?

**APENAS 1 COISA:**

Exportar os dados do banco Supabase:
- Acesse https://supabase.com/dashboard
- Vá em Table Editor
- Baixe cada tabela como CSV
- Salve em `/Users/user/Downloads/dr-gpt-backup-database/`

**Depois disso você terá 100% do projeto salvo!** 🎉
