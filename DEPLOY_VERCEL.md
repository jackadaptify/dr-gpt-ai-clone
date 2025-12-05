# Como Deployar o Dr. GPT na Vercel

Este guia vai te ajudar a colocar o seu projeto no ar usando a Vercel, que é a melhor plataforma para projetos React/Vite.

## Pré-requisitos

1. Uma conta no [GitHub](https://github.com).
2. Uma conta na [Vercel](https://vercel.com) (pode criar usando sua conta do GitHub).
3. O projeto deve estar no seu GitHub.

## Passo 1: Subir o Código para o GitHub

Se você ainda não subiu o código, faça o seguinte no terminal do VS Code:

```bash
# 1. Inicialize o git (se já não estiver)
git init

# 2. Adicione todos os arquivos
git add .

# 3. Faça o commit
git commit -m "Versão inicial para deploy"

# 4. Crie um repositório no GitHub e siga as instruções para "push an existing repository"
# Geralmente é algo como:
# git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
# git branch -M main
# git push -u origin main
```

## Passo 2: Importar na Vercel

1. Acesse o [Dashboard da Vercel](https://vercel.com/dashboard).
2. Clique em **"Add New..."** -> **"Project"**.
3. Encontre o repositório `dr-gpt-ai-clone` (ou o nome que você deu) na lista e clique em **"Import"**.

## Passo 3: Configurar o Projeto

Na tela de configuração ("Configure Project"):

1. **Framework Preset**: A Vercel deve detectar automaticamente como `Vite`. Se não, selecione `Vite`.
2. **Root Directory**: Deixe como `./` (padrão).
3. **Build and Output Settings**:
   - Build Command: `npm run build` (ou `vite build`)
   - Output Directory: `dist`
   - Install Command: `npm install`
   (Geralmente os padrões já estão corretos).

## Passo 4: Variáveis de Ambiente (MUITO IMPORTANTE)

Você precisa configurar as variáveis de ambiente para que o app funcione em produção.
Expanda a seção **"Environment Variables"** e adicione as seguintes chaves (copie os valores do seu arquivo `.env` local):

| Key | Value | Descrição |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `sua_url_do_supabase` | URL do seu projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | `sua_chave_anon_do_supabase` | Chave pública (anon) do Supabase |
| `VITE_OPENROUTER_API_KEY` | `sua_chave_da_openrouter` | Necessária para verificar status dos modelos e funcionalidades client-side |
| `VITE_SITE_URL` | `https://seu-projeto.vercel.app` | URL final do seu projeto (pode atualizar depois) |
| `VITE_SITE_NAME` | `Dr. GPT` | Nome do site |

> **Nota sobre Segurança**: O chat principal e a geração de imagens usam Edge Functions do Supabase para maior segurança. No entanto, algumas funcionalidades como verificação de saúde dos modelos ainda podem precisar da chave no front-end (`VITE_OPENROUTER_API_KEY`). Certifique-se de configurar os limites de uso na sua conta OpenRouter para evitar gastos excessivos.

## Passo 5: Deploy

1. Clique em **"Deploy"**.
2. Aguarde a Vercel construir o projeto.
3. Se der tudo certo, você verá uma tela de confetes e o botão "Visit".

## Solução de Problemas Comuns

- **Erro 404 ao recarregar a página**: Isso acontece se o `vercel.json` não estiver configurado corretamente. Eu já criei esse arquivo para você na raiz do projeto com as regras de reescrita necessárias.
- **Lista de Modelos Vazia**: Se a lista de modelos não carregar, verifique se o `vercel.json` contém a regra de proxy para `/api/openrouter`.
- **Erro de Build**: Verifique se não há erros de TypeScript (`npm run build` localmente para testar). Se houver, corrija-os antes de subir.
- **Tela Branca**: Geralmente é erro de variável de ambiente faltando. Verifique o console do navegador (F12) para ver os erros.

---

**Pronto!** Seu Dr. GPT deve estar online. 🚀
