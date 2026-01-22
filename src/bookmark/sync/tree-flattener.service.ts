import { Injectable } from '@nestjs/common';

import { SyncBookmarkItemDto } from '../dto/sync-request.dto';

import { BookmarkHelper } from './helper';
import { ParentId } from './types';
import { BookmarkValidator } from './validator.service';

@Injectable()
export class BookmarkTreeFlattener {
  constructor(private readonly validator: BookmarkValidator) {}

  flattenSyncTree(
    bookmarks: SyncBookmarkItemDto[],
  ): Map<ParentId, SyncBookmarkItemDto[]> {
    const grouped = new Map<ParentId, SyncBookmarkItemDto[]>();

    const processItem = (item: SyncBookmarkItemDto): void => {
      // Validate and sanitize each item
      this.validator.validateAndSanitizeSyncItem(item);

      // Skip root bookmarks
      if (BookmarkHelper.shouldSkipBookmark(item.id)) {
        for (const child of item?.children ?? []) {
          processItem(child);
        }

        return;
      }

      const parentId = item.parentId ?? '';
      if (!grouped.has(parentId)) {
        grouped.set(parentId, []);
      }

      const parentGroup = grouped.get(parentId);
      if (parentGroup) {
        parentGroup.push(item);
      }

      if (item.children) {
        for (const child of item.children) {
          processItem(child);
        }
      }
    };

    for (const bookmark of bookmarks) {
      processItem(bookmark);
    }

    return grouped;
  }
}
