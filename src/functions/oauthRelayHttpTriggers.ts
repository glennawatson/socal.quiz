import { InvocationContext, HttpRequest, HttpResponseInit, app } from "@azure/functions";
import { Config } from "../util/config.js";

function getBaseUrl(req: HttpRequest) {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  return `${proto}://${host}`;
}

// Helper method to create HttpResponseInit with CORS headers
function createHttpResponse(status: number, body: any, req: HttpRequest): HttpResponseInit {

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

// Initiate the authorization request
export async function initiateOAuth(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('starting initiate oauth');

  await Config.initialize();

  const oauth2Relay = Config.oauth2Relay;

  const resourceUri = req.query.get('resource_uri');

  if (!resourceUri) {
    return createHttpResponse(400, { error: 'resource_uri query parameter is required' }, req);
  }

  const authorizationUrl = await oauth2Relay.getAuthorizationUrl(resourceUri);

  return {
    status: 302,
    headers: {
      'Location': authorizationUrl,
      'Access-Control-Allow-Origin': getBaseUrl(req),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
  };
}

// Handle the OAuth2 callback
export async function oauthCallbackHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('starting callback oauth');

  const code = req.query.get("code");
  const state = req.query.get("state");

  if (!code || !state) {
    return createHttpResponse(400, { error: 'code and state query parameters are required' }, req);
  }

  await Config.initialize();

  const oauth2Relay = Config.oauth2Relay;

  const authState = await oauth2Relay.getOAuthState(state);

  if (!authState) {
    return createHttpResponse(400, { error: 'Invalid state parameter' }, req);
  }

  try {
    const tokenResponse = await oauth2Relay.getToken(code, authState.codeVerifier);
    return createHttpResponse(200, tokenResponse, req);
  } catch (error) {
    context.error(`Token exchange failed: ${error}`);
    return createHttpResponse(500, { error: 'Failed to exchange token' }, req);
  }
}

// Well-known configuration endpoint
export async function wellKnownConfig(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log("returning the well known data");
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const baseUrl = `${proto}://${host}`;

  const config = {
    authorization_endpoint: `${baseUrl}/api/initiateOAuth`,
    token_endpoint: `${baseUrl}/api/oauthCallback`,
    revocation_endpoint: `${baseUrl}/api/revokeToken`,
    issuer: baseUrl,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`
  };

  return createHttpResponse(200, config, req);
}

// Revoke tokens
export async function revokeToken(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('starting revoke token');

  const token = req.query.get("token");

  if (!token) {
    return createHttpResponse(400, { error: 'token query parameter is required' }, req);
  }

  await Config.initialize();

  const oauth2Relay = Config.oauth2Relay;

  try {
    await oauth2Relay.revokeToken(token);
    return createHttpResponse(200, { message: 'Token revoked successfully' }, req);
  } catch (error) {
    context.error(`Token revocation failed: ${error}`);
    return createHttpResponse(500, { error: 'Failed to revoke token' }, req);
  }
}

app.http("initiateOAuth", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: initiateOAuth,
});

app.http("oauthCallback", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: oauthCallbackHandler,
});

app.http("wellKnownConfig", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: wellKnownConfig,
});

app.http("revokeToken", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: revokeToken,
});
