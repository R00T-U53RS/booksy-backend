import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';

interface AuthInput {
  username: string;
  password: string;
}
export interface SignInData {
  id: number;
  username: string;
}
export interface AuthResult {
  access_token: string;
  id: number;
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async authenticate(input: AuthInput): Promise<AuthResult | null> {
    const user = await this.validateUser(input);

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.signIn(user);
  }

  async validateUser(input: AuthInput): Promise<SignInData | null> {
    const user = await this.usersService.findUserByName(input.username);

    if (user && user.password === input.password) {
      return { id: user.id, username: user.username };
    }

    return null;
  }

  async signIn(user: SignInData): Promise<AuthResult> {
    const tokenPayload = { sub: user.id, username: user.username };

    const accessToken = await this.jwtService.signAsync(tokenPayload);

    return {
      access_token: accessToken,
      username: user.username,
      id: user.id,
    };
  }
}
