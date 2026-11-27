using System.ComponentModel.DataAnnotations;

namespace EstoqueWeb.Models;

public class ConfiguracaoLoja
{
    public int Id { get; set; }
    [Required, StringLength(120)] public string NomeLoja { get; set; } = "Minha loja";
    [StringLength(20)] public string TelefoneWhatsApp { get; set; } = "";
    [StringLength(300)] public string InstagramUrl { get; set; } = "";
    [StringLength(200)] public string RegiaoAtendida { get; set; } = "";
    [StringLength(1000)] public string TextoApresentacao { get; set; } = "Conheça nossos produtos e fale com a loja para confirmar seu pedido.";
    [StringLength(300)] public string FormasEntrega { get; set; } = "";
    [StringLength(300)] public string FormasPagamento { get; set; } = "";
    [StringLength(500)] public string? LogoUrl { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
