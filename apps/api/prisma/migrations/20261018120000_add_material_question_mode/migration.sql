-- CreateEnum
CREATE TYPE "MaterialQuestionMode" AS ENUM ('BASED_ON_MATERIAL', 'SIMILAR_QUESTIONS');

-- AlterTable
ALTER TABLE "Material" ADD COLUMN "questionMode" "MaterialQuestionMode" NOT NULL DEFAULT 'BASED_ON_MATERIAL';
