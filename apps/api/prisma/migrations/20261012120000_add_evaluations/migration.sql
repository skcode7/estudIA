-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'TRUE_FALSE';
ALTER TYPE "QuestionType" ADD VALUE 'FILL_BLANK';

-- CreateEnum
CREATE TYPE "EvaluationProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dateTaken" TIMESTAMP(3),
    "processingStatus" "EvaluationProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationImage" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationImage_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "sourceEvaluationId" TEXT;
ALTER TABLE "Question" ADD COLUMN "evaluationImageId" TEXT;

-- CreateIndex
CREATE INDEX "Evaluation_topicId_idx" ON "Evaluation"("topicId");

-- CreateIndex
CREATE INDEX "EvaluationImage_evaluationId_idx" ON "EvaluationImage"("evaluationId");

-- CreateIndex
CREATE INDEX "Question_sourceEvaluationId_idx" ON "Question"("sourceEvaluationId");

-- CreateIndex
CREATE INDEX "Question_evaluationImageId_idx" ON "Question"("evaluationImageId");

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationImage" ADD CONSTRAINT "EvaluationImage_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_sourceEvaluationId_fkey" FOREIGN KEY ("sourceEvaluationId") REFERENCES "Evaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_evaluationImageId_fkey" FOREIGN KEY ("evaluationImageId") REFERENCES "EvaluationImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
