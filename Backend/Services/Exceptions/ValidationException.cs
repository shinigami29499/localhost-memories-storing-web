namespace Services.Exceptions;

public class ValidationException(string message, Dictionary<string, string[]> errors) : Exception(message)
{
    public IReadOnlyDictionary<string, string[]> Errors { get; } = errors;
}
