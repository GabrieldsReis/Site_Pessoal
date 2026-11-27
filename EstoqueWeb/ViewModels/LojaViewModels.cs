using System.ComponentModel.DataAnnotations;

namespace EstoqueWeb.ViewModels;

public class ProdutoPublicoViewModel
{
    public int Id { get; init; }
    public string Nome { get; init; } = "";
    public string Descricao { get; init; } = "";
    public string Categoria { get; init; } = "";
    public decimal PrecoVenda { get; init; }
    public string? ImageUrl { get; init; }
    public bool Disponivel { get; init; }
    public bool Destaque { get; init; }
}

public class LojaPublicaViewModel
{
    public string NomeLoja { get; init; } = "Minha loja";
    public string Apresentacao { get; init; } = "";
    public string RegiaoAtendida { get; init; } = "";
    public string FormasEntrega { get; init; } = "";
    public string FormasPagamento { get; init; } = "";
    public string InstagramUrl { get; init; } = "";
    public string TelefoneWhatsApp { get; init; } = "";
    public IReadOnlyList<string> Categorias { get; init; } = [];
    public IReadOnlyList<ProdutoPublicoViewModel> Produtos { get; init; } = [];
    public IReadOnlyList<CarrinhoProdutoViewModel> ProdutosCarrinho { get; init; } = [];
}

public class CarrinhoProdutoViewModel
{
    public int Id { get; init; }
    public string Nome { get; init; } = "";
    public decimal PrecoVenda { get; init; }
    public bool Disponivel { get; init; }
}

public class ProdutoAdminViewModel
{
    public int Id { get; set; }
    [Required, StringLength(120)] public string Nome { get; set; } = "";
    [StringLength(2000)] public string Descricao { get; set; } = "";
    [Required, StringLength(80)] public string Categoria { get; set; } = "";
    [Range(0, int.MaxValue)] public int Quantidade { get; set; }
    [Range(typeof(decimal), "0", "999999.99")] public decimal PrecoCompra { get; set; }
    [Range(typeof(decimal), "0.01", "999999.99")] public decimal PrecoVenda { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public string? ImageUrl { get; set; }
    public IFormFile? Imagem { get; set; }
}

public class LoginViewModel
{
    [Required, EmailAddress] public string Email { get; set; } = "";
    [Required, DataType(DataType.Password)] public string Password { get; set; } = "";
    public string? ReturnUrl { get; set; }
}

public class ConfiguracaoLojaViewModel
{
    [Required, StringLength(120)] public string NomeLoja { get; set; } = "";
    [RegularExpression("^$|^\\+[1-9][0-9]{7,14}$", ErrorMessage = "Use formato internacional, por exemplo +5511999999999.")]
    public string TelefoneWhatsApp { get; set; } = "";
    [Url] public string InstagramUrl { get; set; } = "";
    [StringLength(200)] public string RegiaoAtendida { get; set; } = "";
    [StringLength(1000)] public string TextoApresentacao { get; set; } = "";
    [StringLength(300)] public string FormasEntrega { get; set; } = "";
    [StringLength(300)] public string FormasPagamento { get; set; } = "";
}

public class AdminDashboardViewModel
{
    public IReadOnlyList<ProdutoAdminViewModel> Produtos { get; init; } = [];
    public string? Busca { get; init; }
}
