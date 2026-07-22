using EstoqueWeb.Data;
using EstoqueWeb.ViewModels;
using Microsoft.AspNetCore.Mvc;

namespace EstoqueWeb.Controllers;

public class ProdutoController : Controller
{
    private readonly AppDbContext _context;

    public ProdutoController(AppDbContext context)
    {
        _context = context;
    }



   public IActionResult Index()
{
    var viewModel = new EstoqueViewModel
    {
        Produtos = _context.Produtos.ToList()
    };

    return View(viewModel);
}

    [HttpPost]
    public IActionResult Create(EstoqueViewModel model)
    {
        _context.Produtos.Add(model.NovoProduto);

        _context.SaveChanges();

        return RedirectToAction(nameof(Index));
    }
}