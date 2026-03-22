import { InvocationContext, HttpRequest, type HttpResponseInit, app } from "@azure/functions";
import { Config } from "../util/config.js";
import { parse } from 'querystring';

/**
 * Initiates the Discord OAuth2 authorization flow.
 * Constructs the Discord authorize URL from query parameters (state, code_challenge,
 * redirect_uri, scope) and redirects the user to it.
 *
 * @param req - The incoming HTTP request with OAuth query parameters.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to a redirect response to the Discord authorize URL.
 */
export async function initiateOAuth(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Initiating OAuth process');

  const state: string | null = req.query.get('state');
  const codeChallenge: string | null = req.query.get('code_challenge');
  const codeChallengeMethod: string = req.query.get('code_challenge_method') ?? "S256";
  const redirectUri: string | null = req.query.get('redirect_uri');
  const scopes: string[] = req.query.getAll('scope'); // Get all scope query parameters

  console.log(JSON.stringify(scopes, null, 2));

  if (!state || !codeChallenge || !redirectUri || scopes.length === 0) {
    return createHttpResponse(400, { error: 'Missing required query parameters' }, req);
  }

  await Config.initialize();

  const oauth2Relay = Config.oauth2Relay;

  const authUrl: string = oauth2Relay.getAuthorizeUrl(redirectUri, state, codeChallenge, codeChallengeMethod, scopes);
  return createRedirectUrl(authUrl, req);
}

/**
 * Exchanges an authorization code or refresh token for an access token.
 * Accepts form-encoded bodies with grant_type "authorization_code" or "refresh_token"
 * and proxies the token exchange through the Discord OAuth2 API.
 *
 * @param req - The incoming HTTP request with form-encoded token parameters.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response containing the token or an error.
 */
export async function exchangeToken(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('OAuth Token Callback: starting');

  // Parse the request body for application/x-www-form-urlencoded data
  const requestBody: string = await req.text();
  const parsedBody = parse(requestBody);

  const grantType = parsedBody.grant_type;

  if (!grantType) {
    context.error("OAuth Token Callback: Missing grant_type");
    return createHttpResponse(400, { error: 'grant_type is required in the request body' }, req);
  }

  let params: Record<string, string>;

  if (grantType === 'authorization_code') {
    params = {
      code: parsedBody.code as string,
      redirect_uri: parsedBody.redirect_uri as string
    };

    if (!params.code || !params.redirect_uri) {
      context.error("OAuth Token Callback: Missing required parameters for authorization_code");
      return createHttpResponse(400, { error: 'code and redirect_uri are required in the request body' }, req);
    }

    if (parsedBody.code_verifier) {
      params.code_verifier = parsedBody.code_verifier as string;
    }

    if (parsedBody.state) {
      params.state = parsedBody.state as string;
    }
  } else if (grantType === 'refresh_token') {
    params = {
      refresh_token: parsedBody.refresh_token as string
    };

    if (!params.refresh_token) {
      context.error("OAuth Token Callback: Missing required parameter refresh_token");
      return createHttpResponse(400, { error: 'refresh_token is required in the request body' }, req);
    }
  } else {
    context.error("OAuth Token Callback: Unsupported grant_type");
    return createHttpResponse(400, { error: 'Unsupported grant_type' }, req);
  }

  await Config.initialize();

  const oauth2Relay = Config.oauth2Relay;

  try {
    const tokenResponse: unknown = await oauth2Relay.exchangeCodeForToken(grantType, params);
    context.log(`OAuth Token Callback: success`);
    return createHttpResponse(200, tokenResponse, req);
  } catch (error) {
    context.error(`OAuth Token Callback failed: ${String(error)}`);
    return createHttpResponse(500, { error: 'Failed to handle OAuth callback' }, req);
  }
}

/**
 * Returns the OpenID Connect well-known configuration for the OAuth2 relay.
 * Dynamically constructs endpoint URLs based on the incoming request's host and protocol.
 *
 * @param req - The incoming HTTP request.
 * @param context - The Azure Functions invocation context.
 * @returns The HTTP response containing the OpenID configuration.
 */
export function wellKnownConfig(req: HttpRequest, context: InvocationContext): HttpResponseInit {
  context.log("WELL-KNOWN: returning the well known data");

  const proto: string = req.headers.get('x-forwarded-proto') ?? 'http';
  const host: string | null = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const baseUrl = `${proto}://${host}`;

  const config = {
    authorization_endpoint: `${baseUrl}/api/auth/authorize`,
    token_endpoint: `${baseUrl}/api/auth/token`,
    revocation_endpoint: `${baseUrl}/api/auth/revokeToken`,
    userinfo_endpoint: `${baseUrl}/api/auth/userinfo`,
    issuer: "https://discord.com",
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
  };

  return createHttpResponse(200, config, req);
}

