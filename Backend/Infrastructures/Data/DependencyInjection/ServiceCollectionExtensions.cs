using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Infrastructures.Data.ApplicationServices;
using Infrastructures.Data.Implementations;
using Infrastructures.Data.Interfaces;
using Services.Interfaces;

namespace Infrastructures.Data.DependencyInjection;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddDataPersistence(
        this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString)
                .UseSnakeCaseNamingConvention());

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IMediaRepository, MediaRepository>();
        services.AddScoped<IUploadRepository, UploadRepository>();
        services.AddScoped<ICollectionRepository, CollectionRepository>();
        services.AddScoped<IFoodPlaceRepository, FoodPlaceRepository>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IMediaService, MediaService>();
        services.AddScoped<IUploadService, UploadService>();
        services.AddScoped<ICollectionService, CollectionService>();
        services.AddScoped<IFoodPlaceService, FoodPlaceService>();

        return services;
    }
}
