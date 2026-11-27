using System.Text.RegularExpressions;
using EstoqueWeb.Data;
using EstoqueWeb.Models;
using EstoqueWeb.Services;
using EstoqueWeb.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstoqueWeb.Controllers;

[Authorize]
public class AdminController(AppDbContext context, SignInManager<IdentityUser> signInManager, IImageStorage imageStorage) : Controller
{
    [AllowAnonymous, HttpGet("/admin/entrar")]
    public IActionResult Entrar(string? returnUrl = null) => User.Identity?.IsAuthenticated == true ? RedirectToAction(nameof(Index)) : View(new LoginViewModel { ReturnUrl = returnUrl });

    [AllowAnonymous, HttpPost("/admin/entrar"), ValidateAntiForgeryToken]
    public async Task<IActionResult> Entrar(LoginViewModel model)
    {
        if (!ModelState.IsValid) return View(model);
        var result = await signInManager.PasswordSignInAsync(model.Email, model.Password, isPersistent: false, lockoutOnFailure: true);
        if (result.Succeeded) return Url.IsLocalUrl(model.ReturnUrl) ? LocalRedirect(model.ReturnUrl!) : RedirectToAction(nameof(Index));
        ModelState.AddModelError(string.Empty, "E-mail ou senha inválidos. Tente novamente.");
        return View(model);
    }

    [HttpPost("/admin/sair"), ValidateAntiForgeryToken]
    public async Task<IActionResult> Sair() { await signInManager.SignOutAsync(); return RedirectToAction(nameof(Entrar)); }

