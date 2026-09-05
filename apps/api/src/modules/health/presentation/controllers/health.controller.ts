import { Controller, Get } from "@nestjs/common";

import { GetHealthUseCase, type HealthStatus } from "../../application/use-cases/get-health.use-case";

@Controller("health")
export class HealthController {
  constructor(private readonly getHealthUseCase: GetHealthUseCase) {}

  @Get()
  getHealth(): HealthStatus {
    return this.getHealthUseCase.execute();
  }
}
