import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateBookmarkSetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
