"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationService = exports.LogLevel = exports.ManagedLogger = exports.AuthenticationResultStatus = exports.AccessTokenResultStatus = void 0;
const oidc_client_1 = require("oidc-client");
function isApiAuthorizationSettings(settings) {
    return settings.hasOwnProperty('configurationEndpoint');
}
var AccessTokenResultStatus;
(function (AccessTokenResultStatus) {
    AccessTokenResultStatus["Success"] = "Success";
    AccessTokenResultStatus["RequiresRedirect"] = "RequiresRedirect";
})(AccessTokenResultStatus || (exports.AccessTokenResultStatus = AccessTokenResultStatus = {}));
var AuthenticationResultStatus;
(function (AuthenticationResultStatus) {
    AuthenticationResultStatus["Redirect"] = "Redirect";
    AuthenticationResultStatus["Success"] = "Success";
    AuthenticationResultStatus["Failure"] = "Failure";
    AuthenticationResultStatus["OperationCompleted"] = "OperationCompleted";
})(AuthenticationResultStatus || (exports.AuthenticationResultStatus = AuthenticationResultStatus = {}));
;
;
class ManagedLogger {
    constructor(options) {
        this.debug = options.debugEnabled;
        this.trace = options.traceEnabled;
    }
    log(level, message) {
        if ((level == LogLevel.Trace && this.trace) ||
            (level == LogLevel.Debug && this.debug)) {
            const levelString = level == LogLevel.Trace ? 'trce' : 'dbug';
            console.debug(
            // Logs in the following format to keep consistency with the way ASP.NET Core logs to the console while avoiding the
            // additional overhead of passing the logger as a JSObjectReference
            // dbug: Microsoft.AspNetCore.Components.WebAssembly.Authentication.RemoteAuthenticationService[0]
            //       <<message>>         
            // trce: Microsoft.AspNetCore.Components.WebAssembly.Authentication.RemoteAuthenticationService[0]
            //       <<message>>
            `${levelString}: Microsoft.AspNetCore.Components.WebAssembly.Authentication.RemoteAuthenticationService[0]
      ${message}`);
        }
    }
}
exports.ManagedLogger = ManagedLogger;
// These are the values for the .NET logger LogLevel. 
// We only use debug and trace
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Trace"] = 0] = "Trace";
    LogLevel[LogLevel["Debug"] = 1] = "Debug";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class OidcAuthorizeService {
    constructor(userManager, logger) {
        this._userManager = userManager;
        this._logger = logger;
    }
    async trySilentSignIn() {
        if (!this._intialSilentSignIn) {
            this._intialSilentSignIn = (async () => {
                try {
                    this.debug('Beginning initial silent sign in.');
                    await this._userManager.signinSilent();
                    this.debug('Initial silent sign in succeeded.');
                }
                catch (e) {
                    if (e instanceof Error) {
                        this.debug(`Initial silent sign in failed '${e.message}'`);
                    }
                    // It is ok to swallow the exception here.
                    // The user might not be logged in and in that case it
                    // is expected for signinSilent to fail and throw
                }
            })();
        }
        return this._intialSilentSignIn;
    }
    async getUser() {
        if (window.parent === window && !window.opener && !window.frameElement && this._userManager.settings.redirect_uri &&
            !location.href.startsWith(this._userManager.settings.redirect_uri)) {
            // If we are not inside a hidden iframe, try authenticating silently.
            await this.trySilentSignIn();
        }
        const user = await this._userManager.getUser();
        return user && user.profile;
    }
    async getAccessToken(request) {
        this.trace('getAccessToken', request);
        const user = await this._userManager.getUser();
        if (hasValidAccessToken(user) && hasAllScopes(request, user.scopes)) {
            this.debug(`Valid access token present expiring at '${getExpiration(user.expires_in).toISOString()}'`);
            return {
                status: AccessTokenResultStatus.Success,
                token: {
                    grantedScopes: user.scopes,
                    expires: getExpiration(user.expires_in),
                    value: user.access_token
                }
            };
        }
        else {
            try {
                const parameters = request && request.scopes ?
                    { scope: request.scopes.join(' ') } : undefined;
                this.debug(`Provisioning a token silently for scopes '${parameters === null || parameters === void 0 ? void 0 : parameters.scope}'`);
                this.trace('userManager.signinSilent', parameters);
                const newUser = await this._userManager.signinSilent(parameters);
                this.debug(`Provisioned an access token expiring at '${getExpiration(newUser.expires_in).toISOString()}'`);
                const result = {
                    status: AccessTokenResultStatus.Success,
                    token: {
                        grantedScopes: newUser.scopes,
                        expires: getExpiration(newUser.expires_in),
                        value: newUser.access_token
                    }
                };
                this.trace('getAccessToken-result', result);
                return result;
            }
            catch (e) {
                if (e instanceof Error) {
                    this.debug(`Failed to provision a token silently '${e.message}'`);
                }
                return {
                    status: AccessTokenResultStatus.RequiresRedirect
                };
            }
        }
        function hasValidAccessToken(user) {
            return !!(user && user.access_token && !user.expired && user.scopes);
        }
        function getExpiration(expiresIn) {
            const now = new Date();
            now.setTime(now.getTime() + expiresIn * 1000);
            return now;
        }
        function hasAllScopes(request, currentScopes) {
            const set = new Set(currentScopes);
            if (request && request.scopes) {
                for (const current of request.scopes) {
                    if (!set.has(current)) {
                        return false;
                    }
                }
            }
            return true;
        }
    }
    async signIn(context) {
        this.trace('signIn', context);
        if (!context.interactiveRequest) {
            try {
                this.debug('Silent sign in starting');
                await this._userManager.clearStaleState();
                await this._userManager.signinSilent(this.createArguments(undefined, context.interactiveRequest));
                this.debug('Silent sign in succeeded');
                return this.success(context.state);
            }
            catch (silentError) {
                if (silentError instanceof Error) {
                    this.debug(`Silent sign in failed, redirecting to the identity provider '${silentError.message}'.`);
                }
                return await this.signInInteractive(context);
            }
        }
        else {
            this.debug('Interactive sign in starting.');
            return this.signInInteractive(context);
        }
    }
    async signInInteractive(context) {
        this.trace('signInInteractive', context);
        try {
            await this._userManager.clearStaleState();
            await this._userManager.signinRedirect(this.createArguments(context.state, context.interactiveRequest));
            this.debug('Redirect sign in succeeded');
            return this.redirect();
        }
        catch (redirectError) {
            const message = this.getExceptionMessage(redirectError);
            this.debug(`Redirect sign in failed '${message}'.`);
            return this.error(message);
        }
    }
    async completeSignIn(url) {
        this.trace('completeSignIn', url);
        const requiresLogin = await this.loginRequired(url);
        const stateExists = await this.stateExists(url);
        try {
            const user = await this._userManager.signinCallback(url);
            if (window.self !== window.top) {
                return this.operationCompleted();
            }
            else {
                this.trace('completeSignIn-result', user);
                return this.success(user && user.state);
            }
        }
        catch (error) {
            if (requiresLogin || window.self !== window.top || !stateExists) {
                return this.operationCompleted();
            }
            return this.error('There was an error signing in.' + error);
        }
    }
    async signOut(context) {
        this.trace('signOut', context);
        try {
            if (!(await this._userManager.metadataService.getEndSessionEndpoint())) {
                await this._userManager.removeUser();
                return this.success(context.state);
            }
            await this._userManager.signoutRedirect(this.createArguments(context.state, context.interactiveRequest));
            return this.redirect();
        }
        catch (redirectSignOutError) {
            const message = this.getExceptionMessage(redirectSignOutError);
            this.debug(`Sign out error '${message}'.`);
            return this.error(message);
        }
    }
    async completeSignOut(url) {
        this.trace('completeSignOut', url);
        try {
            if (await this.stateExists(url)) {
                const response = await this._userManager.signoutCallback(url);
                return this.success(response && response.state);
            }
            else {
                return this.operationCompleted();
            }
        }
        catch (error) {
            const message = this.getExceptionMessage(error);
            this.debug(`Complete sign out error '${message}'`);
            return this.error(message);
        }
    }
    getExceptionMessage(error) {
        if (isOidcError(error)) {
            return error.error_description;
        }
        else if (isRegularError(error)) {
            return error.message;
        }
        else {
            return error.toString();
        }
        function isOidcError(error) {
            return error && error.error_description;
        }
        function isRegularError(error) {
            return error && error.message;
        }
    }
    async stateExists(url) {
        const stateParam = new URLSearchParams(new URL(url).search).get('state');
        if (stateParam && this._userManager.settings.stateStore) {
            return await this._userManager.settings.stateStore.get(stateParam);
        }
        else {
            return undefined;
        }
    }
    async loginRequired(url) {
        const errorParameter = new URLSearchParams(new URL(url).search).get('error');
        if (errorParameter && this._userManager.settings.stateStore) {
            const error = await this._userManager.settings.stateStore.get(errorParameter);
            return error === 'login_required';
        }
        else {
            return false;
        }
    }
    createArguments(state, interactiveRequest) {
        return {
            useReplaceToNavigate: true,
            data: state,
            scope: (interactiveRequest === null || interactiveRequest === void 0 ? void 0 : interactiveRequest.scopes) ? interactiveRequest.scopes.join(' ') : undefined,
            ...interactiveRequest === null || interactiveRequest === void 0 ? void 0 : interactiveRequest.additionalRequestParameters
        };
    }
    error(message) {
        return { status: AuthenticationResultStatus.Failure, errorMessage: message };
    }
    success(state) {
        return { status: AuthenticationResultStatus.Success, state };
    }
    redirect() {
        return { status: AuthenticationResultStatus.Redirect };
    }
    operationCompleted() {
        return { status: AuthenticationResultStatus.OperationCompleted };
    }
    debug(message) {
        var _a;
        (_a = this._logger) === null || _a === void 0 ? void 0 : _a.log(LogLevel.Debug, message);
    }
    trace(message, data) {
        var _a;
        (_a = this._logger) === null || _a === void 0 ? void 0 : _a.log(LogLevel.Trace, `${message}: ${JSON.stringify(data)}`);
    }
}
class AuthenticationService {
    static init(settings, logger) {
        // Multiple initializations can start concurrently and we want to avoid that.
        // In order to do so, we create an initialization promise and the first call to init
        // tries to initialize the app and sets up a promise other calls can await on.
        if (!AuthenticationService._initialized) {
            AuthenticationService._initialized = AuthenticationService.initializeCore(settings, new ManagedLogger(logger));
        }
        return AuthenticationService._initialized;
    }
    static handleCallback() {
        return AuthenticationService.initializeCore();
    }
    static async initializeCore(settings, logger) {
        const finalSettings = settings || AuthenticationService.resolveCachedSettings();
        const cachedLoggerOptions = AuthenticationService.resolveCachedLoggerOptions();
        const finalLogger = logger || (cachedLoggerOptions && new ManagedLogger(cachedLoggerOptions));
        if (!settings && finalSettings && !logger && finalLogger) {
            const userManager = AuthenticationService.createUserManagerCore(finalSettings);
            if (window.parent !== window && !window.opener && (window.frameElement && userManager.settings.redirect_uri &&
                location.href.startsWith(userManager.settings.redirect_uri))) {
                // If we are inside a hidden iframe, try completing the sign in early.
                // This prevents loading the blazor app inside a hidden iframe, which speeds up the authentication operations
                // and avoids wasting resources (CPU and memory from bootstrapping the Blazor app)
                AuthenticationService.instance = new OidcAuthorizeService(userManager, finalLogger);
                // This makes sure that if the blazor app has time to load inside the hidden iframe,
                // it is not able to perform another auth operation until this operation has completed.
                AuthenticationService._initialized = (async () => {
                    await AuthenticationService.instance.completeSignIn(location.href);
                    return;
                })();
            }
        }
        else if (settings && logger) {
            const userManager = await AuthenticationService.createUserManager(settings);
            AuthenticationService.instance = new OidcAuthorizeService(userManager, logger);
            window.sessionStorage.setItem(`${AuthenticationService._infrastructureKey}.CachedJSLoggingOptions`, JSON.stringify({ debugEnabled: logger.debug, traceEnabled: logger.trace }));
        }
        else {
            // HandleCallback gets called unconditionally, so we do nothing for normal paths.
            // Cached settings are only used on handling the redirect_uri path and if the settings are not there
            // the app will fallback to the default logic for handling the redirect.
        }
    }
    static resolveCachedSettings() {
        const cachedSettings = window.sessionStorage.getItem(`${AuthenticationService._infrastructureKey}.CachedAuthSettings`);
        return cachedSettings ? JSON.parse(cachedSettings) : undefined;
    }
    static resolveCachedLoggerOptions() {
        const cachedSettings = window.sessionStorage.getItem(`${AuthenticationService._infrastructureKey}.CachedJSLoggingOptions`);
        return cachedSettings ? JSON.parse(cachedSettings) : undefined;
    }
    static getUser() {
        return AuthenticationService.instance.getUser();
    }
    static getAccessToken(options) {
        return AuthenticationService.instance.getAccessToken(options);
    }
    static signIn(context) {
        return AuthenticationService.instance.signIn(context);
    }
    static async completeSignIn(url) {
        let operation = this._pendingOperations[url];
        if (!operation) {
            operation = AuthenticationService.instance.completeSignIn(url);
            await operation;
            delete this._pendingOperations[url];
        }
        return operation;
    }
    static signOut(context) {
        return AuthenticationService.instance.signOut(context);
    }
    static async completeSignOut(url) {
        let operation = this._pendingOperations[url];
        if (!operation) {
            operation = AuthenticationService.instance.completeSignOut(url);
            await operation;
            delete this._pendingOperations[url];
        }
        return operation;
    }
    static async createUserManager(settings) {
        let finalSettings;
        if (isApiAuthorizationSettings(settings)) {
            const response = await fetch(settings.configurationEndpoint);
            if (!response.ok) {
                throw new Error(`Could not load settings from '${settings.configurationEndpoint}'`);
            }
            const downloadedSettings = await response.json();
            finalSettings = downloadedSettings;
        }
        else {
            if (!settings.scope) {
                settings.scope = settings.defaultScopes.join(' ');
            }
            if (settings.response_type === null) {
                // If the response type is not set, it gets serialized as null. OIDC-client behaves differently than when the value is undefined, so we explicitly check for a null value and remove the property instead.
                delete settings.response_type;
            }
            finalSettings = settings;
        }
        window.sessionStorage.setItem(`${AuthenticationService._infrastructureKey}.CachedAuthSettings`, JSON.stringify(finalSettings));
        return AuthenticationService.createUserManagerCore(finalSettings);
    }
    static createUserManagerCore(finalSettings) {
        const userManager = new oidc_client_1.UserManager(finalSettings);
        userManager.events.addUserSignedOut(async () => {
            userManager.removeUser();
        });
        return userManager;
    }
}
exports.AuthenticationService = AuthenticationService;
AuthenticationService._infrastructureKey = 'Microsoft.AspNetCore.Components.WebAssembly.Authentication';
AuthenticationService._pendingOperations = {};
AuthenticationService.handleCallback();
window.AuthenticationService = AuthenticationService;
//# sourceMappingURL=AuthenticationService.js.map