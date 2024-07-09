"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var data_tables_1 = require("@azure/data-tables");
var guildStorage_js_1 = require("../../src/util/guildStorage.js");
vitest_1.vi.mock("@azure/data-tables", function () { return __awaiter(void 0, void 0, void 0, function () {
    var actual;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, vitest_1.vi.importActual("@azure/data-tables")];
            case 1:
                actual = _a.sent();
                return [2 /*return*/, __assign(__assign({}, actual), { TableClient: {
                            fromConnectionString: vitest_1.vi.fn(),
                        } })];
        }
    });
}); });
(0, vitest_1.describe)("GuildStorage", function () {
    var guildStorage;
    var tableClientMock;
    (0, vitest_1.beforeEach)(function () {
        tableClientMock = {
            getEntity: vitest_1.vi.fn(),
            upsertEntity: vitest_1.vi.fn(),
        };
        guildStorage = new guildStorage_js_1.GuildStorage(undefined, tableClientMock);
    });
    (0, vitest_1.describe)("constructor", function () {
        (0, vitest_1.it)("should use the provided TableClient instance if provided", function () {
            var customTableClient = {
                getEntity: vitest_1.vi.fn(),
                upsertEntity: vitest_1.vi.fn(),
            };
            var storage = new guildStorage_js_1.GuildStorage(undefined, customTableClient);
            (0, vitest_1.expect)(storage["guildClient"]).toBe(customTableClient);
        });
        (0, vitest_1.it)("should create a TableClient instance using the connection string if no client is provided", function () {
            process.env.AZURE_STORAGE_CONNECTION_STRING =
                "DefaultEndpointsProtocol=https;AccountName=mockAccount;AccountKey=mockKey;";
            new guildStorage_js_1.GuildStorage();
            (0, vitest_1.expect)(data_tables_1.TableClient.fromConnectionString).toHaveBeenCalledWith(process.env.AZURE_STORAGE_CONNECTION_STRING, "GuildRegistrations");
        });
        (0, vitest_1.it)("should throw an error if no connection string is provided", function () {
            delete process.env.AZURE_STORAGE_CONNECTION_STRING;
            (0, vitest_1.expect)(function () { return new guildStorage_js_1.GuildStorage(); }).toThrow("Invalid connection string");
        });
    });
    (0, vitest_1.describe)("isGuildRegistered", function () {
        (0, vitest_1.it)("should return true if the guild is registered", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tableClientMock.getEntity.mockResolvedValue({
                            partitionKey: "RegisteredGuilds",
                            rowKey: "guild-id",
                        });
                        return [4 /*yield*/, guildStorage.isGuildRegistered("guild-id")];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(true);
                        (0, vitest_1.expect)(tableClientMock.getEntity).toHaveBeenCalledWith("RegisteredGuilds", "guild-id");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return false if the guild is not registered", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tableClientMock.getEntity.mockRejectedValue(new data_tables_1.RestError("404", { statusCode: 404 }));
                        return [4 /*yield*/, guildStorage.isGuildRegistered("guild-id")];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(false);
                        (0, vitest_1.expect)(tableClientMock.getEntity).toHaveBeenCalledWith("RegisteredGuilds", "guild-id");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should throw an error if there is an error other than 404", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tableClientMock.getEntity.mockRejectedValue(new data_tables_1.RestError("Internal Server Error", { statusCode: 500 }));
                        return [4 /*yield*/, (0, vitest_1.expect)(guildStorage.isGuildRegistered("guild-id")).rejects.toThrow("Internal Server Error")];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(tableClientMock.getEntity).toHaveBeenCalledWith("RegisteredGuilds", "guild-id");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("markGuildAsRegistered", function () {
        (0, vitest_1.it)("should mark the guild as registered", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, guildStorage.markGuildAsRegistered("guild-id")];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(tableClientMock.upsertEntity).toHaveBeenCalledWith({
                            partitionKey: "RegisteredGuilds",
                            rowKey: "guild-id",
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
