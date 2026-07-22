namespace EstoqueWeb.Models
{
    public class Produto
    {
        public int Id { get; set; } //modelo padrao de cada produto no banco de dados
        public string Nome { get; set; } = "";
        public string Categoria { get; set; } = "";
        public int Quantidade { get; set; }
        public decimal PrecoCompra { get; set; }

        public decimal PrecoVenda { get; set; }

        public string Status
        {
            get
            {
                if (Quantidade == 0) return "Esgotado";
                if (Quantidade <= 10) return "Baixo";
                return "Em estoque";
            }
        }
    }
}