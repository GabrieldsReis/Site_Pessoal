# 📦 Sistema de Estoque Web (CRUD)

Aplicação web para gestão de estoque de produtos, desenvolvida em **ASP.NET Core MVC** com **Entity Framework Core**. Projeto pessoal em desenvolvimento, criado para praticar o padrão MVC e operações de CRUD com persistência em banco de dados relacional.

## 🛠️ Tecnologias

| Tecnologia      | Detalhe                                   |
|-----------------|--------------------------------------------|
| Linguagem       | C#                                        |
| Framework       | ASP.NET Core MVC                          |
| ORM             | Entity Framework Core                     |
| Banco de dados  | Postgresql                                |
| Frontend        | HTML, CSS, JavaScript                     |

## ✨ Funcionalidades

Operações de CRUD para a entidade **Produto**:

- [X] Cadastrar novo produto
- [x] Listar produtos em estoque
- [ ] Editar informações de um produto
- [ ] Remover produto do estoque

> 🚧 **Projeto em desenvolvimento** — marque acima o que já está funcionando.

## 📋 Pré-requisitos

- .NET SDK _ 8.0+_
- _Postgresql_
- Visual Studio ou VS Code

## 🚀 Como rodar

1. Clone o repositório
   ```bash
   git clone https://github.com/GabrieldsReis/Site_Pessoal.git
   cd Site_Pessoal/EstoqueWeb
   ```
2. Restaure as dependências
   ```bash
   dotnet restore
   ```
3. Configure a connection string (User Secrets)
   ```bash
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "sua-connection-string-aqui"
   ```
4. Aplique as migrations
   ```bash
   dotnet ef database update
   ```
5. Rode a aplicação
   ```bash
   dotnet run
   ```
6. Acesse no navegador
   ```
   http://localhost:5000
   ```

## 📌 Status

🚧 Em desenvolvimento — próximos passos incluem finalizar as operações de CRUD e, futuramente, publicar uma versão online.
