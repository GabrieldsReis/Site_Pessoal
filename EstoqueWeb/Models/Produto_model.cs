using System.ComponentModel.DataAnnotations;

namespace EstoqueWeb.Models;

public class Produto
{
    public int Id { get; set; }
    [Required, StringLength(120)] public string Nome { get; set; } = "";
    [StringLength(2000)] public string Descricao { get; set; } = "";
    [Required, StringLength(80)] public string Categoria { get; set; } = ""; // Mantido para compatibilidade com os registros existentes.
    public int? CategoriaId { get; set; }
    public Categoria? CategoriaRelacionada { get; set; }
    [Range(0, int.MaxValue)] public int Quantidade { get; set; }
    [Range(typeof(decimal), "0", "999999.99")] public decimal PrecoCompra { get; set; }
    [Range(typeof(decimal), "0.01", "999999.99")] public decimal PrecoVenda { get; set; }
    [StringLength(500)] public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string Status => Quantidade == 0 ? "Esgotado" : "Disponível";
}
