import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../../../../src/services/api";
import { uploadService } from "../../../../../../src/features/uploads/services/uploadService";

vi.mock("../../../../../../src/services/api", () => ({
  api: vi.fn(),
  uploadWithProgress: vi.fn(),
}));
vi.mock("../../../../../../src/features/uploads/services/uploadRuntime", () => ({ wakeUploadRuntime: vi.fn() }));
vi.mock("../../../../../../src/features/uploads/services/uploadFileStore", () => ({
  getUploadFile: vi.fn(),
  removeUploadFile: vi.fn(),
  saveUploadFile: vi.fn(),
}));

describe("uploadService date filtering", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["list", "/api/sync/upload/batch"],
    ["listAll", "/api/sync/upload/admin/batch"],
  ] as const)("preserves unfiltered %s requests", async (method, path) => {
    await uploadService[method](20, 10);
    expect(api).toHaveBeenCalledWith(`${path}?offset=20&limit=10`);
  });

  it.each([
    ["list", "/api/sync/upload/batch"],
    ["listAll", "/api/sync/upload/admin/batch"],
  ] as const)("filters %s by the full local calendar day", async (method, path) => {
    await uploadService[method](0, 10, "2026-10-30");
    const query = new URLSearchParams({
      offset: "0",
      limit: "10",
      createdFrom: new Date(2026, 9, 30).toISOString(),
      createdBefore: new Date(2026, 9, 31).toISOString(),
    });
    expect(api).toHaveBeenCalledWith(`${path}?${query}`);
  });

  it("uses the next calendar day across a month boundary", async () => {
    await uploadService.list(0, 10, "2026-10-31");
    const query = new URLSearchParams({
      offset: "0",
      limit: "10",
      createdFrom: new Date(2026, 9, 31).toISOString(),
      createdBefore: new Date(2026, 10, 1).toISOString(),
    });
    expect(api).toHaveBeenCalledWith(`/api/sync/upload/batch?${query}`);
  });
});
