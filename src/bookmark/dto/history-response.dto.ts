import type { ChangeSource, ChangeType } from '../change-tracker/enums';
import type { BookmarkValuesSnapshot } from '../change-tracker/types';

export class FieldChangeDto {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'modified' | 'removed';
}

export class BookmarkChangeLogDto {
  id: string;
  bookmarkId: string;
  bookmarkTitle?: string; // Denormalized for convenience
  changeType: ChangeType;
  source: ChangeSource;
  fieldChanges: FieldChangeDto[];
  oldValues?: BookmarkValuesSnapshot;
  newValues?: BookmarkValuesSnapshot;
  createdAt: Date;
  syncBatchId?: string;
}

export class BookmarkHistoryResponseDto {
  changes: BookmarkChangeLogDto[];
  total: number;
  limit: number;
  offset: number;
}