/**
 * Revokes a Discord OAuth2 token.
 * Requires a "token" query parameter containing the token to revoke.
 *
 * @param req - The incoming HTTP request with the token query parameter.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response indicating success or failure.
 */
export async function revokeToken(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('starting revoke token');

  const token: string | null = req.query.get("token");

  if (!token) {
    return createHttpResponse(400, { error: 'token query parameter is required' }, req);
  }

  await Config.initialize();

  const oauth2Relay = Config.oauth2Relay;

  try {
    await oauth2Relay.revokeToken(token);
    return createHttpResponse(200, { message: 'Token revoked successfully' }, req);
  } catch (error) {
    context.error(`Token revocation failed: ${String(error)}`);
    return createHttpResponse(500, { error: 'Failed to revoke token' }, req);
  }
}

/**
 * Retrieves the authenticated user's Discord profile information.
 * Extracts the Bearer access token from the Authorization header and
 * proxies the request to the Discord user info endpoint.
 *
 * @param req - The incoming HTTP request with the Authorization header.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response containing user info or an error.
 */
export async function userInfo(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('USERINFO: Starting user info request');

  // Extract the access token from the Authorization header
  const authorizationHeader: string | null = req.headers.get('Authorization');
  if (!authorizationHeader) {
    context.log("USERINFO: No authorization header");
    return createHttpResponse(400, { error: 'Authorization header is required' }, req);
  }

  const accessToken: string = authorizationHeader.replace('Bearer ', '');
  if (!accessToken) {
    context.log("USERINFO: authorization header wrong format");
    return createHttpResponse(400, { error: 'Invalid authorization header format' }, req);
  }

  await Config.initialize();
  const oauth2Relay = Config.oauth2Relay;

  try {
    const userInfo: unknown = await oauth2Relay.getUserInfo(accessToken);
    context.log('User info retrieved successfully');
    return createHttpResponse(200, userInfo, req);
  } catch (error) {
    context.error(`Failed to retrieve user info: ${String(error)}`);
    return createHttpResponse(500, { error: 'Failed to retrieve user info' }, req);
  }
}

/** Handles CORS preflight OPTIONS requests for all auth endpoints. */
app.http("preflight", {
  methods: ["OPTIONS"],
  authLevel: "anonymous",
  route: "auth/{*restOfPath}",
  handler: (req: HttpRequest, context: InvocationContext): HttpResponseInit => {
    context.log("Handling preflight request");
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': getBaseUrl(req),
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400' // Cache the preflight response for 1 day
      }
    };
  }
});

app.http("userInfo", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "auth/userinfo",
  handler: userInfo,
});

app.http("auth", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "auth/authorize",
  handler: initiateOAuth,
});

app.http("token", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/token",
  handler: exchangeToken,
});

app.http("wellKnownConfig", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "auth/.well-known/openid-configuration",
  handler: wellKnownConfig,
});

app.http("revokeToken", {
  methods: ["POST"],
  route: "auth/revokeToken",
  authLevel: "anonymous",
  handler: revokeToken,
});

/**
 * Derives the base URL (origin) from the incoming request headers.
 * Returns "*" for localhost to allow all origins during local development.
 *
 * @param req - The incoming HTTP request.
 * @returns The base URL string for CORS headers.
 */
function getBaseUrl(req: HttpRequest): string {
  const host: string | null = req.headers.get('x-forwarded-host') ?? req.headers.get('host');

  if (host?.startsWith('localhost')) {
    return '*';
  }

  const proto: string = req.headers.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

/**
 * Creates a JSON HTTP response with standard CORS headers.
 * Serializes the body and attaches Access-Control-Allow-* headers based on the request origin.
 *
 * @param status - The HTTP status code.
 * @param body - The response body to serialize as JSON.
 * @param req - The incoming HTTP request used to derive CORS origin.
 * @returns The HTTP response object.
 */
function createHttpResponse(status: number, body: unknown, req: HttpRequest): HttpResponseInit {

  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getBaseUrl(req),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify(body),
  };
}

/**
 * Creates a 302 redirect response with CORS headers pointing to the given URL.
 *
 * @param url - The URL to redirect to.
 * @param req - The incoming HTTP request used to derive CORS origin.
 * @returns The HTTP redirect response object.
 */
function createRedirectUrl(url: string, req: HttpRequest): HttpResponseInit {
  return {
    status: 302,
    headers: {
      'Location': url,
      'Access-Control-Allow-Origin': getBaseUrl(req),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
  };
}
