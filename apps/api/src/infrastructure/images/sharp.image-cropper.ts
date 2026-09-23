import { Injectable } from "@nestjs/common";
import sharp from "sharp";

import {
  CropRegionInput,
  ImageCropper
} from "../../modules/materials/application/ports/image-cropper";

@Injectable()
export class SharpImageCropper implements ImageCropper {
  async cropToWebp(input: CropRegionInput): Promise<Buffer> {
    const metadata = await sharp(input.image.body).metadata();
    const imageWidth = metadata.width ?? 0;
    const imageHeight = metadata.height ?? 0;
    if (imageWidth <= 0 || imageHeight <= 0) {
      throw new Error("No se pudieron leer las dimensiones de la imagen.");
    }

    const left = Math.max(0, Math.round(input.box.x * imageWidth));
    const top = Math.max(0, Math.round(input.box.y * imageHeight));
    const width = Math.min(imageWidth - left, Math.max(1, Math.round(input.box.width * imageWidth)));
    const height = Math.min(
      imageHeight - top,
      Math.max(1, Math.round(input.box.height * imageHeight))
    );

    return sharp(input.image.body)
      .extract({ left, top, width, height })
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  }
}
