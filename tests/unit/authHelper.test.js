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
var authHelper_js_1 = require("@src/util/authHelper.js");
vitest_1.vi.mock("@src/util/OAuth2.js");
vitest_1.vi.mock("@src/util/errorHelpers.js", function () { return ({
    throwError: vitest_1.vi.fn(function (msg) {
        throw new Error(msg);
    }),
}); });
var mockOAuth2 = {
    validateToken: vitest_1.vi.fn(),
    getUserGuilds: vitest_1.vi.fn(),
};
authHelper_js_1.oauth2.validateToken = mockOAuth2.validateToken;
authHelper_js_1.oauth2.getUserGuilds = mockOAuth2.getUserGuilds;
var setupMocks = function () {
    process.env.CLIENT_ID = "test-client-id";
    process.env.CLIENT_SECRET = "test-client-secret";
    process.env.REDIRECT_URI = "http://localhost/callback";
};
var createMockHttpRequest = function (headers, queryParams) {
    return ({
        headers: new Map(Object.entries(headers)),
        query: new Map(Object.entries(queryParams)),
    });
};
var createMockInvocationContext = function () {
    return ({
        log: vitest_1.vi.fn(),
        error: vitest_1.vi.fn(),
    });
};
(0, vitest_1.describe)("Auth Helper", function () {
    (0, vitest_1.beforeEach)(function () {
        vitest_1.vi.clearAllMocks();
        setupMocks();
    });
    (0, vitest_1.describe)("validateAuthAndGuildOwnership", function () {
        var mockHttpRequest;
        var mockInvocationContext;
        (0, vitest_1.beforeEach)(function () {
            mockInvocationContext = createMockInvocationContext();
        });
        (0, vitest_1.it)("should return 401 if Authorization header is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest = createMockHttpRequest({}, { guildId: "test-guild" });
                        return [4 /*yield*/, (0, authHelper_js_1.validateAuthAndGuildOwnership)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({
                            status: 401,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify("Authorization token is missing"),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 401 if token is invalid", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest = createMockHttpRequest({ Authorization: "Bearer " }, { guildId: "test-guild" });
                        return [4 /*yield*/, (0, authHelper_js_1.validateAuthAndGuildOwnership)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({
                            status: 401,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify("Invalid token"),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 400 if guildId is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest = createMockHttpRequest({ Authorization: "Bearer test-token" }, {});
                        mockOAuth2.validateToken.mockResolvedValue({ user: { id: "test-user" } });
                        mockOAuth2.getUserGuilds.mockResolvedValue([
                            { id: "test-guild", owner: true },
                        ]);
                        return [4 /*yield*/, (0, authHelper_js_1.validateAuthAndGuildOwnership)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({
                            status: 400,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify("Required field: guildId"),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 403 if user does not own the guild", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest = createMockHttpRequest({ Authorization: "Bearer test-token" }, { guildId: "test-guild" });
                        mockOAuth2.validateToken.mockResolvedValue({ user: { id: "test-user" } });
                        mockOAuth2.getUserGuilds.mockResolvedValue([
                            { id: "test-guild", owner: false },
                        ]);
                        return [4 /*yield*/, (0, authHelper_js_1.validateAuthAndGuildOwnership)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({
                            status: 403,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify("You do not own this guild"),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return userId and guildId if user owns the guild", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest = createMockHttpRequest({ Authorization: "Bearer test-token" }, { guildId: "test-guild" });
                        mockOAuth2.validateToken.mockResolvedValue({ user: { id: "test-user" } });
                        mockOAuth2.getUserGuilds.mockResolvedValue([
                            { id: "test-guild", owner: true },
                        ]);
                        return [4 /*yield*/, (0, authHelper_js_1.validateAuthAndGuildOwnership)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({ userId: "test-user", guildId: "test-guild" });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 401 if token validation fails", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest = createMockHttpRequest({ Authorization: "Bearer test-token" }, { guildId: "test-guild" });
                        mockOAuth2.validateToken.mockRejectedValue(new Error("Invalid token"));
                        return [4 /*yield*/, (0, authHelper_js_1.validateAuthAndGuildOwnership)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({
                            status: 401,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify("Invalid token"),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("validateAuth", function () {
        var mockHttpRequest;
        var mockInvocationContext;
        (0, vitest_1.beforeEach)(function () {
            mockInvocationContext = createMockInvocationContext();
        });
        (0, vitest_1.it)("should return 401 if Authorization header is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest = createMockHttpRequest({}, {});
                        return [4 /*yield*/, (0, authHelper_js_1.validateAuth)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({
                            status: 401,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify("Authorization token is missing"),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 401 if token is invalid", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest = createMockHttpRequest({ Authorization: "Bearer " }, {});
                        return [4 /*yield*/, (0, authHelper_js_1.validateAuth)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({
                            status: 401,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify("No auth token"),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 401 if token validation fails", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest = createMockHttpRequest({ Authorization: "Bearer test-token" }, {});
                        mockOAuth2.validateToken.mockRejectedValue(new Error("Invalid token"));
                        return [4 /*yield*/, (0, authHelper_js_1.validateAuth)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({
                            status: 401,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify("Invalid token"),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return undefined if token is valid", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest = createMockHttpRequest({ Authorization: "Bearer test-token" }, {});
                        mockOAuth2.validateToken.mockResolvedValue({ user: { id: "test-user" } });
                        return [4 /*yield*/, (0, authHelper_js_1.validateAuth)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBeUndefined();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("isErrorResponse", function () {
        (0, vitest_1.it)("should return true for an error response", function () {
            var response = {
                status: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify("Error"),
            };
            (0, vitest_1.expect)((0, authHelper_js_1.isErrorResponse)(response)).toBe(true);
        });
        (0, vitest_1.it)("should return false for a valid response", function () {
            var response = {
                userId: "test-user",
                guildId: "test-guild",
            };
            (0, vitest_1.expect)((0, authHelper_js_1.isErrorResponse)(response)).toBe(false);
        });
    });
});
