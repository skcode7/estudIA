export interface MaterialImageRecord {
  id: string;
  materialId: string;
  storageKey: string;
  label: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveMaterialImageInput {
  storageKey: string;
  label: string;
  order: number;
}

export abstract class MaterialImageRepository {
  abstract listByMaterial(materialId: string): Promise<MaterialImageRecord[]>;
  /**
   * Reemplaza todas las imágenes de un material por las indicadas y devuelve
   * los registros creados (en el mismo orden).
   */
  abstract replaceForMaterial(
    materialId: string,
    images: SaveMaterialImageInput[]
  ): Promise<MaterialImageRecord[]>;
  abstract findById(id: string): Promise<MaterialImageRecord | null>;
}
