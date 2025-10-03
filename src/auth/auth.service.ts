import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';

import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

import { JwtPayloadDto } from './dto/jwt-payload.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(loginDto: LoginRequestDto): Promise<User | null> {
    const user = await this.usersService.findByUsername(loginDto.username);

    // TODO: Use bcrypt to hash and compare passwords
    if (user && user.password === loginDto.password) {
      return user;
    }

    return null;
  }

  async login(user: User): Promise<LoginResponseDto> {
    const payload: JwtPayloadDto = {
      sub: user.id,
      username: user.username,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return plainToInstance(
      LoginResponseDto,
      {
        accessToken,
        user,
      },
      { excludeExtraneousValues: true },
    );
  }
}
