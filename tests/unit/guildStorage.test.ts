import { describe, it, expect, beforeEach, vi } from "vitest";
import { RestError, TableClient } from "@azure/data-tables";
import { GuildStorage } from "../../src/util/guildStorage";

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

describe("GuildStorage", () => {
  let guildStorage: GuildStorage;
  let tableClientMock: any;

  beforeEach(() => {
    tableClientMock = {
      getEntity: vi.fn(),
      upsertEntity: vi.fn(),
    };

    guildStorage = new GuildStorage(undefined, tableClientMock);
  });

  describe("constructor", () => {
    it("should use the provided TableClient instance if provided", () => {
      const customTableClient = {
        getEntity: vi.fn(),
        upsertEntity: vi.fn(),
      };
      const storage = new GuildStorage(undefined, customTableClient as any);
      expect(storage["guildClient"]).toBe(customTableClient);
    });

    it("should create a TableClient instance using the connection string if no client is provided", () => {
      process.env.AZURE_STORAGE_CONNECTION_STRING =
        "DefaultEndpointsProtocol=https;AccountName=mockAccount;AccountKey=mockKey;";
      new GuildStorage();
      expect(TableClient.fromConnectionString).toHaveBeenCalledWith(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "GuildRegistrations",
      );
    });

    it("should throw an error if no connection string is provided", () => {
      delete process.env.AZURE_STORAGE_CONNECTION_STRING;
      expect(() => new GuildStorage()).toThrow("Invalid connection string");
    });
  });

  describe("isGuildRegistered", () => {
    it("should return true if the guild is registered", async () => {
      tableClientMock.getEntity.mockResolvedValue({
        partitionKey: "RegisteredGuilds",
        rowKey: "guild-id",
      });

      const result = await guildStorage.isGuildRegistered("guild-id");

      expect(result).toBe(true);
      expect(tableClientMock.getEntity).toHaveBeenCalledWith(
        "RegisteredGuilds",
        "guild-id",
      );
    });

    it("should return false if the guild is not registered", async () => {
      tableClientMock.getEntity.mockRejectedValue(
        new RestError("404", { statusCode: 404 }),
      );

      const result = await guildStorage.isGuildRegistered("guild-id");

      expect(result).toBe(false);
      expect(tableClientMock.getEntity).toHaveBeenCalledWith(
        "RegisteredGuilds",
        "guild-id",
      );
    });

    it("should throw an error if there is an error other than 404", async () => {
      tableClientMock.getEntity.mockRejectedValue(
        new RestError("Internal Server Error", { statusCode: 500 }),
      );

      await expect(guildStorage.isGuildRegistered("guild-id")).rejects.toThrow(
        "Internal Server Error",
      );
      expect(tableClientMock.getEntity).toHaveBeenCalledWith(
        "RegisteredGuilds",
        "guild-id",
      );
    });
  });

  describe("markGuildAsRegistered", () => {
    it("should mark the guild as registered", async () => {
      await guildStorage.markGuildAsRegistered("guild-id");

      expect(tableClientMock.upsertEntity).toHaveBeenCalledWith({
        partitionKey: "RegisteredGuilds",
        rowKey: "guild-id",
      });
    });
  });
});
