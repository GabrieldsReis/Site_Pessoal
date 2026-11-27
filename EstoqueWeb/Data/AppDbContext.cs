using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using EstoqueWeb.Models;

namespace EstoqueWeb.Data
{
    public class AppDbContext : IdentityDbContext<IdentityUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Produto> Produtos { get; set; }
        public DbSet<Categoria> Categorias { get; set; }
        public DbSet<ConfiguracaoLoja> ConfiguracoesLoja { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            builder.Entity<Produto>().Property(p => p.PrecoVenda).HasPrecision(10, 2);
            builder.Entity<Produto>().Property(p => p.PrecoCompra).HasPrecision(10, 2);
            builder.Entity<Produto>().HasOne(p => p.CategoriaRelacionada).WithMany(c => c.Produtos)
                .HasForeignKey(p => p.CategoriaId).OnDelete(DeleteBehavior.SetNull);
            builder.Entity<Categoria>().HasIndex(c => c.Slug).IsUnique();
        }
    }
}
