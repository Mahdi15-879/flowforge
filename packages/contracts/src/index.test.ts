import { describe, it, expect } from 'vitest';
import { HealthResponseSchema } from './index';
describe('HealthResponseSchema', () => {
  it('accepts valid response', () => {
    expect(HealthResponseSchema.safeParse({status:'ok',service:'flowforge-api',timestamp:new Date().toISOString()}).success).toBe(true);
  });
  it('rejects invalid status', () => {
    expect(HealthResponseSchema.safeParse({status:'failed',service:'flowforge-api',timestamp:new Date().toISOString()}).success).toBe(false);
  });
});
