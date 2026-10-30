import { describe, expect, it } from "vitest";
import { formatBytes, mediaPreviewUrl, mediaUrl } from "./media";

describe("mediaUrl", () => {
  it("keeps regular media requests separate from admin deleted-media previews", () => {
    const regular = new URL(mediaUrl("media-1"));
    const preview = new URL(mediaUrl("media-1", true));
    expect(regular.pathname).toBe("/api/library/gallery/media-1/file");
    expect(regular.searchParams.has("includeDeleted")).toBe(false);
    expect(regular.searchParams.has("preview")).toBe(false);
    expect(preview.pathname).toBe(regular.pathname);
    expect(preview.searchParams.get("includeDeleted")).toBe("true");
  });

  it("requests lower-resolution previews while preserving authentication and trash access", () => {
    for (const includeDeleted of [false, true]) {
      const original = new URL(mediaUrl("media-1", includeDeleted));
      const preview = new URL(mediaPreviewUrl("media-1", includeDeleted));
      expect(preview.pathname).toBe(original.pathname);
      expect(preview.searchParams.get("accessToken")).toBe(original.searchParams.get("accessToken"));
      expect(preview.searchParams.get("includeDeleted")).toBe(original.searchParams.get("includeDeleted"));
      expect(preview.searchParams.get("preview")).toBe("true");
    }
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
