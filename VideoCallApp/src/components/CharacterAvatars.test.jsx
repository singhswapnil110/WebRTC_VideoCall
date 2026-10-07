import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { NiceAvatar } from "./CharacterAvatars";
import { renderAvatarSvgDataUri } from "./avatarSvg";

const SVG_DATA_URI = /^data:image\/svg\+xml[;,]/;
const payloadOf = (uri) => uri.slice(uri.indexOf(",") + 1);

describe("renderAvatarSvgDataUri", () => {
  it("returns a percent-encoded svg data uri, even for a hostile seed", () => {
    const uri = renderAvatarSvgDataUri('"><script>alert(1)</script>', 18);

    expect(uri).toMatch(SVG_DATA_URI);
    expect(payloadOf(uri)).not.toMatch(/[<>"']/);
    expect(decodeURIComponent(payloadOf(uri))).toMatch(/^<svg[\s>]/);
  });

  it("returns the same data uri for the same id", () => {
    expect(renderAvatarSvgDataUri("alice", 64)).toBe(renderAvatarSvgDataUri("alice", 64));
  });

  it("returns a different data uri for a different id", () => {
    expect(renderAvatarSvgDataUri("alice", 64)).not.toBe(renderAvatarSvgDataUri("bob", 64));
  });
});

describe("NiceAvatar", () => {
  it("renders the avatar as an image rather than inline markup", () => {
    const { container } = render(<NiceAvatar id="alice" />);

    expect(container.querySelector("img").getAttribute("src")).toMatch(SVG_DATA_URI);
    expect(container.querySelector("svg")).toBeNull();
  });
});
