import { Expose } from 'class-transformer';

export class BulkTagBookmarkResponseDto {
  @Expose()
  updatedIds: string[];

  @Expose()
  failedIds: string[];

  @Expose()
  totalUpdated: number;

  @Expose()
  totalFailed: number;

  @Expose()
  success: boolean;

  @Expose()
  message: string;

  @Expose()
  operation: 'add' | 'remove' | 'set';
}
