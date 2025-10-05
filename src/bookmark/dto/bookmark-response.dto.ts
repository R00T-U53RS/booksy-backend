import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class BookmarkResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  url: string;

  @Expose()
  description?: string;

  @Expose()
  createdAt: Date;
}
