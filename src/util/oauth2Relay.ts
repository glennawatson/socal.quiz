/**
 * Relays OAuth2 operations to the Discord authorization server.
 *
 * Handles building authorize URLs (with PKCE), exchanging authorization codes
 * for tokens, fetching user info, and revoking tokens.
 */
export class OAuth2Relay {
  private clientId: string;
  private clientSecret: string;
  private readonly defaultScopes: string[];
  private tokenUrl: string;
  private authorizeUrl: string;
  private revokeUrl: string;

  /**
   * Creates a new OAuth2Relay instance.
   *
   * @param clientId - The Discord application client ID.
   * @param clientSecret - The Discord application client secret.
   * @param defaultScopes - OAuth2 scopes to request by default.
   * @param tokenUrl - The Discord token exchange endpoint URL.
   * @param authorizeUrl - The Discord authorization endpoint URL.
   * @param revokeUrl - The Discord token revocation endpoint URL.
   */
  constructor(
    clientId: string,
    clientSecret: string,
    defaultScopes: string[] = ["guilds", "email", "openid"],
    tokenUrl = "https://discord.com/api/oauth2/token",
    authorizeUrl = "https://discord.com/oauth2/authorize",
    revokeUrl = "https://discord.com/api/oauth2/revoke"
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.defaultScopes = defaultScopes;
    this.tokenUrl = tokenUrl;
    this.authorizeUrl = authorizeUrl;
    this.revokeUrl = revokeUrl;
    console.debug("Initializing OAuth2Relay...");

    console.debug("OAuth2Relay initialized with clientId: ", clientId);
  }

  /**
   * Builds a Discord OAuth2 authorization URL with PKCE parameters.
   *
   * @param redirectUri - The URI Discord will redirect to after authorization.
   * @param state - An opaque value used to prevent CSRF attacks.
   * @param codeChallenge - The PKCE code challenge derived from the code verifier.
   * @param codeChallengeMethod - The PKCE challenge method (e.g. "S256").
   * @param scopeValues - Optional override for the OAuth2 scopes to request.
   * @returns The fully constructed authorization URL.
   */
  public getAuthorizeUrl(redirectUri: string, state: string, codeChallenge: string, codeChallengeMethod: string, scopeValues?: string[]): string {
    const scopeSet = new Set<string>((scopeValues ?? this.defaultScopes).flatMap(scope => scope.split(' ')));
    const scopes = scopeSet.difference(new Set(["profile"])).values().toArray().join(' ');

    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('redirect_uri', redirectUri);
    params.append('response_type', 'code');
    params.append('scope', scopes);
    params.append('state', state);
    params.append('code_challenge', codeChallenge);
    params.append('code_challenge_method', codeChallengeMethod);

    return `${this.authorizeUrl}?${params.toString()}`;
  }

  /**
   * Fetches the authenticated Discord user's profile and converts it to an
   * OpenID Connect-style user info object.
   *
   * @param accessToken - A valid Discord OAuth2 access token.
   * @returns An object containing standard OIDC claims (sub, name, email, etc.)
   *   plus Discord-specific fields.
   */
  public async getUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    const response = await fetch("https://discord.com/api/users/@me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve user info: ${response.statusText}`);
    }

    const discordUser = (await response.json()) as Record<string, unknown>;
    return this.convertToOAuthUserInfo(discordUser);
  }

  /**
   * Converts a raw Discord user object into an OpenID Connect-style user info object.
   *
   * @param discordUser - The raw user object from the Discord API.
   * @returns An OIDC-compatible user info record.
   */
  private convertToOAuthUserInfo(discordUser: Record<string, unknown>): Record<string, unknown> {
    const oauthUserInfo: Record<string, unknown> = {
      sub: discordUser.id,
      name: discordUser.global_name ?? discordUser.name,
      preferred_username: discordUser.username,
      profile: `https://discord.com/users/${String(discordUser.id)}`,
      picture: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${String(discordUser.id)}/${discordUser.avatar as string}.png` : null,
      email: discordUser.email,
      email_verified: discordUser.verified,
      locale: discordUser.locale
    };

    const optionalFields = [
      'discriminator', 'global_name', 'bot', 'system', 'mfa_enabled', 'banner',
      'accent_color', 'flags', 'premium_type', 'public_flags', 'avatar_decoration_data'
    ];

    optionalFields.forEach(field => {
      if (discordUser[field] !== undefined) {
        oauthUserInfo[field] = discordUser[field];
      }
    });

    return oauthUserInfo;
  }

  /**
   * Exchanges an authorization code (or refresh token) for an access token
   * via the Discord token endpoint.
   *
   * @param grantType - The OAuth2 grant type (e.g. "authorization_code", "refresh_token").
   * @param params - Additional parameters to include in the token request body
   *   (e.g. `code`, `redirect_uri`, `code_verifier`).
   * @returns The parsed token response from Discord (includes `access_token`, `refresh_token`, etc.).
   */
  public async exchangeCodeForToken(grantType: string, params: Record<string, string>): Promise<Record<string, unknown>> {
    const urlParams = new URLSearchParams();
    urlParams.append('client_id', this.clientId);
    urlParams.append('client_secret', this.clientSecret);
    urlParams.append('grant_type', grantType);

    for (const [key, value] of Object.entries(params)) {
      if (value) {
        urlParams.append(key, value);
      }
    }

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: urlParams
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.statusText}`);
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  /**
   * Revokes a Discord OAuth2 access or refresh token.
   *
   * @param token - The token to revoke.
   * @returns A promise that resolves when the token is revoked.
   */
  public async revokeToken(token: string): Promise<void> {
    console.debug("Revoking token...");
    let errorText: string | undefined;
    try {
      const revokeResponse = await fetch(this.revokeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          token: token,
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      });

      if (!revokeResponse.ok) {
        errorText = await revokeResponse.text();
      }
    } catch (error) {
      errorText = `Token revocation failed: ${String(error)}`;
    }

    if (errorText) {
      console.error(errorText);
      throw new Error(errorText);
    }

    console.log("Token revoked successfully.");
  }
}
