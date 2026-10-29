import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";

import {
  type RegisterRequest,
  type PublicUser,
  PublicUserSchema,
  type LoginRequest,
  type LoginResponse,
  LoginResponseSchema,
} from "@flowforge/contracts";

import { PrismaService } from "../prisma/prisma.service";
import { ACCESS_TOKEN_TTL_SECONDS, getJwtSecret } from "./jwt.config";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

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

  async login(input: LoginRequest): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const validPassword = await argon2.verify(
      user.passwordHash,
      input.password,
    );

    if (!validPassword) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const accessToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: getJwtSecret(this.config),
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        algorithm: "HS256",
      },
    );

    const publicUser = PublicUserSchema.parse({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    });

    return LoginResponseSchema.parse({
      accessToken,
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: publicUser,
    });
  }

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User account no longer exists");
    }

    return PublicUserSchema.parse({
      ...user,
      createdAt: user.createdAt.toISOString(),
    });
  }
}
