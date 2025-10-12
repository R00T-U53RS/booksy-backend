import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class BulkTagBookmarkRequestDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one bookmark ID is required' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagsToAdd?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagsToRemove?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagsToSet?: string[];
}
