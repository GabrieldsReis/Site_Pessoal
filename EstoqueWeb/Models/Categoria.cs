using System.ComponentModel.DataAnnotations;

namespace EstoqueWeb.Models;

public class Categoria
{
    public int Id { get; set; }
    [Required, StringLength(80)] public string Nome { get; set; } = "";
    [Required, StringLength(90)] public string Slug { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public int OrdemExibicao { get; set; }
    public ICollection<Produto> Produtos { get; set; } = new List<Produto>();
}
