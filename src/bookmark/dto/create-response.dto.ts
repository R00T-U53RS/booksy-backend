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
  source: string;

  @Expose()
  description?: string;

  @Expose()
  tags?: string;

  @Expose()
  createdAt: Date;
}
