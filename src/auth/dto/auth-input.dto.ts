import { IsNotEmpty, IsString } from 'class-validator';

export class AuthInputDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
