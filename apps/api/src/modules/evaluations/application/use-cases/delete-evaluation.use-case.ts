import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { EvaluationImageRepository } from "../ports/evaluation-image.repository";
import { EvaluationRepository } from "../ports/evaluation.repository";

@Injectable()
export class DeleteEvaluationUseCase {
  private readonly logger = new Logger(DeleteEvaluationUseCase.name);

  constructor(
    private readonly repository: EvaluationRepository,
    private readonly imageRepository: EvaluationImageRepository,
    private readonly objectStorage: ObjectStorage
  ) {}

  /**
   * Las preguntas ya extraídas sobreviven (su `sourceEvaluationId` queda en
   * null) y siguen contando como preguntas de la materia; lo que se borra son
   * las fotos de la evaluación y su rastro.
   */
  async execute(id: string): Promise<void> {
    const evaluation = await this.repository.findById(id);
    if (!evaluation) {
      throw new NotFoundException(`Evaluación con id "${id}" no encontrada.`);
    }

    const images = await this.imageRepository.listByEvaluation(id);

    await this.repository.delete(id);

    for (const image of images) {
      try {
        await this.objectStorage.delete(image.storageKey);
      } catch (error) {
        this.logger.warn(
          `No se pudo eliminar la foto "${image.storageKey}" del almacenamiento: ${String(error)}`
        );
      }
    }
  }
}
