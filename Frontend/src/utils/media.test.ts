import { describe, expect, it } from "vitest";
import { formatBytes, mediaUrl } from "./media";

describe("mediaUrl", () => {
  it("keeps regular media requests separate from admin deleted-media previews", () => {
    const regular = new URL(mediaUrl("media-1"));
    const preview = new URL(mediaUrl("media-1", true));
    expect(regular.pathname).toBe("/api/media/media-1/file");
    expect(regular.searchParams.has("includeDeleted")).toBe(false);
    expect(preview.pathname).toBe(regular.pathname);
    expect(preview.searchParams.get("includeDeleted")).toBe("true");
  });
});

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
