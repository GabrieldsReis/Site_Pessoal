# Relatório final de execução — EstoqueWeb

**Situação: código enviado ao GitHub e CI aprovada; aplicação ainda não publicada.** O commit `f8454c412a40242b5a850ec82c95e85bec7d48e1` está na branch `feature/estoqueweb-cosmeticos`. A Pull Request #1 está aberta e não mesclada. Não há URL pública, serviço de hospedagem conectado, banco ou armazenamento remoto configurado, nem smoke test publicado.

## Arquitetura atual

- ASP.NET Core MVC em .NET 10, renderização no servidor e assets estáticos locais.
- Entity Framework Core com PostgreSQL; migrations incrementais preservadas.
- ASP.NET Core Identity para proteger o painel e provisionar o primeiro administrador por secrets de ambiente.
- Supabase Storage via upload de servidor para guardar fotografias fora do filesystem efêmero.
- Carrinho local no navegador; confirmação de estoque/preço no servidor antes de preparar a mensagem do WhatsApp. O sistema não recebe pagamentos nem reserva produtos.
- Render Free configurado como alvo de prévia, não recomendado para operação comercial contínua.

## Decisão de hospedagem

A opção já preparada é Render Free para o container e Supabase Free para PostgreSQL e Storage. É uma prévia de custo nominal zero dentro das cotas, não uma garantia de operação comercial nem de cobrança sempre zero: Render suspende serviços gratuitos após 15 minutos sem tráfego, pode levar cerca de um minuto para reativar, perde arquivos locais em reinícios e informa que excedente de banda pode ser cobrado. Supabase Free pode pausar projetos após uma semana com pouca atividade, não disponibiliza backups para download no plano Free e tem cotas de uso. Não criei contas/serviços nem configurei pagamento; não se deve ativar hospedagem até confirmar no painel que o uso continuará dentro do gratuito e que nenhuma opção paga/overage foi habilitada.

Cloudflare Workers/D1/R2 oferece quotas gratuitas sem cold start tradicional e armazenamento de objetos; porém exigiria reescrever a aplicação .NET MVC, substituir EF Core/Identity/PostgreSQL e aceitar limites diários que interrompem operações ao serem atingidos. Isso seria uma migração ampla e sem benefício comprovado de confiabilidade dos dados para a loja. Fly.io oferece apenas avaliação temporária sem meio de operação contínua gratuito. Mantive a arquitetura que já existe e não ativei serviços, planos ou cobrança.

