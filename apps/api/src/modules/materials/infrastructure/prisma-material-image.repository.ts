import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  MaterialImageRecord,
  MaterialImageRepository,
  SaveMaterialImageInput
} from "../application/ports/material-image.repository";

@Injectable()
export class PrismaMaterialImageRepository implements MaterialImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByMaterial(materialId: string): Promise<MaterialImageRecord[]> {
    return this.prisma.materialImage.findMany({
      where: { materialId },
      orderBy: { order: "asc" }
    });
  }

  replaceForMaterial(
    materialId: string,
    images: SaveMaterialImageInput[]
  ): Promise<MaterialImageRecord[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.materialImage.deleteMany({ where: { materialId } });
      const records: MaterialImageRecord[] = [];
      for (const image of images) {
        records.push(
          await tx.materialImage.create({
            data: {
              materialId,
              storageKey: image.storageKey,
              label: image.label,
              order: image.order
            }
          })
        );
      }
      return records;
    });
  }

  findById(id: string): Promise<MaterialImageRecord | null> {
    return this.prisma.materialImage.findUnique({ where: { id } });
  }

  async countByMaterials(materialIds: string[]): Promise<Map<string, number>> {
    if (materialIds.length === 0) {
      return new Map();
    }
    const groups = await this.prisma.materialImage.groupBy({
      by: ["materialId"],
      where: { materialId: { in: materialIds } },
      _count: { _all: true }
    });
    const counts = new Map<string, number>();
    for (const group of groups) {
      counts.set(group.materialId, group._count._all);
    }
    return counts;
  }
}
