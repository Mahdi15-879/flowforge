import { ConfigService } from "@nestjs/config";

export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>("JWT_SECRET");

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be configured and at least 32 characters long",
    );
  }

  return secret;
}

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
