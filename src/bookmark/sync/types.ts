import type { Bookmark } from '../entity/bookmark.entity';

export type BookmarkId = string;
export type ParentId = string;
export type BookmarksByParent = Map<ParentId, Map<BookmarkId, Bookmark>>;
