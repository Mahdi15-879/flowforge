import { HealthService } from './health.service';
import { HealthResponseSchema } from '@flowforge/contracts';
describe('HealthService', () => {
  it('returns a valid contract', () => {
    expect(HealthResponseSchema.safeParse(new HealthService().getHealth()).success).toBe(true);
  });
});
