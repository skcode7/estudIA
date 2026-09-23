import { ImageRegionBox } from "../../../ai/application/ports/image-extractor";

export interface CropRegionInput {
  image: {
    mimeType: string;
    body: Buffer;
  };
  box: ImageRegionBox;
}

/**
 * Recorta una región de una imagen y la devuelve como WebP.
 */
export abstract class ImageCropper {
  abstract cropToWebp(input: CropRegionInput): Promise<Buffer>;
}
