import { IsOptional, IsString } from 'class-validator';

export class ReadBookmarkRequestDto {
  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  url?: string;
}
