import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BulkDeleteBookmarkRequestDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one bookmark ID is required' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[];
}
