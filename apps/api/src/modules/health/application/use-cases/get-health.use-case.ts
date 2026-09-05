export interface HealthStatus {
  status: "ok";
}

export class GetHealthUseCase {
  execute(): HealthStatus {
    return { status: "ok" };
  }
}
