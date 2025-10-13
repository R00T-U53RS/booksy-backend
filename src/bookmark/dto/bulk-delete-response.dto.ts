import { Expose } from 'class-transformer';

export class BulkDeleteBookmarkResponseDto {
  @Expose()
  deletedIds: string[];

  @Expose()
  failedIds: string[];

  @Expose()
  totalDeleted: number;

  @Expose()
  totalFailed: number;

  @Expose()
  success: boolean;

  @Expose()
  message: string;
}
