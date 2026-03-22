import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RestError, TableClient } from "@azure/data-tables";
import { GuildQuizConfigStorage } from "../../src/util/guildQuizConfigStorage.js";
import { defaultQuizConfig } from "../../src/quizConfig.interfaces.js";
import type { GuildQuizConfig } from "../../src/quizConfig.interfaces.js";

vi.mock("@azure/data-tables", async () => {
  const actual =
    await vi.importActual<typeof import("@azure/data-tables")>(
      "@azure/data-tables",
    );
  return {
    ...actual,
    TableClient: {
      fromConnectionString: vi.fn(),
    },
  };
});

describe("GuildQuizConfigStorage", () => {
  let storage: GuildQuizConfigStorage;
  let tableClientMock: any;
  let previousConnectionString: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    previousConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

    tableClientMock = {
      createTable: vi.fn().mockResolvedValue(undefined),
      getEntity: vi.fn(),
      upsertEntity: vi.fn().mockResolvedValue(undefined),
      deleteEntity: vi.fn().mockResolvedValue(undefined),
    };

    storage = new GuildQuizConfigStorage(undefined, tableClientMock);
  });

  afterEach(() => {
    if (previousConnectionString) {
      process.env.AZURE_STORAGE_CONNECTION_STRING = previousConnectionString;
    } else {
      delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    }
  });

  describe("constructor", () => {
    it("should use the provided TableClient instance", () => {
      const customClient = {
        createTable: vi.fn(),
        getEntity: vi.fn(),
        upsertEntity: vi.fn(),
        deleteEntity: vi.fn(),
      };
      const s = new GuildQuizConfigStorage(undefined, customClient as any);
      expect(s["configClient"]).toBe(customClient);
    });

    it("should create a TableClient from explicit connection string", () => {
      const connStr =
        "DefaultEndpointsProtocol=https;AccountName=mock;AccountKey=mockKey;";
      new GuildQuizConfigStorage(connStr);
      expect(TableClient.fromConnectionString).toHaveBeenCalledWith(
        connStr,
        "GuildQuizConfig",
      );
    });

    it("should fall back to env var when no connection string or client provided", () => {
      process.env.AZURE_STORAGE_CONNECTION_STRING =
        "DefaultEndpointsProtocol=https;AccountName=env;AccountKey=envKey;";
      new GuildQuizConfigStorage();
      expect(TableClient.fromConnectionString).toHaveBeenCalledWith(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "GuildQuizConfig",
      );
    });

    it("should throw when no connection string and no env var", () => {
      delete process.env.AZURE_STORAGE_CONNECTION_STRING;
      expect(() => new GuildQuizConfigStorage()).toThrow(
        "Invalid connection string",
      );
    });
  });

  describe("initialize", () => {
    it("should call createTable on the client", async () => {
      await storage.initialize();
      expect(tableClientMock.createTable).toHaveBeenCalledOnce();
    });
  });

  describe("getConfig", () => {
    it("should return config when entity is found", async () => {
      tableClientMock.getEntity.mockResolvedValue({
        partitionKey: "guild-1",
        rowKey: "default",
        defaultQuestionShowTimeMs: 15000,
        advanceMode: "manual",
        interQuestionMessages: undefined,
        summaryDurationMs: 3000,
        soundboardEnabled: true,
        soundboardSoundIds: ["s1"],
        soundboardVoiceChannelId: "vc1",
      });

      const result = await storage.getConfig("guild-1", "default");

      expect(result).toEqual({
        guildId: "guild-1",
        scope: "default",
        defaultQuestionShowTimeMs: 15000,
        advanceMode: "manual",
        interQuestionMessages: undefined,
        summaryDurationMs: 3000,
        soundboardEnabled: true,
        soundboardSoundIds: ["s1"],
        soundboardVoiceChannelId: "vc1",
      });
      expect(tableClientMock.getEntity).toHaveBeenCalledWith(
        "guild-1",
        "default",
      );
    });

    it("should return undefined on 404 RestError", async () => {
      tableClientMock.getEntity.mockRejectedValue(
        new RestError("Not Found", { statusCode: 404 }),
      );

      const result = await storage.getConfig("guild-1", "default");
      expect(result).toBeUndefined();
    });

    it("should rethrow non-404 RestError", async () => {
      tableClientMock.getEntity.mockRejectedValue(
        new RestError("Internal Server Error", { statusCode: 500 }),
      );

      await expect(storage.getConfig("guild-1", "default")).rejects.toThrow(
        "Internal Server Error",
      );
    });

    it("should rethrow non-RestError errors", async () => {
      tableClientMock.getEntity.mockRejectedValue(
        new Error("Something unexpected"),
      );

      await expect(storage.getConfig("guild-1", "default")).rejects.toThrow(
        "Something unexpected",
      );
    });
  });

  describe("upsertConfig", () => {
    it("should upsert with correct table entity shape", async () => {
      const config: GuildQuizConfig = {
        guildId: "guild-1",
        scope: "default",
        defaultQuestionShowTimeMs: 10000,
        advanceMode: "auto",
        interQuestionMessages: [
          { messageId: "m1", content: "Hello" },
        ],
        summaryDurationMs: 5000,
        soundboardEnabled: false,
        soundboardSoundIds: [],
        soundboardVoiceChannelId: "",
      };

      await storage.upsertConfig(config);

      expect(tableClientMock.upsertEntity).toHaveBeenCalledWith({
        partitionKey: "guild-1",
        rowKey: "default",
        guildId: "guild-1",
        scope: "default",
        defaultQuestionShowTimeMs: 10000,
        advanceMode: "auto",
        interQuestionMessages: [
          { messageId: "m1", content: "Hello" },
        ],
        summaryDurationMs: 5000,
        soundboardEnabled: false,
        soundboardSoundIds: [],
        soundboardVoiceChannelId: "",
      });
    });
  });

  describe("deleteConfig", () => {
    it("should delegate to deleteEntity with correct args", async () => {
      await storage.deleteConfig("guild-1", "bank-a");
      expect(tableClientMock.deleteEntity).toHaveBeenCalledWith(
        "guild-1",
        "bank-a",
      );
    });
  });

  describe("getEffectiveConfig", () => {
    it("should return system defaults when no guild or bank config exists", async () => {
      tableClientMock.getEntity.mockRejectedValue(
        new RestError("Not Found", { statusCode: 404 }),
      );

      const result = await storage.getEffectiveConfig("guild-1");

      expect(result).toEqual(defaultQuizConfig);
    });

    it("should merge guild config over system defaults", async () => {
      tableClientMock.getEntity.mockImplementation(
        (partitionKey: string, rowKey: string) => {
          if (rowKey === "default") {
            return Promise.resolve({
              partitionKey,
              rowKey,
              defaultQuestionShowTimeMs: 30000,
              advanceMode: "manual",
              interQuestionMessages: undefined,
              summaryDurationMs: undefined,
              soundboardEnabled: undefined,
              soundboardSoundIds: undefined,
              soundboardVoiceChannelId: undefined,
            });
          }
          return Promise.reject(
            new RestError("Not Found", { statusCode: 404 }),
          );
        },
      );

      const result = await storage.getEffectiveConfig("guild-1");

      expect(result.defaultQuestionShowTimeMs).toBe(30000);
      expect(result.advanceMode).toBe("manual");
      // Remaining fields fall back to defaults
      expect(result.interQuestionMessages).toEqual(
        defaultQuizConfig.interQuestionMessages,
      );
      expect(result.summaryDurationMs).toBe(
        defaultQuizConfig.summaryDurationMs,
      );
      expect(result.soundboardEnabled).toBe(
        defaultQuizConfig.soundboardEnabled,
      );
      expect(result.soundboardSoundIds).toEqual(
        defaultQuizConfig.soundboardSoundIds,
      );
      expect(result.soundboardVoiceChannelId).toBe(
        defaultQuizConfig.soundboardVoiceChannelId,
      );
    });

    it("should merge bank config over guild config over system defaults", async () => {
      tableClientMock.getEntity.mockImplementation(
        (partitionKey: string, rowKey: string) => {
          if (rowKey === "default") {
            return Promise.resolve({
              partitionKey,
              rowKey,
              defaultQuestionShowTimeMs: 30000,
              advanceMode: "manual",
              interQuestionMessages: undefined,
              summaryDurationMs: 8000,
              soundboardEnabled: true,
              soundboardSoundIds: ["guild-sound"],
              soundboardVoiceChannelId: "vc-guild",
            });
          }
          if (rowKey === "my-bank") {
            return Promise.resolve({
              partitionKey,
              rowKey,
              defaultQuestionShowTimeMs: 5000,
              advanceMode: undefined,
              interQuestionMessages: [{ messageId: "m1", content: "Hi" }],
              summaryDurationMs: undefined,
              soundboardEnabled: undefined,
              soundboardSoundIds: undefined,
              soundboardVoiceChannelId: undefined,
            });
          }
          return Promise.reject(
            new RestError("Not Found", { statusCode: 404 }),
          );
        },
      );

      const result = await storage.getEffectiveConfig("guild-1", "my-bank");

      // Bank overrides
      expect(result.defaultQuestionShowTimeMs).toBe(5000);
      expect(result.interQuestionMessages).toEqual([
        { messageId: "m1", content: "Hi" },
      ]);
      // Falls through to guild config
      expect(result.advanceMode).toBe("manual");
      expect(result.summaryDurationMs).toBe(8000);
      expect(result.soundboardEnabled).toBe(true);
      expect(result.soundboardSoundIds).toEqual(["guild-sound"]);
      expect(result.soundboardVoiceChannelId).toBe("vc-guild");
    });

    it("should not fetch bank config when bankName is not provided", async () => {
      tableClientMock.getEntity.mockRejectedValue(
        new RestError("Not Found", { statusCode: 404 }),
      );

      await storage.getEffectiveConfig("guild-1");

      // Only called once for the "default" scope
      expect(tableClientMock.getEntity).toHaveBeenCalledTimes(1);
      expect(tableClientMock.getEntity).toHaveBeenCalledWith(
        "guild-1",
        "default",
      );
    });

    it("should fetch bank config when bankName is provided", async () => {
      tableClientMock.getEntity.mockRejectedValue(
        new RestError("Not Found", { statusCode: 404 }),
      );

      await storage.getEffectiveConfig("guild-1", "some-bank");

      expect(tableClientMock.getEntity).toHaveBeenCalledTimes(2);
      expect(tableClientMock.getEntity).toHaveBeenCalledWith(
        "guild-1",
        "default",
      );
      expect(tableClientMock.getEntity).toHaveBeenCalledWith(
        "guild-1",
        "some-bank",
      );
    });
  });
});
