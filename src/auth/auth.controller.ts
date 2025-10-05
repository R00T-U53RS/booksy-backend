import {
  Body,
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
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { JwtGuard } from './guards/jwt.guard';
import { LocalGuard } from './guards/local.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  register(@Body() registerDto: RegisterRequestDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UseGuards(LocalGuard)
  login(@Request() request: { user: User }): Promise<AuthResponseDto> {
    return this.authService.login(request.user);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  getProfile(@Request() request: { user: User }): UserResponseDto {
    return plainToInstance(UserResponseDto, request.user);
  }
}
