import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import { SyncBookmarkItemDto } from './sync-request.dto';

export class SyncBookmarksRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncBookmarkItemDto)
  bookmarks: SyncBookmarkItemDto[];
}
