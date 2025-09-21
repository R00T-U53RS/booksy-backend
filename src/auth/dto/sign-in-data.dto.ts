import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SignInDataDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  username: string;
}
