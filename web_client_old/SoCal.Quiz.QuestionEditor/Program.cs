using System.Net;
using Blazorise;
using Blazorise.Bootstrap5;
using Blazorise.Icons.FontAwesome;
using Blazorise.RichTextEdit;

using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using SoCal.Quiz.QuestionEditor.Service;
using SoCal.Quiz.QuestionEditor.Service.DTOs;

namespace SoCal.Quiz.QuestionEditor;

/// <summary>
/// The class which hosts the main execution point.
/// </summary>
public static class Program
{
    /// <summary>
    /// The main execution point.
    /// </summary>
    /// <param name="args">The program arguments.</param>
    /// <returns>A task to monitor.</returns>
    public static async Task Main(string[] args)
    {
        var builder = WebAssemblyHostBuilder.CreateDefault(args);
        builder.RootComponents.Add<App>("#app");
        builder.RootComponents.Add<HeadOutlet>("head::after");

        builder.Services.AddScoped(sp =>
            new HttpClient
            {
                BaseAddress = new Uri(builder.HostEnvironment.BaseAddress),
                DefaultRequestVersion = HttpVersion.Version20, // Enable HTTP/2
                DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrHigher
            });

        builder.Services.AddScoped<QuestionService>();
        builder.Services
            .AddBlazorise(options => options.Immediate = true)
            .AddBootstrap5Providers()
            .AddFontAwesomeIcons();

        builder.Services.AddMsalAuthentication(options =>
        {
            options.ProviderOptions.LoginMode = "redirect";
            options.ProviderOptions.Authentication.ClientId = "1246297668318134272";
            options.ProviderOptions.Authentication.Authority = "https://discord.com/oauth2/authorize";
            options.ProviderOptions.Authentication.ValidateAuthority = false;
            options.ProviderOptions.Authentication.RedirectUri = "https://localhost:5001/authentication/login-callback";
        });

        builder.Services.AddBlazoriseRichTextEdit();

        await builder.Build().RunAsync();
    }
}
