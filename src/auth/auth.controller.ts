import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthResultDto } from './dto/auth-result.dto';
import { SignInDataDto } from './dto/sign-in-data.dto';
import { JwtGuard } from './guards/jwt.guard';
import { LocalGuard } from './guards/local.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UseGuards(LocalGuard)
  login(@Request() request: { user: SignInDataDto }): Promise<AuthResultDto> {
    return this.authService.signIn(request.user);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  getUserInfo(@Request() request: { user: SignInDataDto }): SignInDataDto {
    return request.user;
  }
}
