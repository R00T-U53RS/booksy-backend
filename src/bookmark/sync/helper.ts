import type { SyncBookmarkItemDto } from '../dto/sync-request.dto';
import { type Bookmark, BookmarkType } from '../entity/bookmark.entity';

export class BookmarkHelper {
  static shouldSkipBookmark(id: string): boolean {
    return id === '0' || id === '1' || id === '2';
  }

  static determineBookmarkType(item: SyncBookmarkItemDto): BookmarkType {
    return !item.url || (item.children && item.children.length > 0)
      ? BookmarkType.FOLDER
      : BookmarkType.BOOKMARK;
  }

  static matchesBookmark(
    existing: Bookmark,
    sync: SyncBookmarkItemDto,
  ): boolean {
    return existing.title === sync.title && existing.url === (sync.url ?? '');
  }

  static hasChanged(existing: Bookmark, sync: SyncBookmarkItemDto): boolean {
    const type = BookmarkHelper.determineBookmarkType(sync);

    if (existing.title !== sync.title) return true;
    if (existing.type !== type) return true;
    if (existing.position !== sync.index) return true;
    if (existing.parentId !== (sync.parentId ?? '')) return true;

    // For bookmarks, check URL
    if (type === BookmarkType.BOOKMARK) {
      const syncUrl = sync.url ?? '';
      if (existing.url !== syncUrl) return true;
    }

    return BookmarkHelper.hasDateChanged(existing, sync);
  }

  private static hasDateChanged(
    existing: Bookmark,
    sync: SyncBookmarkItemDto,
  ): boolean {
    const syncDate = sync.dateGroupModified
      ? new Date(sync.dateGroupModified)
      : null;
    const existingDate = existing.dateGroupModified;

    if (syncDate && existingDate) {
      return syncDate.getTime() !== existingDate.getTime();
    }

    return syncDate !== existingDate;
  }
}
