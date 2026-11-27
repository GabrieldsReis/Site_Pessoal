# Loja de cosméticos · EstoqueWeb

Aplicação ASP.NET Core MVC (.NET 10), EF Core e PostgreSQL para publicar uma vitrine mobile-first e administrar produtos. O visitante navega sem conta, monta uma sacola local e prepara um pedido no WhatsApp; a loja confirma disponibilidade, preço e entrega. O site não processa pagamentos nem reserva ou baixa estoque.

## Rodar localmente

Pré-requisitos: .NET SDK 10 e PostgreSQL 14 ou superior. Crie um banco vazio para desenvolvimento e configure a conexão por User Secrets:

```bash
cd EstoqueWeb
dotnet restore
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=estoqueweb;Username=postgres;Password=SUA_SENHA"
dotnet user-secrets set "InitialAdmin:Email" "voce@example.com"
dotnet user-secrets set "InitialAdmin:Password" "USE_UMA_SENHA_FORTE_UNICA"
dotnet run
```

Na primeira inicialização, migrations incrementais são aplicadas e, se o e-mail ainda não existir, Identity cria a conta administrativa. A senha exige no mínimo 12 caracteres, maiúscula, minúscula, número e símbolo. Abra a URL indicada pelo `dotnet run` e entre em `/admin/entrar`. Não existe cadastro público.

Sem um número WhatsApp configurado, o catálogo e a sacola continuam disponíveis, mas o envio fica desabilitado. Nenhum dado comercial nem produto fictício é pré-carregado.

## Configurações

O ASP.NET Core lê variáveis de ambiente usando `__` como separador. Consulte [`.env.example`](.env.example); o arquivo `.env` é ignorado pelo Git. Em hospedagem, cadastre cada segredo no painel do provedor, nunca no repositório.

| Variável | Uso |
| --- | --- |
| `ConnectionStrings__DefaultConnection` | PostgreSQL com SSL conforme instruções do provedor |
| `InitialAdmin__Email` e `InitialAdmin__Password` | Criar somente o primeiro administrador; remova a senha do ambiente depois da criação |
| `Storage__SupabaseUrl` | URL do projeto Supabase |
| `Storage__ServiceKey` | Chave privada de serviço, apenas no servidor |
| `Storage__Bucket` | Bucket público para imagens (padrão: `produtos`) |

Nome da loja, WhatsApp em E.164 (por exemplo `+5511999999999`), Instagram, região, texto, entrega e pagamento são preenchidos em **Administração → Configurações**. Não publique telefone, políticas ou produtos reais até a responsável revisar esses dados.

## Banco e dados existentes

As migrations antigas são preservadas. A migration `LojaEIdentidade` adiciona Identity, categorias, configuração da loja e os campos necessários ao catálogo. Ela mantém as colunas antigas de nome, categoria e preço sem conversão de tipo, conserva os produtos e os define ativos como padrão. O app só aplica migrations se `ConnectionStrings:DefaultConnection` estiver configurada; não use `EnsureCreated` nem apague o banco para atualizar.

## Imagens

Em **Administração → produtos**, aceite JPEG, PNG e WebP com até 5 MB. A aplicação confere extensão e assinatura inicial e envia bytes ao Supabase Storage pelo servidor. Crie um bucket chamado `produtos` (ou configure `Storage__Bucket`) com leitura pública para que a vitrine mostre as imagens; restrinja gravações usando a service key, que nunca vai ao navegador. O site guarda somente URL pública no PostgreSQL. Sem as credenciais, o cadastro de produtos sem foto funciona; tentar enviar uma imagem mostra uma mensagem de configuração.

## Hospedar no Render + Supabase

O repositório inclui [`EstoqueWeb/Dockerfile`](EstoqueWeb/Dockerfile) e [`render.yaml`](render.yaml), configurados para o projeto dentro de `EstoqueWeb/`. No Render, conecte o repositório pela branch de desenvolvimento, escolha o blueprint e preencha `ConnectionStrings__DefaultConnection`, `Storage__SupabaseUrl`, `Storage__ServiceKey` e `InitialAdmin__Email`/`InitialAdmin__Password` como variáveis secretas no painel. Configure o bucket público para leitura; não compartilhe credenciais em chat, issue ou commit. A primeira inicialização executa migrations.

No Supabase, crie o projeto PostgreSQL e o bucket de imagens. Use a connection string de pooler apropriada ao host; confirme que ela exige SSL. Depois de verificar o login inicial, remova `InitialAdmin__Password` do serviço. Para atualizar a senha administrativa, faça isso por um fluxo seguro de Identity fora do catálogo; não deixe uma senha fixa no painel.

As cotas e regras mudam; verifique [limites do Render](https://render.com/docs/free), [pausa de projetos Supabase](https://supabase.com/docs/guides/platform/free-project-pausing) e [backups Supabase](https://supabase.com/docs/guides/platform/backups) antes de publicar. Na consulta de 27/11/2026, Render Free suspende a aplicação após 15 minutos sem tráfego, leva aproximadamente um minuto para acordar e perde arquivos locais em reinícios; também classifica o plano como hobby/teste. Seu Postgres grátis expira após 30 dias. Supabase Free pode pausar projeto após uma semana de pouca atividade e não fornece backups automáticos para download. Faça exportações manuais regulares. GitHub Pages não executa ASP.NET, controllers ou EF Core; use um host de aplicação/container.

## Verificação

```bash
cd EstoqueWeb
dotnet restore
dotnet build
dotnet test
```

Os testes de integração exigem uma connection string PostgreSQL disponível. Faça também um smoke test manual: abrir `/`, pesquisar e filtrar; testar detalhes e sacola; abrir `/admin` em janela anônima (deve redirecionar ao login); entrar, criar/editar/desativar produto, configurar telefone, confirmar que item esgotado não entra na sacola e revisar a mensagem preparada no WhatsApp. Enviar o pedido exige ação manual no WhatsApp e não altera estoque.

## Pendências da loja

- Criar/selecionar contas Supabase e Render e cadastrar secrets diretamente nesses serviços.
- Informar nome exibido, WhatsApp, Instagram, região e modalidades reais de entrega/pagamento.
- Adicionar fotos e dados verdadeiros dos produtos.
- Revisar as condições de uso, privacidade e backup antes de divulgar o link.

O desenvolvimento fica em `feature/estoqueweb-cosmeticos`; não há merge automático para `main`.
