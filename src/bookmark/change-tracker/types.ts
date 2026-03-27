import type { Bookmark, BookmarkType } from '../entity/bookmark.entity';

import type { ChangeSource } from './enums';

/**
 * Serialized bookmark values snapshot
 * Dates are serialized as ISO strings, nullable fields can be null/undefined
 */
export interface BookmarkValuesSnapshot {
  title?: string;
  url?: string | null;
  position?: number;
  parentId?: string | null;
  type?: BookmarkType;
  dateGroupModified?: string | null; // ISO string when serialized
  description?: string | null;
  tags?: string | null;
}

/**
 * Possible field value types in FieldChange
 */
export type FieldValue = string | number | BookmarkType | null;

export interface TrackUpdateOptions {
  bookmark: Bookmark;
  oldValues: Partial<Bookmark>;
  newValues: Partial<Bookmark>;
  source: ChangeSource;
  userId: string;
  profileId: string;
  syncBatchId?: string;
}

export interface TrackCreationOptions {
  bookmark: Bookmark;
  source: ChangeSource;
  userId: string;
  profileId: string;
  syncBatchId?: string;
}

export interface TrackDeletionOptions {
  bookmark: Bookmark;
  source: ChangeSource;
  userId: string;
  profileId: string;
  syncBatchId?: string;
}

export interface TrackMoveOptions {
  bookmark: Bookmark;
  oldPosition: number;
  newPosition: number;
  oldParentId: string | null;
  newParentId: string | null;
  source: ChangeSource;
  userId: string;
  profileId: string;
  syncBatchId?: string;
}
