import { Exclude, Expose, Type } from 'class-transformer';

import { UserResponseDto } from '../../users/dto/user-response.dto';

@Exclude()
export class LoginResponseDto {
  @Expose()
  accessToken: string;

  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;
}
