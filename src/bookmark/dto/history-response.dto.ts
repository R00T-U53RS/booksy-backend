import type { ChangeSource, ChangeType } from '../change-tracker/enums';
import type { BookmarkValuesSnapshot } from '../change-tracker/types';

export class BatchCountsDto {
  created: number;
  updated: number;
  moved: number;
  deleted: number;
}

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
  version: number;
  changeType: ChangeType;
  source: ChangeSource;
  fieldChanges: FieldChangeDto[] | null;
  oldValues?: BookmarkValuesSnapshot;
  newValues?: BookmarkValuesSnapshot;
  createdAt: Date;
  syncBatchId?: string | null;
}

export class BookmarkHistoryResponseDto {
  changes: BookmarkChangeLogDto[];
  total: number;
  limit: number;
  offset: number;
}

export class HistoryBatchDto {
  syncBatchId: string;
  createdAt: Date;
  counts: BatchCountsDto;
  totalChanges: number;
  source: ChangeSource;
  entries: BookmarkChangeLogDto[];
}

export class HistoryBatchesResponseDto {
  batches: HistoryBatchDto[];
  total: number;
  limit: number;
  offset: number;
}