Fontes oficiais consultadas em 27/11/2026: [limites gratuitos do Render](https://render.com/docs/free), [Blueprint do Render](https://render.com/docs/blueprint-spec), [pausa de projetos Supabase](https://supabase.com/docs/guides/platform/free-project-pausing), [cotas e planos Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase), [backups Supabase](https://supabase.com/docs/guides/platform/backups), [modos de conexão PostgreSQL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [chaves API Supabase](https://supabase.com/docs/guides/getting-started/api-keys) e [buckets Supabase Storage](https://supabase.com/docs/guides/storage/buckets/creating-buckets).

## Funcionalidades encontradas e melhorias entregues

- Catálogo com pesquisa, categoria, detalhes, disponibilidade sem divulgar quantidade exata e preço de compra.
- Painel protegido com administração de produtos, categorias, identidade da loja e imagens.
- Upload Supabase validado por extensão, tamanho e assinatura do conteúdo.
- Carrinho salvo no navegador, revalidação de preço/disponibilidade e mensagem de pedido WhatsApp sem reserva automática.
- Corrigida a ausência de ação para adicionar produto à sacola a partir da página individual.
- Estado orientativo de sacola vazia.
- Metadados de descrição, Open Graph e Twitter para partilha de produtos.
- Removido o carregamento obrigatório de fontes externas; o CSS usa fontes do sistema como alternativa rápida.
- Criada automação GitHub Actions para restore, build Release e testes na branch de desenvolvimento e em pull requests.

## Testes e resultados comprovados

- `dotnet test EstoqueWeb.slnx`: 5 aprovados, 0 falhos.
- `dotnet build EstoqueWeb.slnx --configuration Release`: build aprovado, 0 avisos e 0 erros.
- `dotnet test EstoqueWeb.slnx --no-build --configuration Release`: 5 aprovados, 0 falhos.
- `git diff --check`: aprovado.
- GitHub Actions no commit `f8454c412a40242b5a850ec82c95e85bec7d48e1`: execução `46051667770` (evento `push`) e `46051667852` (evento `pull_request`), ambas `.NET`, `completed` / `success`.
- Os testes existentes cobrem ocultação de custo/quantidade interna e validação de dados de contato.
- Não foram feitos testes de navegador, testes contra banco, validação de upload conectado nem smoke tests locais de rotas: não há connection string configurada; sem banco, as páginas que leem o catálogo não podem ser servidas corretamente.
- Nenhum teste da versão publicada foi realizado, pois não há URL de deploy conectada ou conhecida.

## Publicação

- URL pública: **não publicada / não verificada**.
- Branch publicada: [feature/estoqueweb-cosmeticos](https://github.com/GabrieldsReis/Site_Pessoal/tree/feature/estoqueweb-cosmeticos). Commit: `f8454c412a40242b5a850ec82c95e85bec7d48e1`.
- Pull Request #1: [Implementa vitrine de cosméticos e painel administrativo](https://github.com/GabrieldsReis/Site_Pessoal/pull/1), aberta e não mesclada. Mantida sem alteração de estado.
- Migration — **não verificada**. O corpo da PR afirma que a migration aditiva foi aplicada a um PostgreSQL disponível. Em contraste, `EXECUTION_LOG.md` registra que não havia connection string e nenhuma migration foi executada. A revisão atual encontrou somente o código que chama `MigrateAsync()` quando há connection string; não encontrou credencial, log de banco/deploy nem evidência de consulta a `__EFMigrationsHistory`. Não afirmar que foi aplicada nem que não foi aplicada. Antes de conectar um banco já existente, confirmar o histórico de migrations e obter backup; em banco novo, a inicialização tentará aplicar as migrations automaticamente.
- Nenhuma conta, serviço, banco, bucket ou domínio foi criado neste trabalho.

## Contas e configurações externas para deploy

O deploy está preparado em `render.yaml` e Dockerfile, mas ainda exige que a pessoa responsável conecte as contas nos painéis. Não envie senhas/chaves por chat nem faça commit de valores reais.

1. **GitHub**: a conta/repositório já existem e a branch de feature está publicada. A pessoa que cria o serviço Render precisa autorizar acesso desse serviço ao repositório `GabrieldsReis/Site_Pessoal`.
2. **Supabase**: criar/selecionar uma organização no plano Free e um projeto PostgreSQL, escolher região próxima da aplicação, definir e guardar a senha do banco. Para Render, copiar no Dashboard → Connect a connection string **Session pooler** (IPv4, porta `5432`) e formatar para Npgsql como `Host=<pooler-host>;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<senha-do-banco>;SSL Mode=Require`. Confirmar host, usuário e região no próprio painel; eles variam por projeto.
3. **Supabase Storage** no mesmo projeto: criar bucket chamado `produtos`, marcado como público somente para leitura das imagens. A aplicação envia/exclui arquivos no servidor. Para `Storage__ServiceKey`, o código atual usa a chave legada `service_role` em `Authorization: Bearer` e `apikey`; não use chave `anon`/publishable. Chaves secret novas `sb_secret_...` não são substitutas sem ajuste no código, pois a documentação atual manda enviá-las apenas no header `apikey`. Esta chave tem acesso elevado e deve existir somente como segredo do serviço Render.
4. **Render**: criar/usar uma conta e workspace, conectar o GitHub e iniciar um Blueprint apontando para `render.yaml` da branch `feature/estoqueweb-cosmeticos`. O blueprint fixa essa branch e `autoDeployTrigger: checksPass`; o serviço só deve publicar commits após os checks GitHub passarem. A configuração pede os seguintes valores no painel, nunca no YAML:

   | Variável | Valor a cadastrar |
   | --- | --- |
   | `ASPNETCORE_ENVIRONMENT` | `Production` (já definido no blueprint) |
   | `ConnectionStrings__DefaultConnection` | String Npgsql do Session pooler Supabase, com SSL |
   | `Storage__SupabaseUrl` | URL do projeto Supabase (`https://<project-ref>.supabase.co`) |
   | `Storage__ServiceKey` | Chave legada `service_role`, exclusivamente no servidor |
   | `Storage__Bucket` | `produtos` (já definido no blueprint) |
   | `InitialAdmin__Email` | E-mail da pessoa responsável pelo painel |
   | `InitialAdmin__Password` | Senha aleatória forte, de uso exclusivo; retirar do ambiente após criar/verificar o primeiro acesso |

5. **Dados de operação da loja**: a responsável precisa informar nome, WhatsApp em formato internacional, Instagram, região, regras reais de entrega/pagamento, produtos e fotos. Esses dados são preenchidos no painel da aplicação após deploy.
6. **Domínio próprio**: opcional; só é necessário se a loja tiver domínio. A URL `onrender.com` serve para prévia.

`EstoqueWeb/Program.cs` executa migrations e cria a primeira configuração/admin na inicialização apenas quando a connection string está configurada. Antes do primeiro deploy com banco já usado, verificar `__EFMigrationsHistory` com acesso autorizado e backup recente. Com banco novo, registrar a migration aplicada olhando os logs de startup e a tabela de histórico. Depois, testar login, páginas públicas, upload, CRUD, sacola/WhatsApp e persistência.

**Custo**: o blueprint fixa apenas o serviço web Free e não cria banco Render. Não contratar plano pago, habilitar recurso pago, conectar cartão ou aceitar overage. Como a documentação Render informa cobrança de excedente de banda, não há garantia de cobrança zero após ativar conta/serviço; conferir limites e faturamento no workspace antes de criação. Supabase Free também tem limites e pausa por inatividade. Se a exigência for garantia absoluta de não gerar cobrança, manter o deploy desligado até haver um caminho com limite rígido de gasto confirmado no painel.

## Manutenção

- Use `dotnet restore`, `dotnet build EstoqueWeb.slnx --configuration Release` e `dotnet test EstoqueWeb.slnx` antes de atualizar.
- Configure segredos no gerenciador do provedor, nunca no Git.
- Antes de uma migration futura, identifique o projeto e ambiente do banco e obtenha backup/exportação; não use `EnsureCreated` nem apague dados.
- Faça exportações manuais regulares do banco no plano Supabase Free; acompanhe cotas, avisos de pausa, espaço de imagens e execução de CI.
- Desenvolva na branch `feature/estoqueweb-cosmeticos`; não foi feito merge para `main`.
