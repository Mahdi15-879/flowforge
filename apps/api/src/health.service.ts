import { Injectable } from '@nestjs/common';
import { HealthResponseSchema, type HealthResponse } from '@flowforge/contracts';
@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return HealthResponseSchema.parse({status:'ok',service:'flowforge-api',timestamp:new Date().toISOString()});
  }
}
