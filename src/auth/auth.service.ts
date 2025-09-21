import { Injectable, UnauthorizedException } from '@nestjs/common';

import { UsersService } from '../users/users.service';

interface AuthInput {
  username: string;
  password: string;
}
interface SignInData {
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
  constructor(private readonly usersService: UsersService) {}

  async authenticate(input: AuthInput): Promise<AuthResult | null> {
    const user = await this.validateUser(input);

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      access_token: 'fake-token',
      id: user.id,
      username: user.username,
    };
  }

  async validateUser(input: AuthInput): Promise<SignInData | null> {
    const user = await this.usersService.findUserByName(input.username);

    if (user && user.password === input.password) {
      return { id: user.id, username: user.username };
    }

    return null;
  }
}
