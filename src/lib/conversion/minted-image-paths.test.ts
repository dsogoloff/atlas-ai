import { describe, it, expect } from "vitest";

import {
  extractMintedPaths,
  mintedImagePaths,
  type ActiveItem,
} from "../../../scripts/conversion/minted-image-paths";

// Guards the RUNTIME-TRUTH image-path extraction that the uploader's required set and the
// content-completeness verifier both derive from. Must stay in lock-step with what
// src/lib/questionPicker/mintImage.ts mints: top-level content.image_path + per-tile
// image_path on left/right (VISUAL_MATCHING) and tiles[] (CLICK_IMAGE_* / IMAGE_ORDERING).

describe("extractMintedPaths", () => {
  it("extracts the top-level content.image_path for any format", () => {
    expect(extractMintedPaths("NUMERIC_ENTRY", { stem: "x", image_path: "l1/sam-l1-q05.png" })).toEqual([
      "l1/sam-l1-q05.png",
    ]);
  });

  it("returns [] when there is no image_path (text-only item)", () => {
    expect(extractMintedPaths("NUMERIC_ENTRY", { stem: "x", correct_answer: "10" })).toEqual([]);
  });

  it("ignores a non-string / empty image_path", () => {
    expect(extractMintedPaths("MULTIPLE_CHOICE", { stem: "x", image_path: "" })).toEqual([]);
    expect(extractMintedPaths("MULTIPLE_CHOICE", { stem: "x", image_path: 7 })).toEqual([]);
  });

  it("extracts per-tile image_path on VISUAL_MATCHING left + right", () => {
    const content = {
      stem: "match",
      image_path: "l1/scene.png",
      left: [{ id: "a", label: "A", image_path: "l1/a.png" }, { id: "b", label: "B" }],
      right: [{ id: "c", label: "C", image_path: "l1/c.png" }],
    };
    expect(extractMintedPaths("VISUAL_MATCHING", content).sort()).toEqual([
      "l1/a.png",
      "l1/c.png",
      "l1/scene.png",
    ]);
  });

  it("extracts per-tile image_path on tiles[] for the click-image formats", () => {
    const content = { stem: "pick", tiles: [{ id: "t1", label: "1", image_path: "l2/t1.png" }, { id: "t2", label: "2", image_path: "l2/t2.png" }] };
    for (const fmt of ["CLICK_IMAGE_SINGLE", "CLICK_IMAGE_MULTI", "IMAGE_ORDERING"]) {
      expect(extractMintedPaths(fmt, content).sort()).toEqual(["l2/t1.png", "l2/t2.png"]);
    }
  });

  it("does NOT read tile fields for a non-tile-bearing format", () => {
    // A stray left/right/tiles array on a NUMERIC item is never minted by the runtime.
    const content = { stem: "x", left: [{ id: "a", label: "A", image_path: "l1/a.png" }] };
    expect(extractMintedPaths("NUMERIC_ENTRY", content)).toEqual([]);
  });

  it("tolerates malformed content (null / array / missing tile objects)", () => {
    expect(extractMintedPaths("NUMERIC_ENTRY", null)).toEqual([]);
    expect(extractMintedPaths("NUMERIC_ENTRY", ["x"])).toEqual([]);
    expect(extractMintedPaths("VISUAL_MATCHING", { stem: "x", left: ["nope", null, 3] })).toEqual([]);
  });
});

describe("mintedImagePaths", () => {
  it("dedupes and sorts the union across all active items", () => {
    const items: ActiveItem[] = [
      { external_id: "SAM-L1-Q05", format: "NUMERIC_ENTRY", content: { stem: "a", image_path: "l1/sam-l1-q05.png" } },
      { external_id: "SAM-L1-Q10", format: "NUMERIC_ENTRY", content: { stem: "b", image_path: "l1/sam-l1-q10.png" } },
      // duplicate path (different item) collapses to one entry
      { external_id: "SAM-L1-Q05b", format: "NUMERIC_ENTRY", content: { stem: "c", image_path: "l1/sam-l1-q05.png" } },
      { external_id: "SAM-L1-Q22", format: "NUMERIC_ENTRY", content: { stem: "text-only" } },
    ];
    expect(mintedImagePaths(items)).toEqual(["l1/sam-l1-q05.png", "l1/sam-l1-q10.png"]);
  });

  it("captures image_paths assigned by ANY form (the incident's 5 L1 UPDATE-VALUES paths)", () => {
    // These reach the DB content identically whether set via inline JSON or
    // `update … content || jsonb_build_object('image_path', …)`; extraction is form-agnostic.
    const items: ActiveItem[] = ["q04", "q05", "q10", "q12", "q19"].map((q) => ({
      external_id: `SAM-L1-${q.toUpperCase()}`,
      format: "NUMERIC_ENTRY",
      content: { stem: "x", image_path: `l1/sam-l1-${q}.png` },
    }));
    expect(mintedImagePaths(items)).toEqual([
      "l1/sam-l1-q04.png",
      "l1/sam-l1-q05.png",
      "l1/sam-l1-q10.png",
      "l1/sam-l1-q12.png",
      "l1/sam-l1-q19.png",
    ]);
  });
});
