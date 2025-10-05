import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';

import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayloadDto } from './dto/jwt-payload.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(loginDto: LoginRequestDto): Promise<User | null> {
    const user = await this.usersService.findByUsername(loginDto.username);

    if (user && (await bcrypt.compare(loginDto.password, user.password))) {
      return user;
    }

    return null;
  }

  async register(registerDto: RegisterRequestDto): Promise<AuthResponseDto> {
    // Check if username or email already exists
    const existingUserByUsername = await this.usersService.findByUsername(
      registerDto.username,
    );
    if (existingUserByUsername) {
      throw new ConflictException('Username already exists');
    }

    if (registerDto.email) {
      const existingUserByEmail = await this.usersService.findByEmail(
        registerDto.email,
      );
      if (existingUserByEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    return this.login(user);
  }

  async login(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayloadDto = {
      sub: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return plainToInstance(AuthResponseDto, {
      accessToken,
      user,
    });
  }
}
