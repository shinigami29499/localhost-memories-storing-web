using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.Tokens;
using Apis.Core;
using Apis.Interfaces;
using Apis.Middleware;
using Apis.Implementations;
using Services.Core;
using Services.Interfaces;
using Services.Options;
using Infrastructures.Data.Interfaces;
using Infrastructures.Data.DependencyInjection;
using Services.DependencyInjection;
using Infrastructures.Adapters.Storage;
using Infrastructures.Adapters.Implementations;
using Infrastructures.Adapters.Interfaces;
using Apis.Realtime;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddSingleton<IUserIdProvider, SubClaimUserIdProvider>();

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

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is required.");
builder.Services.AddDataPersistence(connectionString);

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
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken)
                    && context.HttpContext.Request.Path.StartsWithSegments("/hubs/notifications"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
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

builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Constants.Auth.AdminPolicy, policy => policy.RequireRole(Constants.Roles.Admin));

builder.Services.AddSingleton(sp => sp.GetRequiredService<IOptions<MediaStorageOptions>>().Value);
builder.Services.AddSingleton<MediaStorageService>();
builder.Services.AddSingleton<IMediaStorage>(sp => sp.GetRequiredService<MediaStorageService>());
builder.Services.AddSingleton<IMediaStorageService>(sp => sp.GetRequiredService<MediaStorageService>());

builder.Services.AddApplicationServices();

var mediaStorage = builder.Configuration.GetSection(MediaStorageOptions.SectionName).Get<MediaStorageOptions>()!;
var maxFileSectionLength = (mediaStorage.MaxFileMegabytes + 10L) * 1024L * 1024L;

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = UploadLimits.MaxTotalBytes + 10L * 1024L * 1024L;
});

builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = maxFileSectionLength;
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
app.MapHub<NotificationsHub>("/hubs/notifications").RequireAuthorization();

await DataSeeder.SeedAsync(app.Services);

app.Run();
