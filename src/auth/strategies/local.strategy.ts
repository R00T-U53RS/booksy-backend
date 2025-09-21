import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';
import { SignInDataDto } from '../dto/sign-in-data.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(username: string, password: string): Promise<SignInDataDto> {
    const user = await this.authService.validateUser({ username, password });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
