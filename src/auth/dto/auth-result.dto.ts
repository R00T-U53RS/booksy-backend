import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AuthResultDto {
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  username: string;
}
