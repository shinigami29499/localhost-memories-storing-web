using System.Security.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Service.Exceptions;
using Infrastructure.Exceptions;

namespace Api.Middleware;

/// <summary>Logs failures and writes problem-details responses.</summary>
public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    private readonly RequestDelegate _next = next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger = logger;

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            if (context.Response.HasStarted)
            {
                _logger.LogError(ex, "Exception after the response has started; unable to send an error body");
                throw;
            }

            await WriteProblemAsync(context, ex);
        }
    }

    private async Task WriteProblemAsync(HttpContext context, Exception exception)
    {
        var (status, title) = exception switch
        {
            InvalidMediaFileException => (StatusCodes.Status400BadRequest, "Invalid media file"),
            ValidationException => (StatusCodes.Status400BadRequest, "Validation failed"),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Authentication failed"),
            AuthenticationException => (StatusCodes.Status401Unauthorized, "Authentication failed"),
            SecurityTokenException => (StatusCodes.Status401Unauthorized, "Invalid token"),
            ForbiddenException => (StatusCodes.Status403Forbidden, "Forbidden"),
            NotFoundException => (StatusCodes.Status404NotFound, "Not found"),
            ConflictException => (StatusCodes.Status409Conflict, "Conflict"),
            InvalidOperationException => (StatusCodes.Status409Conflict, "Operation conflict"),
            FileNotFoundException => (StatusCodes.Status404NotFound, "File not found"),
            DbUpdateException when IsUniqueViolation(exception) =>
                (StatusCodes.Status409Conflict, "Duplicate value"),
            _ => (StatusCodes.Status500InternalServerError, "Server error"),
        };

        if (status >= 500)
            _logger.LogError(exception, "Unhandled exception, request {Path}", context.Request.Path);
        else
            _logger.LogInformation(
                "Request {Path} failed with {Status}: {Message}",
                context.Request.Path, status, exception.Message);

        // Authentication endpoints stay deliberately ambiguous about failed logins.
        var message = exception is UnauthorizedAccessException or SecurityTokenException
            ? "Authentication failed."
            : exception.Message;

        var errors = exception is ValidationException validation ? validation.Errors : null;

        var payload = new Dictionary<string, object?>
        {
            ["type"] = "about:blank",
            ["title"] = title,
            ["status"] = status,
            ["detail"] = message,
        };
        if (errors is not null)
            payload["errors"] = errors;

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(payload);
    }

    private static bool IsUniqueViolation(Exception exception) =>
        exception is DbUpdateException de
        && (de.InnerException?.Message.Contains("unique", StringComparison.OrdinalIgnoreCase) ?? false
            || (de.InnerException is PostgresException pg && pg.SqlState == "23505"));
}
