# 🔄 Guia Completo de Backup e Replicação

Este guia mostra como fazer backup total do projeto Dr. GPT AI e replicá-lo em outro ambiente.

---

## 📦 Parte 1: Backup do Código-Fonte

### Já criado!
O arquivo ZIP em `/Users/user/Downloads/dr-gpt-ai-clone-backup-[data].zip` contém:
- ✅ Todo o código-fonte
- ✅ Configurações (package.json, tsconfig.json, etc.)
- ✅ SQL schemas e migrations
- ✅ Edge Functions
- ✅ Arquivos `.env` (ATENÇÃO: contém chaves secretas!)

### O que NÃO está no ZIP:
- ❌ `node_modules/` (será recriado com `npm install`)
- ❌ Dados do banco (veja Parte 2)

---

## 🗄️ Parte 2: Backup do Banco de Dados Supabase

### Opção A: Exportar via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard:**
   - Vá para: https://supabase.com/dashboard/project/[seu-project-id]

2. **Exporte os dados das tabelas:**
   
   **Via SQL Editor:**
   ```sql
   -- Copie o output de cada comando e salve em arquivos .sql
   
   -- 1. Exportar dados da tabela 'chats'
   COPY (SELECT * FROM chats) TO STDOUT WITH CSV HEADER;
   
   -- 2. Exportar dados da tabela 'messages'
   COPY (SELECT * FROM messages) TO STDOUT WITH CSV HEADER;
   
   -- 3. Exportar dados da tabela 'agents'
   COPY (SELECT * FROM agents) TO STDOUT WITH CSV HEADER;
   
   -- 4. Exportar dados da tabela 'profiles'
   COPY (SELECT * FROM profiles) TO STDOUT WITH CSV HEADER;
   
   -- 5. Exportar dados da tabela 'app_settings'
   COPY (SELECT * FROM app_settings) TO STDOUT WITH CSV HEADER;
   
   -- 6. Exportar dados da tabela 'active_models'
   COPY (SELECT * FROM active_models) TO STDOUT WITH CSV HEADER;
   
   -- 7. Exportar dados da tabela 'user_settings'
   COPY (SELECT * FROM user_settings) TO STDOUT WITH CSV HEADER;
   ```

3. **Salve em arquivos CSV:**
   - `backup_chats.csv`
   - `backup_messages.csv`
   - `backup_agents.csv`
   - `backup_profiles.csv`
   - `backup_app_settings.csv`
   - `backup_active_models.csv`
   - `backup_user_settings.csv`

### Opção B: Usar Supabase CLI (Mais completo)

```bash
# 1. Certifique-se de ter o Supabase CLI instalado
npx supabase --version

# 2. Faça dump completo do banco
npx supabase db dump -f backup_database.sql

# 3. Isso cria um arquivo SQL com TUDO:
# - Estrutura das tabelas
# - Todos os dados
# - RLS policies
# - Functions
```

### Opção C: Exportar manualmente via pgAdmin/CLI

Se tiver acesso direto ao PostgreSQL:

```bash
# Pegue a connection string no Supabase Dashboard > Settings > Database
pg_dump "sua-connection-string" > backup_full.sql
```

---

## 🔄 Como Replicar o Projeto em Outra Máquina

### Passo 1: Restaurar o Código

```bash
# 1. Descompactar o ZIP
cd ~/Downloads
unzip dr-gpt-ai-clone-backup-*.zip -d dr-gpt-ai-clone-novo

# 2. Entrar na pasta
cd dr-gpt-ai-clone-novo

# 3. Instalar dependências
npm install

# 4. Instalar Supabase CLI (se não tiver)
npm install -g supabase
```

### Passo 2: Configurar Novo Supabase (ou usar o mesmo)

#### Se quiser USAR O MESMO Supabase:
- Os arquivos `.env` já têm as credenciais
- Pule para o Passo 3

