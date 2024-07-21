// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.Extensions.DependencyInjection;

namespace Microsoft.AspNetCore.Components.WebAssembly.Authentication.Internal;

internal sealed class AccessTokenProviderAccessor(IServiceProvider provider) : IAccessTokenProviderAccessor
{
    private readonly IServiceProvider _provider = provider;
    private IAccessTokenProvider? _tokenProvider;

    public IAccessTokenProvider TokenProvider => _tokenProvider ??= _provider.GetRequiredService<IAccessTokenProvider>();
}
