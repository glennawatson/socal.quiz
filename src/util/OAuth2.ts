export class OAuth2 {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
    private readonly tokenUrl = "https://discord.com/api/oauth2/token",
    private readonly authorizeUrl = "https://discord.com/api/oauth2/authorize",
  ) {}

  public getAuthorizeUrl(state: string, scopes: string[]): string {
    if (!this.redirectUri) {
      throw new Error("Must have a valid redirect uri");
    }

    const scope = scopes.join(" ");
    return `${this.authorizeUrl}?response_type=code&client_id=${this.clientId}&scope=${encodeURIComponent(scope)}&state=${state}&redirect_uri=${encodeURIComponent(this.redirectUri)}`;
  }

  public async exchangeCode(code: string): Promise<any> {
    if (!this.redirectUri) {
      throw new Error("Must have a valid redirect uri");
    }

    const data = new URLSearchParams();
    data.append("client_id", this.clientId);
    data.append("client_secret", this.clientSecret);
    data.append("grant_type", "authorization_code");
    data.append("code", code);
    data.append("redirect_uri", this.redirectUri);

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      body: data,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!response.ok) {
      throw new Error("Failed to exchange code for tokens");
    }

    return response.json();
  }

  public async validateToken(token: string): Promise<any> {
    const response = await fetch("https://discord.com/api/oauth2/@me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Invalid token");
    }

    return response.json();
  }

  public async getUserGuilds(token: string): Promise<any[]> {
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user guilds");
    }

    return response.json();
  }
}
