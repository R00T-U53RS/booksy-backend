import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { AuthResult, AuthService, SignInData } from './auth.service';
import { JwtGuard } from './guards/jwt.guard';
import { LocalGuard } from './guards/local.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UseGuards(LocalGuard)
  login(@Request() request: { user: SignInData }): Promise<AuthResult> {
    return this.authService.signIn(request.user);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  getUserInfo(@Request() request: { user: SignInData }): SignInData {
    return request.user;
  }
}
