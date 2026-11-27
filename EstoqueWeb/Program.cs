using EstoqueWeb.Data;
using EstoqueWeb.Models;
using EstoqueWeb.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port)) builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
builder.Services.AddControllersWithViews();
var connection = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(string.IsNullOrWhiteSpace(connection)
        ? "Host=localhost;Database=estoque_design;Username=none;Password=none"
        : connection);
});
builder.Services.AddIdentity<IdentityUser, IdentityRole>(options =>
{
    options.Password.RequiredLength = 12;
    options.Password.RequireDigit = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.User.RequireUniqueEmail = true;
}).AddEntityFrameworkStores<AppDbContext>().AddDefaultTokenProviders();
builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/admin/entrar";
    options.AccessDeniedPath = "/admin/entrar";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.SlidingExpiration = true;
});
builder.Services.AddHttpClient<IImageStorage, SupabaseImageStorage>(client => client.Timeout = TimeSpan.FromSeconds(30));
var app = builder.Build();

var forwardedHeaders = new Microsoft.AspNetCore.Builder.ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor |
                       Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
};
forwardedHeaders.KnownIPNetworks.Clear();
forwardedHeaders.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeaders);

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllerRoute("admin", "admin/{action=Index}/{id?}", new { controller = "Admin" });
app.MapControllerRoute("default", "{controller=Home}/{action=Index}/{id?}");

// Provisionamento apenas quando credenciais fortes são fornecidas pelo ambiente.
await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (!string.IsNullOrWhiteSpace(connection))
    {
        await db.Database.MigrateAsync();
        if (!await db.ConfiguracoesLoja.AnyAsync())
        {
            db.ConfiguracoesLoja.Add(new ConfiguracaoLoja());
            await db.SaveChangesAsync();
        }
        var email = app.Configuration["InitialAdmin:Email"];
        var password = app.Configuration["InitialAdmin:Password"];
        if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password))
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
            if (await users.FindByEmailAsync(email) is null)
            {
                var user = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };
                var result = await users.CreateAsync(user, password);
                if (!result.Succeeded) throw new InvalidOperationException("Não foi possível criar o administrador inicial: " + string.Join("; ", result.Errors.Select(e => e.Code)));
            }
        }
    }
}
app.Run();

public partial class Program { }
