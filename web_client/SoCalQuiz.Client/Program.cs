using System.Net;

using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Authentication;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

using Radzen;

using SoCal.Quiz.QuestionEditor.Service;

namespace SoCal.Quiz.QuestionEditor;

#pragma warning disable CA1812

/// <summary>
/// Main application entry point class.
/// </summary>
public static class Program
{
    /// <summary>
    /// Main application entry point.
    /// </summary>
    /// <param name="args">The command line arguments.</param>
    /// <returns>A task for async monitoring.</returns>
    public static async Task Main(string[] args)
    {
        var builder = WebAssemblyHostBuilder.CreateDefault(args);
        builder.RootComponents.Add<App>("#app");
        builder.RootComponents.Add<HeadOutlet>("head::after");

        builder.Services.AddScoped(sp =>
            {
                var configuration = sp.GetRequiredService<IConfiguration>();
                var tokenProvider = sp.GetRequiredService<IAccessTokenProvider>();

                // Get the base address from configuration
                var baseAddress = configuration["BaseApiUrl"] ?? throw new InvalidOperationException("Must have valid BaseApiUrl");

                return new HttpClient(new AuthorizingHandler(tokenProvider))
                {
                    BaseAddress = new Uri(baseAddress),
                    DefaultRequestVersion = HttpVersion.Version20, // Enable HTTP/2
                    DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrHigher
                };
            });

        builder.Services.AddScoped<QuestionService>();
        builder.Services.AddRadzenComponents();

        builder.Services.AddOidcAuthentication(options =>
        {
            ////builder.Configuration.Bind("AzureAd", options.ProviderOptions.Authentication);
            options.ProviderOptions.Authority = "https://discord.com";
            options.ProviderOptions.ClientId = "1246297668318134272";
            options.ProviderOptions.ResponseType = "code";
            options.ProviderOptions.ResponseMode = "query";
            options.ProviderOptions.PostLogoutRedirectUri = "https://localhost:5001/authentication/login-callback";
            options.ProviderOptions.MetadataUrl = "http://localhost:5001/api/auth/.well-known/openid-configuration";
            options.ProviderOptions.DefaultScopes.Clear();
            options.ProviderOptions.DefaultScopes.Add("profile");
            options.ProviderOptions.DefaultScopes.Add("email");
            options.ProviderOptions.DefaultScopes.Add("guilds");

            // Set mapping for claims fixed issue
            options.UserOptions.NameClaim = "name";
            options.UserOptions.RoleClaim = "role";
            options.UserOptions.ScopeClaim = "scope";
        });

        await builder.Build().RunAsync();
    }
}
