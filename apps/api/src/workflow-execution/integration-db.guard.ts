import { PrismaClient } from "@prisma/client";

export async function assertIntegrationDatabase(
  prisma: PrismaClient,
): Promise<void> {
  const result = await prisma.$queryRaw<
    Array<{ database_name: string; username: string }>
  >`
    SELECT
      current_database() AS database_name,
      current_user AS username
  `;

  if (
    result.length !== 1 ||
    result[0].database_name !== "flowforge_test" ||
    result[0].username !== "flowforge"
  ) {
    throw new Error(
      "Unsafe database connection: integration tests require flowforge_test.",
    );
  }
}
