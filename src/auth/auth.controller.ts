import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';

import { AuthService } from './auth.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtGuard } from './guards/jwt.guard';
import { LocalGuard } from './guards/local.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UseGuards(LocalGuard)
  login(@Request() request: { user: User }): Promise<LoginResponseDto> {
    return this.authService.login(request.user);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  getProfile(@Request() request: { user: User }): UserResponseDto {
    return plainToInstance(UserResponseDto, request.user, {
      excludeExtraneousValues: true,
    });
  }
}
