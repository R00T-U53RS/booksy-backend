import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { AuthResult, AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(
    @Body() input: { username: string; password: string },
  ): Promise<AuthResult | null> {
    return this.authService.authenticate(input);
  }
}
