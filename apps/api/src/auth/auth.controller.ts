import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";

import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import {
  RegisterRequestSchema,
  LoginRequestSchema,
} from "@flowforge/contracts";

import { AuthService } from "./auth.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // -----------------------------------------
  // POST /api/v1/auth/register
  // -----------------------------------------

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Register a new user",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: {
          type: "string",
          format: "email",
        },
        password: {
          type: "string",
          minLength: 12,
          maxLength: 128,
          format: "password",
        },
        name: {
          type: "string",
          maxLength: 100,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid registration data",
  })
  @ApiResponse({
    status: 409,
    description: "Email is already registered",
  })
  async register(@Body() body: unknown) {
    const result = RegisterRequestSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Invalid registration data",
        errors: result.error.flatten(),
      });
    }

    return this.auth.register(result.data);
  }

  // -----------------------------------------
  // POST /api/v1/auth/login
  // -----------------------------------------

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Login with email and password",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: {
          type: "string",
          format: "email",
        },
        password: {
          type: "string",
          format: "password",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Login successful",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid login data",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid email or password",
  })
  async login(@Body() body: unknown) {
    const result = LoginRequestSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Invalid login data",
        errors: result.error.flatten(),
      });
    }

    return this.auth.login(result.data);
  }
}
