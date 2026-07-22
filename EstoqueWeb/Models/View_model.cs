using EstoqueWeb.Models;

namespace EstoqueWeb.ViewModels
{
    public class EstoqueViewModel
    {
        public List<Produto> Produtos { get; set; }

        public Produto NovoProduto { get; set; }

        public EstoqueViewModel()
        {
            Produtos = new List<Produto>();
            NovoProduto = new Produto();
        }
    }
}