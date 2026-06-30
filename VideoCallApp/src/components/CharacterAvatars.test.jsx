import { describe, expect, it } from "vitest";
import { renderAvatarSvg } from "./avatarSvg";

describe("renderAvatarSvg", () => {
  it("returns inline svg markup", () => {
    expect(renderAvatarSvg("alice", 18)).toContain("<svg");
    expect(renderAvatarSvg("alice", 18)).toContain('width="18"');
    expect(renderAvatarSvg("alice", 18)).toContain('height="18"');
  });

  it("returns the same svg for the same id", () => {
    expect(renderAvatarSvg("alice", 64)).toBe(renderAvatarSvg("alice", 64));
  });

  it("returns a different svg for a different id", () => {
    expect(renderAvatarSvg("alice", 64)).not.toBe(renderAvatarSvg("bob", 64));
  });
});