#### Se quiser CRIAR UM NOVO Supabase:

1. **Criar novo projeto:**
   - Acesse https://supabase.com/dashboard
   - Clique em "New Project"
   - Anote a URL e as chaves

2. **Atualizar `.env` e `.env.local`:**
   ```env
   VITE_SUPABASE_URL=sua-nova-url
   VITE_SUPABASE_ANON_KEY=sua-nova-chave
   ```

3. **Rodar as migrations:**
   ```bash
   # Aplique os SQLs na ordem:
   
   # 1. Schema principal
   npx supabase db execute -f sql/schema.sql
   
   # 2. Setup de storage
   npx supabase db execute -f sql/setup_storage.sql
   
   # 3. Schema de agentes
   npx supabase db execute -f sql/agents_schema.sql
   
   # 4. Outros schemas necessários
   npx supabase db execute -f sql/supabase_schema.sql
   npx supabase db execute -f sql/migration_settings.sql
   ```

4. **Restaurar os dados (se tiver backup do banco):**
   
   **Se usou a Opção A (CSV):**
   - Importe via Supabase Dashboard > Table Editor > Import Data
   
   **Se usou a Opção B ou C (SQL dump):**
   ```bash
   npx supabase db reset
   psql "sua-connection-string" < backup_database.sql
   ```

### Passo 3: Deploy das Edge Functions

```bash
# 1. Login no Supabase
npx supabase login

# 2. Link ao projeto
npx supabase link --project-ref seu-project-id

# 3. Deploy da função
npx supabase functions deploy openrouter-chat

# 4. Configurar secrets
npx supabase secrets set OPENROUTER_API_KEY=sua-chave
```

### Passo 4: Rodar o Projeto

```bash
npm run dev
```

---

## ✅ Checklist de Replicação Completa

- [ ] ZIP do código descompactado
- [ ] `npm install` executado
- [ ] Supabase configurado (mesmo ou novo)
- [ ] Variáveis de ambiente atualizadas (`.env` e `.env.local`)
- [ ] Migrations SQL rodadas
- [ ] Dados restaurados (se aplicável)
- [ ] Edge Functions deployadas
- [ ] Secrets configurados no Supabase
- [ ] `npm run dev` funcionando
- [ ] Login funcionando
- [ ] Chat funcionando
- [ ] Admin panel acessível

---

## 🚨 Cuidados Importantes

### Segurança:
- ⚠️ **NUNCA compartilhe** os arquivos `.env` publicamente
- ⚠️ Os arquivos `.env` contêm chaves de API sensíveis
- ⚠️ Se compartilhar o ZIP, REMOVA os `.env` antes

### Dados Pessoais:
- O backup do banco contém dados de usuários, chats, mensagens
- Respeite a LGPD/GDPR se for compartilhar

### API Keys:
- `OPENROUTER_API_KEY` - pode ter custos associados
- `SUPABASE_ANON_KEY` - dá acesso ao banco

---

## 💾 Backup Automatizado (Opcional)

### Script de Backup Completo:

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$HOME/backups/dr-gpt-$DATE"

mkdir -p "$BACKUP_DIR"

# 1. Backup do código
cd /Users/user/Downloads/dr-gpt-ai-clone
zip -r "$BACKUP_DIR/code.zip" . -x "node_modules/*" ".next/*" "dist/*"

# 2. Backup do banco
npx supabase db dump -f "$BACKUP_DIR/database.sql"

# 3. Backup das edge functions
cp -r supabase/functions "$BACKUP_DIR/functions"

echo "✅ Backup completo salvo em: $BACKUP_DIR"
```

Salve como `backup.sh` e rode:
```bash
chmod +x backup.sh
./backup.sh
```

---

## 📞 Suporte

Se tiver problemas na replicação:
1. Verifique os logs: `npm run dev` e console do navegador
2. Teste a conexão com Supabase
3. Verifique se as Edge Functions foram deployadas corretamente
