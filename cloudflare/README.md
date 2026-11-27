# EstoqueWeb na Cloudflare

Esta implementação é uma migração isolada para Cloudflare Workers, D1 e R2. O código ASP.NET Core/PostgreSQL original permanece na branch `feature/estoqueweb-cosmeticos`; esta branch não o remove nem altera a PR #1.

## Recursos necessários

1. Conta Cloudflare com e-mail verificado, acesso ao painel e um subdomínio `workers.dev` ativado. Não é necessário domínio próprio.
2. Um banco D1 chamado `estoqueweb`, criado na mesma conta e no plano Free.
3. Um bucket R2 chamado `estoqueweb-product-images`.
4. Secrets do Worker: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` e `SESSION_SECRET`.
5. Para deploy automatizado pelo GitHub Actions: secret `CLOUDFLARE_ACCOUNT_ID`, secret `CLOUDFLARE_API_TOKEN`, variável `CLOUDFLARE_D1_DATABASE_ID` e variável `CLOUDFLARE_DEPLOY_ENABLED=true`.

Não informe senha, token ou chave em arquivos rastreados pelo Git. `wrangler.jsonc` contém um UUID de exemplo deliberadamente inválido para produção; substitua-o somente pelo ID do D1 recém-criado nesta conta. Não aponte a migration para o PostgreSQL ou para outro banco existente.

## Custos e limites de segurança

Use somente Workers Free, D1 Free e R2 Free; não escolha Workers Paid, planos pagos, teste com cartão nem cadastro de pagamento. Workers Free tem limite diário de requisições e CPU por invocação; D1 Free tem limites diários de leituras e gravações e limite agregado de armazenamento. Ao atingir o limite do Worker/D1, algumas solicitações param até a renovação da cota.

R2 possui uma franquia mensal gratuita, mas exceder armazenamento ou operações pode gerar custo. Para reduzir esse risco, o código limita o espaço reservado para imagens a 8 GiB, uploads a 5 MiB e gravações/exclusões a 10.000 operações por mês. O limite de espaço é local a este banco; não representa outros buckets da conta. Não ative R2 se o painel exigir cartão, recurso pago ou aceitar cobrança automática. Confira os preços e cotas atuais no painel/documentação oficial antes de habilitar a conta.

## Provisionamento manual

Instale Node.js 22 e, em `cloudflare/`, execute `npm ci`. Autentique Wrangler de modo interativo (`npx wrangler login`) sem compartilhar o token. Se não houver conta disponível, a pessoa responsável precisa criá-la no site da Cloudflare e ativar `workers.dev`.

Crie os recursos na conta autenticada:

```sh
npx wrangler d1 create estoqueweb
npx wrangler r2 bucket create estoqueweb-product-images
```

Copie o `database_id` do comando D1 para `d1_databases[0].database_id` em `wrangler.jsonc`. Antes de rodar qualquer migration, confira novamente o nome e o ID do banco no Dashboard Cloudflare → Workers & Pages → D1 SQL databases. Este fluxo espera um banco novo e não foi desenhado para migrar dados do PostgreSQL.

Crie segredos fortes localmente e cadastre-os diretamente no Worker, sem registrá-los no Git:

```sh
npx wrangler secret put BOOTSTRAP_ADMIN_EMAIL
npx wrangler secret put BOOTSTRAP_ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
```

O e-mail deve ser o endereço de administração escolhido pela pessoa responsável. A senha precisa ter pelo menos 12 caracteres, incluindo minúscula, maiúscula, número e símbolo. `SESSION_SECRET` deve conter ao menos 32 caracteres aleatórios. Use um gerenciador de senhas para gerar e guardar esses valores. A senha administrativa é armazenada como hash com salt no D1; após o primeiro cadastro, trocar/remover as variáveis bootstrap não redefine a senha já criada.

Depois da conferência de conta, plano, nome do banco e ID, aplique a migration apenas ao D1 novo e publique:

```sh
npx wrangler d1 migrations apply estoqueweb --remote
npm test
npm run check
npx wrangler deploy
```

O endereço será exibido pelo comando de deploy, geralmente `https://estoqueweb-cloudflare.<subdominio>.workers.dev`. Esse endereço é apenas uma forma esperada; ainda não há URL pública provisionada ou validada.

## Deploy pelo GitHub Actions

O workflow `.github/workflows/cloudflare-deploy.yml` é manual e não executa sem todas as condições: branch `feature/estoqueweb-cloudflare`, caixa de confirmação marcada no dispatch e variável `CLOUDFLARE_DEPLOY_ENABLED=true`. Crie um API Token customizado com escopo da conta específica e permissões `Account Settings: Read`, `Workers Scripts: Write`, `D1: Edit` e `Workers R2 Storage: Write`. Para publicar em `workers.dev`, não conceda acesso a zonas DNS/domínios. Guarde-o em GitHub Actions Secrets como `CLOUDFLARE_API_TOKEN`; guarde o Account ID como `CLOUDFLARE_ACCOUNT_ID`. A variável `CLOUDFLARE_D1_DATABASE_ID` precisa ser exatamente o ID colocado no `wrangler.jsonc`. Comece com o gate desativado; só habilite depois de confirmar que a conta não exige cartão e que os recursos foram criados nas cotas gratuitas.

Esse workflow aplica somente migrations versionadas pelo Wrangler no D1 selecionado e então publica Worker/assets. Não configura cartão, não troca plano e não acessa o banco da aplicação ASP.NET.

## Administração e dados da loja

Após primeiro acesso ao endereço publicado, entre em `/admin` com o e-mail e a senha bootstrap para iniciar a criação do admin. Cadastre nome real, WhatsApp internacional, redes sociais, região, entrega, pagamento, produtos, preços e imagens. Os valores genéricos da tela são placeholders, não dados comerciais. Nenhum produto ou contato real é incluído por esta migração. O checkout apenas revalida preço/estoque e monta uma mensagem WhatsApp; ele não recebe pagamento nem reserva itens.

## Desenvolvimento e teste local

```sh
npm ci
cp .dev.vars.example .dev.vars
npm test
npm run check
npm run dev
```

As credenciais do exemplo são exclusivamente locais e fictícias. Dados de D1/R2 local ficam em `.wrangler/`, excluídos do Git. Isso não valida a conta remota, a URL pública, persistência em produção nem o faturamento Cloudflare.
