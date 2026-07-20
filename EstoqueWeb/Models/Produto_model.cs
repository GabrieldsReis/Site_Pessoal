namespace EstoqueWeb.Models
{
    public class Produto
    {
        public int Id { get; set; } //modelo padrao de cada produto no banco de dados
        public required string Nome { get; set; } //obrigatorio haver nome
        public required string Categoria { get; set; }
        public int Quantidade { get; set; }
        public decimal Preco { get; set; }

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