    [HttpGet("/admin")]
    public async Task<IActionResult> Index(string? busca, CancellationToken ct)
    {
        var query = context.Produtos.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(busca)) query = query.Where(p => p.Nome.Contains(busca) || p.Categoria.Contains(busca));
        var produtos = await query.OrderBy(p => p.Nome).Select(p => new ProdutoAdminViewModel { Id = p.Id, Nome = p.Nome,
            Descricao = p.Descricao, Categoria = p.Categoria, Quantidade = p.Quantidade, PrecoCompra = p.PrecoCompra,
            PrecoVenda = p.PrecoVenda, ImageUrl = p.ImageUrl, IsActive = p.IsActive, IsFeatured = p.IsFeatured }).ToListAsync(ct);
        return View(new AdminDashboardViewModel { Produtos = produtos, Busca = busca });
    }

    [HttpGet("/admin/produtos/novo")]
    public async Task<IActionResult> Novo(int? id, CancellationToken ct)
    {
        if (!id.HasValue) return View("ProdutoForm", new ProdutoAdminViewModel());
        var p = await context.Produtos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);
        return p is null ? NotFound() : View("ProdutoForm", new ProdutoAdminViewModel { Id = p.Id, Nome = p.Nome,
            Descricao = p.Descricao, Categoria = p.Categoria, Quantidade = p.Quantidade, PrecoCompra = p.PrecoCompra,
            PrecoVenda = p.PrecoVenda, ImageUrl = p.ImageUrl, IsActive = p.IsActive, IsFeatured = p.IsFeatured });
    }

    [HttpPost("/admin/produtos/salvar"), ValidateAntiForgeryToken, RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Salvar(ProdutoAdminViewModel model, CancellationToken ct)
    {
        if (!ModelState.IsValid) return View("ProdutoForm", model);
        var produto = model.Id == 0 ? new Produto() : await context.Produtos.FindAsync([model.Id], ct);
        if (produto is null) return NotFound();
        var imagemAnterior = produto.ImageUrl;
        produto.Nome = model.Nome.Trim(); produto.Descricao = model.Descricao.Trim(); produto.Categoria = model.Categoria.Trim();
        produto.Quantidade = model.Quantidade; produto.PrecoCompra = model.PrecoCompra; produto.PrecoVenda = model.PrecoVenda;
        produto.IsActive = model.IsActive; produto.IsFeatured = model.IsFeatured; produto.UpdatedAt = DateTime.UtcNow;
        produto.CategoriaId = await context.Categorias.Where(c => c.IsActive && c.Nome == produto.Categoria).Select(c => (int?)c.Id).FirstOrDefaultAsync(ct);
        if (model.Imagem is { Length: > 0 })
        {
            try { produto.ImageUrl = await imageStorage.UploadAsync(model.Imagem, ct); }
            catch (Exception ex) when (ex is InvalidDataException or InvalidOperationException) { ModelState.AddModelError(nameof(model.Imagem), ex.Message); return View("ProdutoForm", model); }
        }
        if (model.Id == 0) context.Produtos.Add(produto);
        await context.SaveChangesAsync(ct);
        if (model.Imagem is { Length: > 0 }) await imageStorage.DeleteAsync(imagemAnterior, ct);
        TempData["Mensagem"] = "Produto salvo.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost("/admin/produtos/{id:int}/status"), ValidateAntiForgeryToken]
    public async Task<IActionResult> Status(int id, CancellationToken ct)
    {
        var p = await context.Produtos.FindAsync([id], ct); if (p is null) return NotFound();
        p.IsActive = !p.IsActive; p.UpdatedAt = DateTime.UtcNow; await context.SaveChangesAsync(ct);
        TempData["Mensagem"] = p.IsActive ? "Produto ativado." : "Produto desativado."; return RedirectToAction(nameof(Index));
    }

    [HttpPost("/admin/produtos/{id:int}/excluir"), ValidateAntiForgeryToken]
    public async Task<IActionResult> Excluir(int id, CancellationToken ct)
    {
        var p = await context.Produtos.FindAsync([id], ct); if (p is null) return NotFound();
        p.IsActive = false; p.UpdatedAt = DateTime.UtcNow; await context.SaveChangesAsync(ct);
        TempData["Mensagem"] = "Produto removido da vitrine. Os dados foram preservados."; return RedirectToAction(nameof(Index));
    }

    [HttpGet("/admin/configuracoes")]
    public async Task<IActionResult> Configuracoes(CancellationToken ct)
    {
        var c = await context.ConfiguracoesLoja.OrderBy(c => c.Id).FirstOrDefaultAsync(ct) ?? new ConfiguracaoLoja();
        return View(new ConfiguracaoLojaViewModel { NomeLoja = c.NomeLoja, TelefoneWhatsApp = c.TelefoneWhatsApp,
            InstagramUrl = c.InstagramUrl, RegiaoAtendida = c.RegiaoAtendida, TextoApresentacao = c.TextoApresentacao,
            FormasEntrega = c.FormasEntrega, FormasPagamento = c.FormasPagamento });
    }

    [HttpPost("/admin/configuracoes"), ValidateAntiForgeryToken]
    public async Task<IActionResult> Configuracoes(ConfiguracaoLojaViewModel model, CancellationToken ct)
    {
        if (!ModelState.IsValid) return View(model);
        var config = await context.ConfiguracoesLoja.OrderBy(c => c.Id).FirstOrDefaultAsync(ct) ?? new ConfiguracaoLoja();
        config.NomeLoja = model.NomeLoja.Trim(); config.TelefoneWhatsApp = Regex.Replace(model.TelefoneWhatsApp ?? "", "[^+0-9]", "");
        config.InstagramUrl = model.InstagramUrl.Trim(); config.RegiaoAtendida = model.RegiaoAtendida.Trim();
        config.TextoApresentacao = model.TextoApresentacao.Trim(); config.FormasEntrega = model.FormasEntrega.Trim();
        config.FormasPagamento = model.FormasPagamento.Trim(); config.UpdatedAt = DateTime.UtcNow;
        if (config.Id == 0) context.ConfiguracoesLoja.Add(config);
        await context.SaveChangesAsync(ct); TempData["Mensagem"] = "Configurações atualizadas."; return RedirectToAction(nameof(Configuracoes));
    }

    [HttpGet("/admin/categorias")]
    public async Task<IActionResult> Categorias(CancellationToken ct) => View(await context.Categorias.OrderBy(c => c.OrdemExibicao).ThenBy(c => c.Nome).ToListAsync(ct));

    [HttpPost("/admin/categorias"), ValidateAntiForgeryToken]
    public async Task<IActionResult> SalvarCategoria(int? id, string nome, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(nome) || nome.Length > 80) { TempData["Erro"] = "Informe um nome de até 80 caracteres."; return RedirectToAction(nameof(Categorias)); }
        var categoria = id.HasValue ? await context.Categorias.FindAsync([id.Value], ct) : new Categoria();
        if (categoria is null) return NotFound();
        var editar = id.HasValue;
        var nomeAnterior = categoria.Nome;
        categoria.Nome = nome.Trim(); categoria.Slug = Regex.Replace(nome.Trim().ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
        if (!id.HasValue) context.Categorias.Add(categoria);
        await context.SaveChangesAsync(ct);
        if (editar)
            await context.Produtos.Where(p => p.CategoriaId == categoria.Id || p.Categoria == nomeAnterior).ExecuteUpdateAsync(s => s.SetProperty(p => p.CategoriaId, (int?)categoria.Id).SetProperty(p => p.Categoria, categoria.Nome), ct);
        return RedirectToAction(nameof(Categorias));
    }

    [HttpPost("/admin/categorias/{id:int}/status"), ValidateAntiForgeryToken]
    public async Task<IActionResult> StatusCategoria(int id, CancellationToken ct)
    { var c = await context.Categorias.FindAsync([id], ct); if (c is null) return NotFound(); c.IsActive = !c.IsActive; await context.SaveChangesAsync(ct); return RedirectToAction(nameof(Categorias)); }
}
