using Microsoft.AspNetCore.Components.WebAssembly.Authentication;

namespace SoCal.Quiz.QuestionEditor;

/// <summary>
/// A handler that handles authorising against the access token provider.
/// </summary>
/// <param name="accessTokenProvider">The token provider.</param>
public class AuthorizingHandler(IAccessTokenProvider accessTokenProvider) : DelegatingHandler(new HttpClientHandler())
{
    private readonly IAccessTokenProvider _accessTokenProvider = accessTokenProvider ?? throw new ArgumentNullException(nameof(accessTokenProvider));

    /// <inheritdoc/>
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (!request.Headers.Contains("Authorization"))
        {
            var result = await _accessTokenProvider.RequestAccessToken();
            if (result.TryGetToken(out var token))
            {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Value);
            }
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
