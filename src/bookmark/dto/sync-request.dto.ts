import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SyncBookmarkItemDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  parentId: string;

  @IsNumber()
  index: number;

  @IsNumber()
  dateAdded: number;

  @IsNumber()
  @IsOptional()
  dateGroupModified?: number;

  @IsString()
  @IsOptional()
  folderType?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncBookmarkItemDto)
  children?: SyncBookmarkItemDto[];
}
