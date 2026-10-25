namespace Services.Models.Media;

public sealed record MediaFileContent(Stream Content, string MimeType, string OriginalFilename);
