# Registro de execução

## 27/11/2026 — Inspeção inicial

- Etapa: leitura das instruções, estrutura, configuração, código e estado do Git.
- Resultado: aplicação ASP.NET Core MVC/.NET 10, EF Core/PostgreSQL, Identity, upload Supabase Storage, loja, sacola no navegador e envio de pedido via WhatsApp.
- Branch atual: `feature/estoqueweb-cosmeticos`; árvore limpa antes das alterações.
- Integridade: não foi configurada conexão de banco neste ambiente; nenhuma migration foi executada e nenhum dado foi consultado ou alterado.
- Publicação: há blueprint Render Free, mas não há credenciais/segredos, projeto Supabase, serviço Render ou URL pública configurados no ambiente.
- Limitação de hospedagem: Render Free suspende serviço após 15 minutos, tem cold start, filesystem efêmero e Postgres gratuito que expira após 30 dias. Supabase Free pode pausar por inatividade de 7 dias. Esta combinação não oferece disponibilidade adequada a uma loja comercial contínua.

## 27/11/2026 — Testes de base

- Comando: `DOTNET_CLI_HOME=/tmp/estoqueweb-dotnet DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 dotnet test EstoqueWeb.slnx`.
- Resultado: 5 aprovados, 0 falhos, 0 ignorados.
- Problema: o perfil padrão do .NET tentou criar arquivos fora do workspace somente leitura; contornado usando diretório temporário permitido, sem mudar proteções.

## 27/11/2026 — Melhorias de loja

- Adicionada ação de adicionar à sacola na página individual do produto.
- Adicionado estado acessível de sacola vazia.
- Adicionados metadados de descrição e Open Graph/Twitter para compartilhamento de links.
- Removida dependência de fonte externa bloqueante para reduzir requisições e dependência de terceiros; CSS mantém fontes de sistema como fallback.
- Adicionado workflow GitHub Actions de restore, build Release e testes na branch de desenvolvimento.
- Próxima etapa: executar novamente build/testes, revisar diff e validar o que for possível localmente.

## 27/11/2026 — Verificação final local e decisão de deploy

- Build Release: aprovado, 0 avisos e 0 erros.
- Testes Release: 5 aprovados, 0 falhos, 0 ignorados.
- `git diff --check`: aprovado.
- Comparação de hospedagem documentada em `FINAL_REPORT.md`, com fontes oficiais. Mantida arquitetura ASP.NET/Postgres/Storage por preservar o sistema; Cloudflare não foi adotado porque requer reescrita e oferece limites diários com interrupção ao exceder. Nenhum provedor foi contratado nem plano pago ativado.
- Verificação GitHub: repositório `GabrieldsReis/Site_Pessoal` disponível e branch padrão `main`; nenhuma publicação ou merge realizado.
- Bloqueios: falta connection string e conta/serviço ativo de banco, bucket/storage, ambiente de deploy e configuração real da loja. Sem isso, migrations, CRUD ligado ao banco, upload, smoke tests publicados e persistência pós-deploy não podem ser validados.
- Estado final: alterações e documentação locais prontas; checkout permanece na branch `feature/estoqueweb-cosmeticos`. A loja ainda não cumpre os critérios de lançamento e não deve ser divulgada como publicada.
- Publicação do código: `git add`/commit falhou porque `.git/index.lock` não pode ser criado no filesystem somente leitura. A tentativa de alternativa via GitHub Connector foi rejeitada pelo mecanismo de aprovação (`MCP tool call requires approval`, política `never`); nenhuma alteração remota foi feita. As alterações permanecem no workspace.
