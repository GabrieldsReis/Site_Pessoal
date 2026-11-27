# Relatório final — EstoqueWeb

**Estado em 27/11/2026:** a aplicação ASP.NET Core original está preservada na branch `feature/estoqueweb-cosmeticos`, commit remoto `54bb8077052741c5746f443906e641662038d64e`. A PR #1 continua aberta e sem merge. Uma implementação Cloudflare separada está sendo preparada na branch `feature/estoqueweb-cloudflare`; o Worker, D1, R2 e segredos remotos ainda não existem, portanto **não há publicação pública nem endereço de produção**.

## Decisão de hospedagem

Para os requisitos de acesso após inatividade, inicialização rápida e armazenamento persistente gratuito, a alternativa preparada é Cloudflare Workers Free + D1 Free + R2 Standard. Worker não dorme por inatividade e D1/R2 são serviços persistentes. A aplicação foi reimplementada em branch isolada; nenhum arquivo ASP.NET Core/PostgreSQL foi removido ou substituído na branch original. Esta escolha é de melhor adequação entre as opções avaliadas, mas não é garantia de operação sem interrupções: as cotas gratuitas podem encerrar solicitações quando atingidas, e a franquia R2 não protege de cobrança por uso externo ao limite configurado.

Render Free foi descartado porque suspende web services após 15 minutos sem tráfego, leva aproximadamente um minuto para reativar, tem filesystem efêmero e Postgres Free que expira após 30 dias. Supabase Free pode pausar o projeto após uma semana de pouca atividade; combiná-lo ao Render manteria o problema de inatividade. Fontes oficiais: [Render Free](https://render.com/docs/free), [pausa de projetos Supabase](https://supabase.com/docs/guides/platform/free-project-pausing).

Limites oficiais verificados em 27/11/2026: Workers Free tem 100 mil requisições/dia e 10 ms de CPU por requisição; D1 Free tem 5 milhões de linhas lidas/dia, 100 mil linhas gravadas/dia e 5 GB de armazenamento agregado. Ao atingir limites diários Free, requisições/consultas falham até a renovação da cota. R2 Standard inclui 10 GB-mês, 1 milhão de operações Classe A e 10 milhões Classe B ao mês; excedentes podem ser cobrados. Fontes: [Workers pricing e limites](https://developers.cloudflare.com/workers/platform/limits/), [D1 limites](https://developers.cloudflare.com/d1/platform/limits/), [D1 pricing](https://developers.cloudflare.com/workers/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

Para reduzir risco de custo, o código Cloudflare limita armazenamento reservado de imagem a 8 GiB, uploads a 5 MiB e gravações/exclusões a 10 mil operações mensais. A conta Cloudflare pode ter uso compartilhado com outros recursos; esses limites locais não controlam outras aplicações/buckets da conta. Nenhuma conta foi autenticada ou configurada neste ambiente. Não foi adicionado cartão, plano pago ou serviço cobrável.

## O que foi preparado

- Branch isolada `feature/estoqueweb-cloudflare`, baseada no commit remoto `54bb8077052741c5746f443906e641662038d64e`; código ASP.NET original preservado.
- Worker com catálogo, busca, categorias, página de produto e metadados sociais; painel em `/admin`; autenticação administrativa com hash PBKDF2, bloqueio de tentativas e cookie assinado; CRUD de produtos/categorias/configuração; validação de carrinho no servidor e mensagem WhatsApp.
- O checkout revalida a quantidade solicitada contra o estoque atual e impede enviar quantidade acima da disponível, sem expor o saldo exato de estoque na API pública.
- D1 com migration inicial versionada. **Não aplicada a nenhum banco remoto**. Aplicada somente a uma instância D1 local descartável de teste em `/tmp`.
- R2 configurado como binding de imagens permanentes; testes locais usaram emulador R2 e imagem fictícia.
- Workflow CI em `.github/workflows/cloudflare.yml` e deploy manual protegido em `.github/workflows/cloudflare-deploy.yml`. Deploy só roda na branch Cloudflare, com confirmação explícita e gate `CLOUDFLARE_DEPLOY_ENABLED=true`; o alvo deve ter ID D1 diferente do placeholder. O workflow aplica migration ao D1 configurado antes do deploy.
- Runbook de provisionamento em [cloudflare/README.md](cloudflare/README.md). Nenhum produto, WhatsApp, política de entrega ou dado comercial real foi inventado.

## Verificações

- `npm test`: 6 testes passaram, incluindo rota `/admin`.
- `npm run check` (`wrangler deploy --dry-run`): passou e reconheceu Worker, assets, D1 e R2.
- Teste HTTP ponta a ponta com Worker local: assets, saúde, catálogo, bloqueio anônimo, proteção de origem, login e atributos do cookie, painel, configuração, categoria, cadastro/listagem de produto, pesquisa, filtro, preço em centavos, ocultação de estoque/preço de compra, detalhe/OG, upload/entrega de imagem e validação de carrinho passaram.
- Teste Chromium/Playwright local: navegação pela busca/categoria/detalhe, preço, carrinho/total, bloqueio de quantidade acima do estoque, conteúdo da URL WhatsApp (requisição externa interceptada), login no admin, configuração e layout de loja/admin em viewport de 390 px sem rolagem horizontal passaram.
- Após reiniciar o Worker local usando a mesma persistência temporária, produto/configuração no D1 local e imagem no R2 local continuaram disponíveis.
- Logs locais do emulador: 40 spans consultados com resultado `ok`; não houve falha 5xx nos fluxos finais. Um 404 de `/admin` foi encontrado no primeiro teste, corrigido e revalidado.
- Não houve teste em URL pública, banco Cloudflare remoto, billing real ou restauração de serviço remoto, pois não há sessão Cloudflare nem recursos criados.

## GitHub e migration PostgreSQL

- Estado conferido: `feature/estoqueweb-cosmeticos` remoto em `54bb8077052741c5746f443906e641662038d64e`.
- Duas execuções `.NET` concluídas com sucesso no commit `f8454c412a40242b5a850ec82c95e85bec7d48e1`: `46051667770` (`push`) e `46051667852` (`pull_request`).
- No último commit informado/confirmado, `54bb8077052741c5746f443906e641662038d64e`, as execuções `.NET` `46052454547` (`push`) e `46052460974` (`pull_request`) também concluíram com sucesso.
- PR #1: [Implementa vitrine de cosméticos e painel administrativo](https://github.com/GabrieldsReis/Site_Pessoal/pull/1), aberta, head `54bb8077052741c5746f443906e641662038d64e`, não mesclada. Preservada.
- Migration original do PostgreSQL: **não verificada**. A descrição da PR diz que uma migration foi aplicada, enquanto o registro local diz que não havia connection string. Não existe neste ambiente credencial, log de execução contra esse PostgreSQL ou consulta a `__EFMigrationsHistory`. Portanto não é possível afirmar que foi aplicada ou que não foi aplicada. Esta migration PostgreSQL não foi executada neste trabalho. A migration D1 local e a futura D1 remota são bancos diferentes.
- Nenhum merge para `main` foi feito.

## O que falta para publicar

Não há conta Cloudflare autenticada (`wrangler whoami` respondeu “You are not authenticated”), database ID real, bucket remoto, segredos de produção, token CI ou URL pública. A intervenção indispensável é a pessoa responsável autenticar uma conta Cloudflare no ambiente (`npx wrangler login`) ou fornecer acesso por um token Cloudflare restrito, e criar/confirmar os recursos Free no painel. O runbook lista os passos e configurações exatos. Se o painel pedir cartão, plano pago, habilitação de cobrança automática ou confirmação de recurso pago, interromper sem prosseguir.

Após configuração, definir `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` e `SESSION_SECRET` como Worker Secrets; cadastrar `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN` em Actions Secrets; `CLOUDFLARE_D1_DATABASE_ID` e `CLOUDFLARE_DEPLOY_ENABLED` como Actions Variables. O deploy poderá ser iniciado manualmente pelo workflow. A primeira execução da D1 remota deve usar somente o banco novo criado para `estoqueweb` e conferir ID/nome antes de aplicar migration.

Quando publicar, `/admin` permitirá à responsável informar nome, WhatsApp, produtos, preços, fotos e demais dados reais. Até lá, URL pública: **inexistente**; administração em produção: **indisponível**. Não é seguro divulgar ou preencher dados fictícios.
