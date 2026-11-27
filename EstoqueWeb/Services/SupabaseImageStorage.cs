using System.Net.Http.Headers;

namespace EstoqueWeb.Services;

public sealed class SupabaseImageStorage(HttpClient http, IConfiguration configuration, ILogger<SupabaseImageStorage> logger) : IImageStorage
{
    private readonly string? _url = configuration["Storage:SupabaseUrl"]?.TrimEnd('/');
    private readonly string? _key = configuration["Storage:ServiceKey"];
    private readonly string _bucket = configuration["Storage:Bucket"] ?? "produtos";

    public async Task<string> UploadAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_url) || string.IsNullOrWhiteSpace(_key))
            throw new InvalidOperationException("O armazenamento de imagens não está configurado. Configure STORAGE__SUPABASEURL e STORAGE__SERVICEKEY.");
        var (extension, contentType, signature) = await ValidateAsync(file, cancellationToken);
        var key = $"{Guid.NewGuid():N}{extension}";
        await using var stream = file.OpenReadStream();
        var header = new byte[signature.Length];
        _ = await stream.ReadAsync(header, cancellationToken);
        if (!header.SequenceEqual(signature)) throw new InvalidDataException("O conteúdo do arquivo não corresponde a uma imagem JPEG, PNG ou WebP válida.");
        stream.Position = 0;
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_url}/storage/v1/object/{Uri.EscapeDataString(_bucket)}/{key}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _key);
        request.Headers.Add("apikey", _key);
        request.Headers.Add("x-upsert", "false");
        request.Content = new StreamContent(stream);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        using var response = await http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Upload remoto falhou com status {StatusCode}.", (int)response.StatusCode);
            throw new InvalidOperationException("Não foi possível armazenar a imagem. Confira a configuração do bucket de imagens.");
        }
        return $"{_url}/storage/v1/object/public/{Uri.EscapeDataString(_bucket)}/{key}";
    }

    public async Task DeleteAsync(string? publicUrl, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(publicUrl) || string.IsNullOrWhiteSpace(_url) || string.IsNullOrWhiteSpace(_key)) return;
        var marker = $"/storage/v1/object/public/{Uri.EscapeDataString(_bucket)}/";
        var index = publicUrl.IndexOf(marker, StringComparison.Ordinal);
        if (index < 0) return;
        var key = Uri.UnescapeDataString(publicUrl[(index + marker.Length)..]);
        using var request = new HttpRequestMessage(HttpMethod.Delete, $"{_url}/storage/v1/object/{Uri.EscapeDataString(_bucket)}/{Uri.EscapeDataString(key)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _key);
        request.Headers.Add("apikey", _key);
        using var response = await http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode) logger.LogWarning("A remoção de imagem remota falhou com status {StatusCode}.", (int)response.StatusCode);
    }

    private static async Task<(string Extension, string Mime, byte[] Signature)> ValidateAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length is <= 0 or > 5 * 1024 * 1024) throw new InvalidDataException("A imagem deve ter até 5 MB.");
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        await using var stream = file.OpenReadStream();
        var bytes = new byte[12];
        var read = await stream.ReadAsync(bytes, cancellationToken);
        var png = new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 };
        var jpeg = new byte[] { 255, 216, 255 };
        var isPng = ext == ".png" && read >= 8 && bytes.Take(8).SequenceEqual(png);
        var isJpeg = ext is ".jpg" or ".jpeg" && read >= 3 && bytes.Take(3).SequenceEqual(jpeg);
        var isWebp = ext == ".webp" && read >= 12 && bytes.Take(4).SequenceEqual("RIFF"u8.ToArray()) && bytes.Skip(8).Take(4).SequenceEqual("WEBP"u8.ToArray());
        return isPng ? (".png", "image/png", png) : isJpeg ? (ext, "image/jpeg", jpeg) : isWebp ? (".webp", "image/webp", bytes) : throw new InvalidDataException("Use uma imagem JPEG, PNG ou WebP válida.");
    }
}
