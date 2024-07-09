import { BaseClient, generators, Issuer } from "openid-client";
import { TableClient } from "@azure/data-tables";

// Define the entity structure for Azure Table Storage
interface OAuthStateEntity {
  partitionKey: string;
  rowKey: string;
  state: string;
  codeVerifier: string;
}

export class OAuth2Relay {
  private discordIssuer: Issuer;
  private client: BaseClient;
  private tableClient: TableClient;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
    connectionString?: string | undefined,
    tableClient?: TableClient,
    private readonly defaultScopes: string[] = ["guilds", "email", "openid"],
    issuer: string = "https://discord.com",
    private tokenUrl = "https://discord.com/api/oauth2/token",
    authorizeUrl = "https://discord.com/api/oauth2/authorize",
    private revokeUrl = "https://discord.com/api/oauth2/revoke"
  ) {
    this.discordIssuer = new Issuer({
      issuer: issuer,
      authorization_endpoint: authorizeUrl,
      token_endpoint: tokenUrl,
      revocation_endpoint: revokeUrl
    });

    this.client = new this.discordIssuer.Client({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: [redirectUri],
      response_types: ["code"]
    });

    if (!tableClient) {
      if (!connectionString) {
        connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      }

      if (!connectionString) {
        throw new Error("Invalid Azure storage connection string");
      }

      this.tableClient = TableClient.fromConnectionString(connectionString, "OAuthCodes");
    } else {
      this.tableClient = tableClient;
    }
  }

  public async getAuthorizationUrl(resourceUri: string): Promise<string> {
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const state = generators.state();

    await this.saveOAuthState(state, codeVerifier);

    const scopeString = this.defaultScopes.join(" ");

    return this.client.authorizationUrl({
      scope: scopeString,
      resource: resourceUri,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state: state
    });
  }

  private async saveOAuthState(state: string, codeVerifier: string): Promise<void> {
    const entity: OAuthStateEntity = {
      partitionKey: "OAuthState",
      rowKey: state,
      state: state,
      codeVerifier: codeVerifier
    };

    await this.tableClient.createEntity(entity);
  }

  public async getOAuthState(state: string): Promise<{ state: string; codeVerifier: string } | null> {
    try {
      const entity = await this.tableClient.getEntity<OAuthStateEntity>("OAuthState", state);
      return { state: entity.state, codeVerifier: entity.codeVerifier };
    } catch (error) {
      // Handle error or entity not found
      console.error(`Error retrieving OAuth state: ${error}`);
      return null;
    }
  }

  public async getToken(code: string, state: string): Promise<any> {
    const oauthState = await this.getOAuthState(state);

    if (!oauthState) {
      throw new Error("Invalid state parameter");
    }

    let errorText: string | undefined;

    try {
      const tokenResponse = await fetch(this.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: this.redirectUri,
          code_verifier: oauthState.codeVerifier
        })
      });

      if (!tokenResponse.ok) {
        errorText = await tokenResponse.text();
      }
      else
      {
        return await tokenResponse.json();
      }
    } catch (error) {
      errorText = `Token exchange failed: ${error}`;
    }

    if (errorText) {
      throw new Error(errorText);
    }
  }

  public async revokeToken(token: string): Promise<void> {
    let errorText : string | undefined;
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
      errorText = `Token revocation failed: ${error}`
    }

    if (errorText) {
      throw new Error(errorText);
    }
  }
}
