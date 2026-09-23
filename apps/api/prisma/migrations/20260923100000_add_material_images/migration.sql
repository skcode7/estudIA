-- CreateTable
CREATE TABLE "MaterialImage" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialImage_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "imageId" TEXT;

-- CreateIndex
CREATE INDEX "MaterialImage_materialId_idx" ON "MaterialImage"("materialId");

-- CreateIndex
CREATE INDEX "Question_imageId_idx" ON "Question"("imageId");

-- AddForeignKey
ALTER TABLE "MaterialImage" ADD CONSTRAINT "MaterialImage_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MaterialImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
