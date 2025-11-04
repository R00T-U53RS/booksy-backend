import { Exclude, Expose, Type } from 'class-transformer';

import { Bookmark } from '../../bookmark/entity/bookmark.entity';

@Exclude()
export class BookmarkSetResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  description?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => Bookmark)
  bookmarks?: Bookmark[];
}
