import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';

import { AuthInputDto } from './dto/auth-input.dto';
import { AuthResultDto } from './dto/auth-result.dto';
import { SignInDataDto } from './dto/sign-in-data.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async authenticate(input: AuthInputDto): Promise<AuthResultDto | null> {
    const user = await this.validateUser(input);

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.signIn(user);
  }

  async validateUser(input: AuthInputDto): Promise<SignInDataDto | null> {
    const user = await this.usersService.findUserByName(input.username);

    if (user && user.password === input.password) {
      return { id: user.id, username: user.username };
    }

    return null;
  }

  async signIn(user: SignInDataDto): Promise<AuthResultDto> {
    const tokenPayload = { sub: user.id, username: user.username };

    const accessToken = await this.jwtService.signAsync(tokenPayload);

    return {
      access_token: accessToken,
      username: user.username,
      id: user.id,
    };
  }
}
