// Define the entity structure for Azure Table Storage
export class OAuth2Relay {
  private clientId: string;
  private clientSecret: string;
  private readonly defaultScopes: string[];
  private tokenUrl: string;
  private authorizeUrl: string;
  private revokeUrl: string;

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

  public getAuthorizeUrl(redirectUri: string, state: string, codeChallenge: string, codeChallengeMethod: string, scopeValues?: string[]): string {
    const scopeSet = new Set<string>((scopeValues ?? this.defaultScopes).flatMap(scope => scope.split(' ')));
    scopeSet.delete("profile");

    const scopes = Array.from(scopeSet).join(' ');

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

  public async getUserInfo(accessToken: string): Promise<any> {
    const response = await fetch("https://discord.com/api/users/@me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve user info: ${response.statusText}`);
    }

    const discordUser = await response.json();
    return this.convertToOAuthUserInfo(discordUser);
  }

  private convertToOAuthUserInfo(discordUser: any): any {
    const oauthUserInfo: any = {
      sub: discordUser.id,
      name: discordUser.global_name ?? discordUser.name,
      preferred_username: discordUser.username,
      profile: `https://discord.com/users/${discordUser.id}`,
      picture: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
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

  public async exchangeCodeForToken(grantType: string, params: Record<string, string>): Promise<any> {
    const urlParams = new URLSearchParams();
    urlParams.append('client_id', this.clientId);
    urlParams.append('client_secret', this.clientSecret);
    urlParams.append('grant_type', grantType);

    Object.keys(params).forEach(key => {
      if (params[key]) {
        urlParams.append(key, params[key]);
      }
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: urlParams
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.statusText}`);
    }

    return response.json();
  }

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
      errorText = `Token revocation failed: ${error}`;
    }

    if (errorText) {
      console.error(errorText);
      throw new Error(errorText);
    }

    console.log("Token revoked successfully.");
  }
}
