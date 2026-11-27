using EstoqueWeb.Data;
using EstoqueWeb.Models;
using EstoqueWeb.ViewModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstoqueWeb.Controllers;

public class HomeController(AppDbContext context) : Controller
{
    public async Task<IActionResult> Index(string? busca, string? categoria, CancellationToken cancellationToken)
    {
        var config = await context.ConfiguracoesLoja.AsNoTracking().OrderBy(c => c.Id).FirstOrDefaultAsync(cancellationToken) ?? new ConfiguracaoLoja();
        var query = context.Produtos.AsNoTracking().Where(p => p.IsActive);
        if (!string.IsNullOrWhiteSpace(busca)) query = query.Where(p => p.Nome.Contains(busca) || p.Descricao.Contains(busca));
        if (!string.IsNullOrWhiteSpace(categoria)) query = query.Where(p => p.Categoria == categoria);
        var produtos = await query.OrderByDescending(p => p.IsFeatured).ThenBy(p => p.Nome)
            .Select(p => new ProdutoPublicoViewModel { Id = p.Id, Nome = p.Nome, Descricao = p.Descricao,
                Categoria = p.Categoria, PrecoVenda = p.PrecoVenda, ImageUrl = p.ImageUrl,
                Disponivel = p.Quantidade > 0, Destaque = p.IsFeatured }).ToListAsync(cancellationToken);
        var vm = new LojaPublicaViewModel { NomeLoja = config.NomeLoja, Apresentacao = config.TextoApresentacao,
            RegiaoAtendida = config.RegiaoAtendida, FormasEntrega = config.FormasEntrega,
            FormasPagamento = config.FormasPagamento, InstagramUrl = config.InstagramUrl,
            TelefoneWhatsApp = config.TelefoneWhatsApp, Produtos = produtos,
            ProdutosCarrinho = await context.Produtos.AsNoTracking().Where(p => p.IsActive).OrderBy(p => p.Nome)
                .Select(p => new CarrinhoProdutoViewModel { Id = p.Id, Nome = p.Nome, PrecoVenda = p.PrecoVenda, Disponivel = p.Quantidade > 0 }).ToListAsync(cancellationToken),
            Categorias = await context.Produtos.AsNoTracking().Where(p => p.IsActive).Select(p => p.Categoria).Distinct().OrderBy(c => c).ToListAsync(cancellationToken) };
        ViewData["Busca"] = busca;
        ViewData["Categoria"] = categoria;
        return View(vm);
    }

    public async Task<IActionResult> Produto(int id, CancellationToken cancellationToken)
    {
        var p = await context.Produtos.AsNoTracking().Where(p => p.Id == id && p.IsActive)
            .Select(p => new ProdutoPublicoViewModel { Id = p.Id, Nome = p.Nome, Descricao = p.Descricao,
                Categoria = p.Categoria, PrecoVenda = p.PrecoVenda, ImageUrl = p.ImageUrl,
                Disponivel = p.Quantidade > 0, Destaque = p.IsFeatured }).FirstOrDefaultAsync(cancellationToken);
        return p is null ? NotFound() : View(p);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ValidarCarrinho([FromBody] int[] ids, CancellationToken cancellationToken)
    {
        if (ids.Length > 100) return BadRequest();
        var status = await context.Produtos.AsNoTracking().Where(p => ids.Contains(p.Id))
            .Select(p => new { p.Id, p.IsActive, Disponivel = p.Quantidade > 0, p.PrecoVenda, p.Nome }).ToListAsync(cancellationToken);
        return Json(status);
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error() => View(new ErrorViewModel { RequestId = HttpContext.TraceIdentifier });
}
