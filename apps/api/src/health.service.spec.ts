
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthResponseSchema } from '@flowforge/contracts';
import { HealthService } from './health.service';
import { PrismaService } from './prisma/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let queryRaw: jest.Mock;

  beforeEach(() => {
    queryRaw = jest.fn();

    const prismaMock = {
      $queryRaw: queryRaw,
    } as unknown as PrismaService;

    service = new HealthService(prismaMock);
  });

  describe('getHealth', () => {
    it('returns a valid application health response', () => {
      const response = service.getHealth();

      expect(
        HealthResponseSchema.safeParse(response).success,
      ).toBe(true);

      expect(response.status).toBe('ok');
      expect(response.service).toBe('flowforge-api');
    });
  });

  describe('getDatabaseHealth', () => {
    it('returns connected when the database responds', async () => {
      queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      await expect(
        service.getDatabaseHealth(),
      ).resolves.toEqual({
        status: 'ok',
        database: 'connected',
      });

      expect(queryRaw).toHaveBeenCalledTimes(1);
    });

    it('throws HTTP 503 when the database is unavailable', async () => {
      queryRaw.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        service.getDatabaseHealth(),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
