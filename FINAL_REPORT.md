# Relatório final de execução — EstoqueWeb

**Situação: implementação local verificada; publicação e entrada em operação ainda bloqueadas por serviços e credenciais externas.** A loja não está sendo declarada concluída: não há endereço público comprovado, banco conectado, armazenamento remoto configurado ou teste end-to-end publicado.

## Arquitetura atual

- ASP.NET Core MVC em .NET 10, renderização no servidor e assets estáticos locais.
- Entity Framework Core com PostgreSQL; migrations incrementais preservadas.
- ASP.NET Core Identity para proteger o painel e provisionar o primeiro administrador por secrets de ambiente.
- Supabase Storage via upload de servidor para guardar fotografias fora do filesystem efêmero.
- Carrinho local no navegador; confirmação de estoque/preço no servidor antes de preparar a mensagem do WhatsApp. O sistema não recebe pagamentos nem reserva produtos.
- Render Free configurado como alvo de prévia, não recomendado para operação comercial contínua.

## Decisão de hospedagem

A exigência de custo exclusivamente zero não tem uma combinação verificada que assegure disponibilidade contínua, persistência com recuperação e ausência de pausas para esta aplicação. Render Free suspende a aplicação depois de 15 minutos sem tráfego, pode levar cerca de um minuto para reativar, apaga arquivos locais ao reiniciar e o Postgres Free expira em 30 dias. Supabase Free oferece banco e Storage persistentes dentro de cotas, mas pode pausar projetos com baixa atividade por sete dias e não oferece backups para download no plano Free.

Cloudflare Workers/D1/R2 oferece quotas gratuitas sem cold start tradicional e armazenamento de objetos; porém exigiria reescrever a aplicação .NET MVC, substituir EF Core/Identity/PostgreSQL e aceitar limites diários que interrompem operações ao serem atingidos. Isso seria uma migração ampla e sem benefício comprovado de confiabilidade dos dados para a loja. Fly.io oferece apenas avaliação temporária sem meio de operação contínua gratuito. Mantive a arquitetura que já existe e não ativei serviços, planos ou cobrança.

Fontes dos provedores consultadas em 27/11/2026: [limites gratuitos do Render](https://render.com/docs/free), [pausa de projetos Supabase](https://supabase.com/docs/guides/platform/free-project-pausing), [cotas Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase), [limites do Workers](https://developers.cloudflare.com/workers/platform/limits/), [preços de D1/Workers](https://developers.cloudflare.com/workers/platform/pricing/), [cota de R2](https://developers.cloudflare.com/r2/pricing/) e [avaliação Fly.io](https://fly.io/docs/about/free-trial/).

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
- O workflow GitHub Actions foi criado localmente, mas não foi disparado porque o commit/push da branch não pôde ser feito.
- Os testes existentes cobrem ocultação de custo/quantidade interna e validação de dados de contato.
- Não foram feitos testes de navegador, testes contra banco, validação de upload conectado nem smoke tests locais de rotas: não há connection string configurada; sem banco, as páginas que leem o catálogo não podem ser servidas corretamente.
- Nenhum teste da versão publicada foi realizado, pois não há URL de deploy conectada ou conhecida.

## Publicação

- URL pública: **não publicada / não verificada**.
- O repositório GitHub existe e está conectado. O envio da branch não foi concluído: o diretório `.git` local é somente leitura e a integração do GitHub recusou as chamadas de escrita por exigirem aprovação, indisponível na política atual.
- Nenhuma migration foi aplicada e nenhum banco foi acessado ou alterado.

## Pendências externas necessárias

1. Proprietário precisa criar ou selecionar um projeto PostgreSQL/Supabase e fornecer a connection string usando o painel de secrets do provedor.
2. Configurar Supabase Storage com bucket `produtos` público para leitura e secret de serviço exclusivamente no ambiente do servidor.
3. Conectar a branch de desenvolvimento a um serviço Render ou host que execute containers .NET. O Render Free atual é apenas prévia e não satisfaz disponibilidade/persistência confiável; um serviço adequado e sem custo obrigatório precisa ser escolhido pelo proprietário ou permanecer sem lançamento público.
4. Configurar e verificar o administrador inicial e apagar a senha temporária do ambiente depois da primeira criação.
5. A responsável da loja preencher WhatsApp, nome, Instagram, entrega/pagamento e cadastrar produtos e fotografias reais.
6. Após conexão dos serviços: executar as migrations incrementais sobre o banco identificado; realizar smoke tests externo, upload, CRUD, sessão administrativa, sacola, WhatsApp, desktop/celular e persistência após reinício/deploy.

## Manutenção

- Use `dotnet restore`, `dotnet build EstoqueWeb.slnx --configuration Release` e `dotnet test EstoqueWeb.slnx` antes de atualizar.
- Configure segredos no gerenciador do provedor, nunca no Git.
- Antes de uma migration futura, identifique o projeto e ambiente do banco e obtenha backup/exportação; não use `EnsureCreated` nem apague dados.
- Faça exportações manuais regulares do banco no plano Supabase Free; acompanhe cotas, avisos de pausa, espaço de imagens e execução de CI.
- Desenvolva na branch `feature/estoqueweb-cosmeticos`; não foi feito merge para `main`.
