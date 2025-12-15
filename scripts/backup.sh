#!/bin/bash

# ===============================================
# SCRIPT DE BACKUP COMPLETO - Dr. GPT AI Clone
# ===============================================
# Este script cria um backup COMPLETO do projeto
# incluindo código-fonte e instruções para backup do banco
# ===============================================

set -e  # Sair se houver erro

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configurações
PROJECT_DIR="/Users/user/Downloads/dr-gpt-ai-clone"
BACKUP_BASE_DIR="$HOME/backups/dr-gpt"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/$DATE"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}📦 Backup Completo - Dr. GPT AI${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Criar diretório de backup
echo -e "${GREEN}1. Criando diretório de backup...${NC}"
mkdir -p "$BACKUP_DIR"
echo -e "   ✓ Diretório criado: $BACKUP_DIR"
echo ""

# Backup do código-fonte
echo -e "${GREEN}2. Fazendo backup do código-fonte...${NC}"
cd "$PROJECT_DIR"
zip -r "$BACKUP_DIR/code.zip" . \
  -x "node_modules/*" \
  -x ".next/*" \
  -x "dist/*" \
  -x ".git/*" \
  -x "*.log" \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
  CODE_SIZE=$(du -h "$BACKUP_DIR/code.zip" | cut -f1)
  echo -e "   ✓ Código-fonte: $CODE_SIZE"
else
  echo -e "   ${RED}✗ Erro ao criar ZIP do código${NC}"
  exit 1
fi
echo ""

# Copiar arquivos SQL
echo -e "${GREEN}3. Copiando schemas SQL...${NC}"
if [ -d "$PROJECT_DIR/sql" ]; then
  cp -r "$PROJECT_DIR/sql" "$BACKUP_DIR/sql"
  SQL_COUNT=$(ls -1 "$BACKUP_DIR/sql" | wc -l | tr -d ' ')
  echo -e "   ✓ $SQL_COUNT arquivos SQL copiados"
else
  echo -e "   ${YELLOW}⚠ Pasta sql/ não encontrada${NC}"
fi
echo ""

# Copiar Edge Functions
echo -e "${GREEN}4. Copiando Edge Functions...${NC}"
if [ -d "$PROJECT_DIR/supabase/functions" ]; then
  cp -r "$PROJECT_DIR/supabase/functions" "$BACKUP_DIR/edge-functions"
  FUNC_COUNT=$(ls -1 "$BACKUP_DIR/edge-functions" | wc -l | tr -d ' ')
  echo -e "   ✓ $FUNC_COUNT função(ões) copiada(s)"
else
  echo -e "   ${YELLOW}⚠ Edge Functions não encontradas${NC}"
fi
echo ""

# Copiar script de exportação do banco
echo -e "${GREEN}5. Copiando script de exportação do banco...${NC}"
if [ -f "$PROJECT_DIR/export_backup_data.sql" ]; then
  cp "$PROJECT_DIR/export_backup_data.sql" "$BACKUP_DIR/"
  echo -e "   ✓ Script de exportação copiado"
else
  echo -e "   ${YELLOW}⚠ Script de exportação não encontrado${NC}"
fi
echo ""

# Criar README no backup
echo -e "${GREEN}6. Criando README do backup...${NC}"
cat > "$BACKUP_DIR/README.md" << 'EOF'
# Backup Dr. GPT AI Clone

## 📋 Conteúdo deste Backup

### ✅ O que está incluído:
- `code.zip` - Todo o código-fonte do projeto
- `sql/` - Schemas e migrations do banco de dados
- `edge-functions/` - Supabase Edge Functions
- `export_backup_data.sql` - Script para exportar dados do banco

### ⚠️ O que NÃO está incluído:
- Dados reais do banco de dados (você precisa exportá-los)
- `node_modules/` (recrie com `npm install`)
- Arquivos de build (`.next/`, `dist/`)

## 🔄 Como Restaurar

### 1. Restaurar o código:
```bash
# Descompactar
unzip code.zip -d dr-gpt-ai-clone-restored
cd dr-gpt-ai-clone-restored

# Instalar dependências
npm install
```

### 2. Configurar Supabase:

#### Opção A - Criar novo projeto:
1. Acesse https://supabase.com/dashboard
2. Crie um novo projeto
3. Atualize `.env` e `.env.local` com as novas credenciais
4. Execute os arquivos SQL da pasta `sql/` no SQL Editor

#### Opção B - Usar projeto existente:
1. As credenciais já estão em `.env` dentro do code.zip
2. Apenas certifique-se que o projeto ainda existe

### 3. Restaurar dados do banco:
```bash
# Execute o script export_backup_data.sql no Supabase SQL Editor
# Ele irá gerar CSVs que você pode importar via Table Editor
```

### 4. Deploy Edge Functions:
```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_ID
npx supabase functions deploy openrouter-chat
npx supabase secrets set OPENROUTER_API_KEY=sua-chave
```

### 5. Rodar o projeto:
```bash
npm run dev
```

## 📞 Documentação Completa

Consulte `BACKUP_E_REPLICACAO.md` dentro do code.zip para instruções detalhadas.

## 🔐 Segurança

⚠️ **IMPORTANTE:**
- Este backup contém credenciais e chaves de API em `.env`
- NÃO compartilhe publicamente
- Mantenha em local seguro

EOF

echo -e "   ✓ README criado"
echo ""

# Criar arquivo de inventário
echo -e "${GREEN}7. Criando inventário...${NC}"
cat > "$BACKUP_DIR/INVENTORY.txt" << EOF
==================================================
INVENTÁRIO DO BACKUP - Dr. GPT AI Clone
==================================================
Data: $(date)
Diretório original: $PROJECT_DIR

CONTEÚDO:
---------
$(ls -lh "$BACKUP_DIR")

ESTRUTURA DO CODE.ZIP:
---------------------
$(unzip -l "$BACKUP_DIR/code.zip" | head -50)

ARQUIVOS SQL:
------------
$(ls -1 "$BACKUP_DIR/sql/" 2>/dev/null || echo "Nenhum arquivo SQL")

EDGE FUNCTIONS:
--------------
$(ls -1 "$BACKUP_DIR/edge-functions/" 2>/dev/null || echo "Nenhuma função")

==================================================
EOF
echo -e "   ✓ Inventário criado"
echo ""

# Resumo final
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}✅ BACKUP COMPLETO CRIADO!${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "📂 Local: ${GREEN}$BACKUP_DIR${NC}"
echo ""
echo -e "📋 Conteúdo:"
ls -lh "$BACKUP_DIR" | tail -n +2 | awk '{printf "   • %s (%s)\n", $9, $5}'
echo ""
echo -e "${YELLOW}⚠️  PRÓXIMO PASSO IMPORTANTE:${NC}"
echo -e "${YELLOW}   Você ainda precisa exportar os DADOS do banco!${NC}"
echo ""
echo -e "Como fazer:"
echo -e "1. Acesse: ${BLUE}https://supabase.com/dashboard${NC}"
echo -e "2. Vá no SQL Editor"
echo -e "3. Execute o script: ${GREEN}export_backup_data.sql${NC}"
echo -e "4. Salve os CSVs gerados em: ${GREEN}$BACKUP_DIR/database/${NC}"
echo ""
echo -e "Ou consulte: ${GREEN}$BACKUP_DIR/README.md${NC}"
echo ""

# Abrir o diretório de backup
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "$BACKUP_DIR"
  echo -e "📁 Diretório de backup aberto no Finder"
fi

echo ""
echo -e "${GREEN}Backup concluído com sucesso! 🎉${NC}"
