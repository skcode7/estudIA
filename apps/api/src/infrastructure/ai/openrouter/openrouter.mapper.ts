import {
  ExtractedImageRegion,
  ImageRegionBox
} from "../../../modules/ai/application/ports/image-extractor";
import { ExtractedRegionsPayload } from "./openrouter.schemas";

export function toExtractedImageRegions(
  payload: ExtractedRegionsPayload,
  maxRegions: number
): ExtractedImageRegion[] {
  const regions: ExtractedImageRegion[] = [];
  for (const region of payload.regions) {
    const box = normalizeBox(region.box);
    if (!box) {
      continue;
    }
    regions.push({ label: region.label, box });
    if (regions.length >= maxRegions) {
      break;
    }
  }
  return regions;
}

export function normalizeBox(box: {
  x: number;
  y: number;
  width: number;
  height: number;
}): ImageRegionBox | null {
  const isPercentage = box.x > 1 || box.y > 1 || box.width > 1 || box.height > 1;
  const scale = isPercentage ? 100 : 1;

  const x = clamp(box.x / scale, 0, 1);
  const y = clamp(box.y / scale, 0, 1);
  const width = Math.min(box.width / scale, 1 - x);
  const height = Math.min(box.height / scale, 1 - y);

  if (width < 0.01 || height < 0.01) {
    return null;
  }
  return { x, y, width, height };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
