import { describe, expect, it } from "vitest";
import { renderAvatarSvgDataUri } from "./avatarSvg";

describe("renderAvatarSvgDataUri", () => {
  it("returns a safe svg data uri", () => {
    expect(renderAvatarSvgDataUri("alice", 18)).toContain(
      "data:image/svg+xml;charset=utf-8,"
    );
  });

  it("returns the same data uri for the same id", () => {
    expect(renderAvatarSvgDataUri("alice", 64)).toBe(renderAvatarSvgDataUri("alice", 64));
  });

  it("returns a different data uri for a different id", () => {
    expect(renderAvatarSvgDataUri("alice", 64)).not.toBe(renderAvatarSvgDataUri("bob", 64));
  });
});
