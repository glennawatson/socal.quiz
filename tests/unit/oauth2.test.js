"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var OAuth2_js_1 = require("@src/util/OAuth2.js");
var mockFetch = vitest_1.vi.fn();
global.fetch = mockFetch;
(0, vitest_1.describe)("OAuth2", function () {
    var clientId = "test-client-id";
    var clientSecret = "test-client-secret";
    var redirectUri = "http://localhost/callback";
    var state = "test-state";
    var scopes = ["identify", "guilds"];
    var code = "test-code";
    var token = "test-token";
    var oauth2;
    (0, vitest_1.beforeEach)(function () {
        oauth2 = new OAuth2_js_1.OAuth2(clientId, clientSecret, redirectUri);
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)("getAuthorizeUrl", function () {
        (0, vitest_1.it)("should return the correct authorization URL", function () {
            var url = oauth2.getAuthorizeUrl(state, scopes);
            (0, vitest_1.expect)(url).toBe("https://discord.com/api/oauth2/authorize?response_type=code&client_id=".concat(clientId, "&scope=").concat(encodeURIComponent(scopes.join(" ")), "&state=").concat(state, "&redirect_uri=").concat(encodeURIComponent(redirectUri)));
        });
        (0, vitest_1.it)("should throw an error if redirectUri is not set", function () {
            var invalidOauth2 = new OAuth2_js_1.OAuth2(clientId, clientSecret, "");
            (0, vitest_1.expect)(function () { return invalidOauth2.getAuthorizeUrl(state, scopes); }).toThrow("Must have a valid redirect uri");
        });
    });
    (0, vitest_1.describe)("exchangeCode", function () {
        (0, vitest_1.it)("should exchange code for tokens successfully", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockResponse, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockResponse = {
                            ok: true,
                            json: vitest_1.vi.fn().mockResolvedValue({ access_token: token }),
                        };
                        mockFetch.mockResolvedValueOnce(mockResponse);
                        return [4 /*yield*/, oauth2.exchangeCode(code)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({ access_token: token });
                        (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith("https://discord.com/api/oauth2/token", {
                            method: "POST",
                            body: new URLSearchParams({
                                client_id: clientId,
                                client_secret: clientSecret,
                                grant_type: "authorization_code",
                                code: code,
                                redirect_uri: redirectUri,
                            }),
                            headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should throw an error if the response is not ok", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockFetch.mockResolvedValueOnce({ ok: false });
                        return [4 /*yield*/, (0, vitest_1.expect)(oauth2.exchangeCode(code)).rejects.toThrow("Failed to exchange code for tokens")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should throw an error if redirectUri is not set", function () { return __awaiter(void 0, void 0, void 0, function () {
            var invalidOauth2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        invalidOauth2 = new OAuth2_js_1.OAuth2(clientId, clientSecret, "");
                        return [4 /*yield*/, (0, vitest_1.expect)(invalidOauth2.exchangeCode(code)).rejects.toThrow("Must have a valid redirect uri")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("validateToken", function () {
        (0, vitest_1.it)("should validate token successfully", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockResponse, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockResponse = {
                            ok: true,
                            json: vitest_1.vi.fn().mockResolvedValue({ user_id: "123" }),
                        };
                        mockFetch.mockResolvedValueOnce(mockResponse);
                        return [4 /*yield*/, oauth2.validateToken(token)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({ user_id: "123" });
                        (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith("https://discord.com/api/oauth2/@me", {
                            headers: { Authorization: "Bearer ".concat(token) },
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should throw an error if the response is not ok", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockFetch.mockResolvedValueOnce({ ok: false });
                        return [4 /*yield*/, (0, vitest_1.expect)(oauth2.validateToken(token)).rejects.toThrow("Invalid token")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("getUserGuilds", function () {
        (0, vitest_1.it)("should fetch user guilds successfully", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockResponse, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockResponse = {
                            ok: true,
                            json: vitest_1.vi.fn().mockResolvedValue([{ id: "guild1" }, { id: "guild2" }]),
                        };
                        mockFetch.mockResolvedValueOnce(mockResponse);
                        return [4 /*yield*/, oauth2.getUserGuilds(token)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual([{ id: "guild1" }, { id: "guild2" }]);
                        (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith("https://discord.com/api/users/@me/guilds", {
                            headers: { Authorization: "Bearer ".concat(token) },
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should throw an error if the response is not ok", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockFetch.mockResolvedValueOnce({ ok: false });
                        return [4 /*yield*/, (0, vitest_1.expect)(oauth2.getUserGuilds(token)).rejects.toThrow("Failed to fetch user guilds")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
