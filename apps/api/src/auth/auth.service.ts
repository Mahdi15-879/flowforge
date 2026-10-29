import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import {
  type RegisterRequest,
  type PublicUser,
  PublicUserSchema,
} from "@flowforge/contracts";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterRequest): Promise<PublicUser> {
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });

    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      return PublicUserSchema.parse({
        ...user,
        createdAt: user.createdAt.toISOString(),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Email is already registered");
      }

      throw error;
    }
  }
}
