using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Api.Core;
using Api.Middleware;
using Api.Implementations;
using Service.Core;
using Service.Implementations;
using Service.Interfaces;
using Service.Options;
using Data;
using Data.Interfaces;
using Infrastructure.Storage;
using Infrastructure.Implementations;
using Infrastructure.Interfaces;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .ValidateDataAnnotations()
    .Validate(o => !string.IsNullOrWhiteSpace(o.Key) && o.Key.Length >= 32,
        "Jwt:Key must be at least 32 characters long.")
    .Validate(o => o.AccessTokenMinutes > 0 && o.RefreshTokenDays > 0, "Token lifetimes must be positive.")
    .ValidateOnStart();

builder.Services.AddOptions<MediaStorageOptions>()
    .Bind(builder.Configuration.GetSection(MediaStorageOptions.SectionName))
    .PostConfigure(o =>
    {
        // Storage root is configurable; default to "<repo>/Backend/Storage" when empty.
        if (string.IsNullOrWhiteSpace(o.Root))
        {
            o.Root = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "storage"));
        }
        o.Root = Path.GetFullPath(o.Root);
    })
    .Validate(o => !string.IsNullOrWhiteSpace(o.Root), "MediaStorage:Root must be set.")
    .Validate(o => o.MaxFileMegabytes > 0, "MaxFileMegabytes must be positive.")
    .ValidateOnStart();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy => policy
        .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
        .UseSnakeCaseNamingConvention());

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<CurrentUserContext>();
builder.Services.AddScoped<ICurrentUserContext>(sp => sp.GetRequiredService<CurrentUserContext>());
builder.Services.AddScoped<IAuditActorProvider>(sp => sp.GetRequiredService<CurrentUserContext>());

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()!;

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = Constants.Auth.SubClaim,
            RoleClaimType = Constants.Auth.RoleClaim,
        };

        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                // Distinguish expired from missing/invalid tokens in the response detail.
                context.HandleResponse();
                var detail = context.Error == "invalid_token" && context.ErrorDescription is not null
                    ? $"Invalid token: {context.ErrorDescription}"
                    : "Authentication is required.";

                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/problem+json";
                await context.Response.WriteAsJsonAsync(new
                {
                    type = "about:blank",
                    title = "Unauthorized",
                    status = 401,
                    detail,
                });
            },
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddSingleton(sp => sp.GetRequiredService<IOptions<MediaStorageOptions>>().Value);
builder.Services.AddSingleton<IMediaStorageService, MediaStorageService>();

builder.Services.AddSingleton<IMapper, Mapper>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<IReactionService, ReactionService>();
builder.Services.AddScoped<IMediaService, MediaService>();

var mediaStorage = builder.Configuration.GetSection(MediaStorageOptions.SectionName).Get<MediaStorageOptions>()!;

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = (mediaStorage.MaxFileMegabytes + 10) * 1024L * 1024L; // + multipart overhead
});

builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = (mediaStorage.MaxFileMegabytes + 10) * 1024L * 1024L;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await DataSeeder.SeedAsync(app.Services);

app.Run();
