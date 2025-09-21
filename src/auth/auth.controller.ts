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
import { PassportJwtGuard } from './guards/passport-jwt.guard';
import { PassportLocalGuard } from './guards/passport-local.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UseGuards(PassportLocalGuard)
  login(@Request() request: { user: SignInData }): Promise<AuthResult> {
    return this.authService.signIn(request.user);
  }

  @UseGuards(PassportJwtGuard)
  @Get('me')
  getUserInfo(@Request() request: { user: SignInData }): SignInData {
    return request.user;
  }
}
