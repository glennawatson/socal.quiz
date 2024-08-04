// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

namespace Microsoft.AspNetCore.Components.WebAssembly.Authentication;

/// <summary>
/// An <see cref="Exception"/> that is thrown when an <see cref="AuthorizationMessageHandler"/> instance
/// is not able to provision an access token.
/// </summary>
/// <remarks>
/// Initialize a new instance of <see cref="AccessTokenNotAvailableException"/>.
/// </remarks>
/// <param name="navigation">The <see cref="NavigationManager"/>.</param>
/// <param name="tokenResult">The <see cref="AccessTokenResult"/>.</param>
/// <param name="scopes">The scopes.</param>
public class AccessTokenNotAvailableException(
    NavigationManager navigation,
    AccessTokenResult tokenResult,
    IEnumerable<string>? scopes) : Exception(message: "Unable to provision an access token for the requested scopes: " +
              scopes != null ? $"'{string.Join(", ", scopes ?? Array.Empty<string>())}'" : "(default scopes)")
{
    private readonly NavigationManager _navigation = navigation;
    private readonly AccessTokenResult _tokenResult = tokenResult;

    /// <summary>
    /// Navigates to <see cref="AccessTokenResult.InteractiveRequestUrl"/> using the given <see cref="AccessTokenResult.InteractionOptions"/>
    /// to allow refreshing the access token.
    /// </summary>
    public void Redirect()
    {
        if (_tokenResult.InteractionOptions != null && _tokenResult.InteractiveRequestUrl != null)
        {
            _navigation.NavigateToLogin(_tokenResult.InteractiveRequestUrl, _tokenResult.InteractionOptions);
        }
        else
        {
#pragma warning disable CS0618 // Type or member is obsolete
            _navigation.NavigateTo(_tokenResult.RedirectUrl!);
#pragma warning restore CS0618 // Type or member is obsolete
        }
    }

    /// <summary>
    /// Navigates to <see cref="AccessTokenResult.InteractiveRequestUrl"/> using the given <see cref="AccessTokenResult.InteractionOptions"/>
    /// to allow refreshing the access token.
    /// </summary>
    /// <param name="configureInteractionOptions">A callback to further configure the initial set of options to be passed during the interactive token adquisition flow.</param>
    public void Redirect(Action<InteractiveRequestOptions> configureInteractionOptions)
    {
        ArgumentNullException.ThrowIfNull(configureInteractionOptions);
        configureInteractionOptions(_tokenResult.InteractionOptions!);
        _navigation.NavigateToLogin(_tokenResult.InteractiveRequestUrl!, _tokenResult.InteractionOptions!);
    }
}