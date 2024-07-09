using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

namespace SoCal.Quiz.QuestionEditor;

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

        builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

        builder.Services.AddOidcAuthentication(options =>
        {
            ////builder.Configuration.Bind("AzureAd", options.ProviderOptions.Authentication);
            options.ProviderOptions.Authority = "https://localhost:5001/api/initiateOAuth";
            options.ProviderOptions.ClientId = "1246297668318134272";
            options.ProviderOptions.ResponseType = "code";
            options.ProviderOptions.ResponseMode = "query";
            options.ProviderOptions.RedirectUri = "https://localhost:5001/authentication/login-callback";
            options.ProviderOptions.PostLogoutRedirectUri = "https://localhost:5001/authentication/login-callback";
            options.ProviderOptions.MetadataUrl = "http://localhost:5001/api/wellKnownConfig";
        });

        await builder.Build().RunAsync();
    }
}
