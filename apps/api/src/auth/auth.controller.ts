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
  type RegisterRequest,
} from "@flowforge/contracts";
import { AuthService } from "./auth.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: {
          type: "string",
          minLength: 12,
          maxLength: 128,
          format: "password",
        },
        name: { type: "string", maxLength: 100 },
      },
    },
  })
  @ApiResponse({ status: 201, description: "User registered" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 409, description: "Email already registered" })
  async register(@Body() body: unknown) {
    const result = RegisterRequestSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Invalid registration data",
        errors: result.error.flatten(),
      });
    }

    return this.auth.register(result.data as RegisterRequest);
  }
}
