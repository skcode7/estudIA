import { describe, expect, it } from "vitest";

import { normalizeBox, toExtractedImageRegions } from "./openrouter.mapper";
import { extractedRegionsSchema } from "./openrouter.schemas";

describe("openrouter.mapper", () => {
  describe("toExtractedImageRegions", () => {
    it("maps valid regions keeping normalized boxes", () => {
      const payload = extractedRegionsSchema.parse({
        regions: [
          {
            label: "bandera de Francia",
            box: { x: 0.1, y: 0.2, width: 0.3, height: 0.25 }
          }
        ]
      });

      const result = toExtractedImageRegions(payload, 5);

      expect(result).toEqual([
        {
          label: "bandera de Francia",
          box: { x: 0.1, y: 0.2, width: 0.3, height: 0.25 }
        }
      ]);
    });

    it("normalizes percentage-based boxes to 0-1", () => {
      const payload = extractedRegionsSchema.parse({
        regions: [
          {
            label: "mapa de España",
            box: { x: 10, y: 20, width: 30, height: 25 }
          }
        ]
      });

      const result = toExtractedImageRegions(payload, 5);

      expect(result[0]?.box).toEqual({ x: 0.1, y: 0.2, width: 0.3, height: 0.25 });
    });

    it("clamps boxes that exceed the image bounds", () => {
      const box = normalizeBox({ x: 0.75, y: 0.75, width: 0.5, height: 0.5 });

      expect(box).toEqual({ x: 0.75, y: 0.75, width: 0.25, height: 0.25 });
    });

    it("drops degenerate boxes", () => {
      expect(normalizeBox({ x: 0.5, y: 0.5, width: 0.001, height: 0.2 })).toBeNull();
    });

    it("limits the result to maxRegions", () => {
      const payload = extractedRegionsSchema.parse({
        regions: [
          { label: "a", box: { x: 0, y: 0, width: 0.2, height: 0.2 } },
          { label: "b", box: { x: 0.3, y: 0, width: 0.2, height: 0.2 } },
          { label: "c", box: { x: 0.6, y: 0, width: 0.2, height: 0.2 } }
        ]
      });

      const result = toExtractedImageRegions(payload, 2);

      expect(result).toHaveLength(2);
      expect(result.map((region) => region.label)).toEqual(["a", "b"]);
    });
  });
});
