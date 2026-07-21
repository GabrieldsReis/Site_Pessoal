using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EstoqueWeb.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarPrecos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Preco",
                table: "Produtos",
                newName: "PrecoVenda");

            migrationBuilder.AddColumn<decimal>(
                name: "PrecoCompra",
                table: "Produtos",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PrecoCompra",
                table: "Produtos");

            migrationBuilder.RenameColumn(
                name: "PrecoVenda",
                table: "Produtos",
                newName: "Preco");
        }
    }
}
