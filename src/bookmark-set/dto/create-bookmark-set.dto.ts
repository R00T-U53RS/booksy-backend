import { IsOptional, IsString } from 'class-validator';

export class CreateBookmarkSetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
