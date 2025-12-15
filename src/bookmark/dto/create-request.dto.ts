import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
} from 'class-validator';

import { BookmarkType } from '../entity/bookmark.entity';

export class CreateBookmarkDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  source: string;

  @IsEnum(BookmarkType)
  type: BookmarkType;

  @IsUUID()
  @IsString()
  parentId: string;

  @IsInt()
  @Min(0)
  position: number;

  @IsString()
  @IsOptional()
  tags?: string;
}
