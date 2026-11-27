using EstoqueWeb.Models;
using EstoqueWeb.ViewModels;
using System.ComponentModel.DataAnnotations;
using Xunit;

namespace EstoqueWeb.Tests;

public class CatalogSecurityTests
{
    [Fact]
    public void PublicProductViewModelDoesNotExposeInternalStockOrPurchasePrice()
    {
        var propertyNames = typeof(ProdutoPublicoViewModel).GetProperties().Select(p => p.Name).ToArray();
        Assert.DoesNotContain("Quantidade", propertyNames);
        Assert.DoesNotContain("PrecoCompra", propertyNames);
        Assert.Contains("Disponivel", propertyNames);
    }

    [Theory]
    [InlineData(0, "Esgotado")]
    [InlineData(1, "Disponível")]
    [InlineData(50, "Disponível")]
    public void ProductStatusNeverRevealsTheExactQuantity(int quantity, string expected)
    {
        var product = new Produto { Quantidade = quantity };
        Assert.Equal(expected, product.Status);
        Assert.DoesNotContain(quantity.ToString(), product.Status);
    }

    [Fact]
    public void StoreSettingsAcceptsInternationalWhatsappOnly()
    {
        var valid = new ConfiguracaoLojaViewModel { NomeLoja = "Loja", TelefoneWhatsApp = "+5511999999999", InstagramUrl = "https://instagram.com/loja" };
        var invalid = new ConfiguracaoLojaViewModel { NomeLoja = "Loja", TelefoneWhatsApp = "5511999999999", InstagramUrl = "https://instagram.com/loja" };
        Assert.True(Validator.TryValidateObject(valid, new ValidationContext(valid), new List<ValidationResult>(), true));
        Assert.False(Validator.TryValidateObject(invalid, new ValidationContext(invalid), new List<ValidationResult>(), true));
    }
}
