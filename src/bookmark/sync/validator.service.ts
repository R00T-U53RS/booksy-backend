import { BadRequestException, Injectable } from '@nestjs/common';

import { SyncBookmarkItemDto } from '../dto/sync-request.dto';
import { BookmarkType } from '../entity/bookmark.entity';

import { BookmarkHelper } from './helper';
import { BookmarksByParent, ParentId } from './types';

const MAX_TITLE_LENGTH = 255;

@Injectable()
export class BookmarkValidator {
  validateSyncData(bookmarks: SyncBookmarkItemDto[]): void {
    if (bookmarks === null || bookmarks === undefined) {
      throw new BadRequestException('Bookmarks data is required');
    }

    if (!Array.isArray(bookmarks)) {
      throw new BadRequestException(
        `Bookmarks must be an array. Received: ${typeof bookmarks}`,
      );
    }
  }

  validateAndSanitizeSyncItem(item: SyncBookmarkItemDto): void {
    if (item.title) {
      item.title = item.title.trim().slice(0, MAX_TITLE_LENGTH);
      if (item.title.length === 0) {
        throw new BadRequestException('Bookmark title cannot be empty');
      }
    }

    // Validate URL format if present
    if (item.url && item.url.trim().length > 0) {
      try {
        new URL(item.url);
      } catch {
        throw new BadRequestException(`Invalid URL format: ${item.url}`);
      }
      item.url = item.url.trim();
    }

    // Validate position
    if (item.index < 0) {
      throw new BadRequestException(
        `Invalid position: ${item.index}. Position must be >= 0`,
      );
    }
  }

  validateParentReferences(
    syncByParent: Map<ParentId, SyncBookmarkItemDto[]>,
    existingByParent: BookmarksByParent,
  ): void {
    const referencedParentIds = this.collectReferencedParentIds(syncByParent);
    const allParentIds = this.collectAllParentIds(
      existingByParent,
      syncByParent,
    );
    this.validateAllParentsExist(referencedParentIds, allParentIds);
  }

  private collectReferencedParentIds(
    syncByParent: Map<ParentId, SyncBookmarkItemDto[]>,
  ): Set<string> {
    const referencedParentIds = new Set<string>();
    for (const syncItems of Array.from(syncByParent.values())) {
      for (const item of syncItems) {
        const parentId = item.parentId ?? '';
        if (parentId && !BookmarkHelper.shouldSkipBookmark(parentId)) {
          referencedParentIds.add(parentId);
        }
      }
    }
    return referencedParentIds;
  }

  private collectAllParentIds(
    existingByParent: BookmarksByParent,
    syncByParent: Map<ParentId, SyncBookmarkItemDto[]>,
  ): Set<string> {
    const allParentIds = new Set<string>();
    this.addExistingBookmarkIds(existingByParent, allParentIds);
    this.addFolderIdsFromSync(syncByParent, allParentIds);
    return allParentIds;
  }

  private addExistingBookmarkIds(
    existingByParent: BookmarksByParent,
    allParentIds: Set<string>,
  ): void {
    for (const existingGroup of Array.from(existingByParent.values())) {
      for (const bookmark of Array.from(existingGroup.values())) {
        allParentIds.add(bookmark.id);
      }
    }
  }

  private addFolderIdsFromSync(
    syncByParent: Map<ParentId, SyncBookmarkItemDto[]>,
    allParentIds: Set<string>,
  ): void {
    for (const syncItems of Array.from(syncByParent.values())) {
      for (const item of syncItems) {
        const type = BookmarkHelper.determineBookmarkType(item);
        if (type === BookmarkType.FOLDER) {
          allParentIds.add(item.id);
        }
      }
    }
  }

  private validateAllParentsExist(
    referencedParentIds: Set<string>,
    allParentIds: Set<string>,
  ): void {
    for (const parentId of Array.from(referencedParentIds)) {
      if (!allParentIds.has(parentId)) {
        throw new BadRequestException(
          `Invalid parentId reference: ${parentId}. Parent bookmark or folder does not exist.`,
        );
      }
    }
  }
}
