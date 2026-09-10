import { Injectable } from "@nestjs/common";

import { MaterialRecord, MaterialRepository } from "../ports/material.repository";

@Injectable()
export class ListMaterialsUseCase {
  constructor(private readonly repository: MaterialRepository) {}

  execute(topicId: string): Promise<MaterialRecord[]> {
    return this.repository.findByTopic(topicId);
  }
}