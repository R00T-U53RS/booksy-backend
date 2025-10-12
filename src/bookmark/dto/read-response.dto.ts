import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ReadBookmarkResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  url: string;

  @Expose()
  source: string;

  @Expose()
  tags?: string;

  @Expose()
  description?: string;

  @Expose()
  metadata?: Record<string, unknown>;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
