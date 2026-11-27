namespace EstoqueWeb.Services;

public interface IImageStorage
{
    Task<string> UploadAsync(IFormFile file, CancellationToken cancellationToken);
    Task DeleteAsync(string? publicUrl, CancellationToken cancellationToken);
}
