import { Injectable } from '@nestjs/common';

import { SyncBookmarkItemDto } from '../dto/sync-request.dto';
import { Bookmark, BookmarkType } from '../entity/bookmark.entity';

import { BookmarkHelper } from './helper';
import { BookmarksByParent, ParentId } from './types';

interface ChangePair {
  existing: Bookmark;
  sync: SyncBookmarkItemDto;
}

@Injectable()
export class BookmarkChangeAnalyzer {
  categorizeChanges(
    existingByParent: BookmarksByParent,
    syncByParent: Map<ParentId, SyncBookmarkItemDto[]>,
  ): {
    modified: ChangePair[];
    added: SyncBookmarkItemDto[];
    deleted: Bookmark[];
  } {
    const modified: ChangePair[] = [];
    const added: SyncBookmarkItemDto[] = [];

    const positionsPresentInSync = new Map<ParentId, Set<number>>();

    for (const [parentId, syncItems] of Array.from(syncByParent.entries())) {
      const existingChildren =
        existingByParent.get(parentId) ?? new Map<string, Bookmark>();

      const syncPositions = this.getOrCreatePositionSet(
        parentId,
        positionsPresentInSync,
      );

      const comparisonContext = {
        modified,
        added,
      };
      this.compareItemsUnderSameParent(
        syncItems,
        existingChildren,
        syncPositions,
        comparisonContext,
      );
    }

    const deleted = this.findItemsMissingFromSync(
      existingByParent,
      positionsPresentInSync,
    );

    return { modified, added, deleted };
  }

  private getOrCreatePositionSet(
    parentId: ParentId,
    positionsPresentInSync: Map<ParentId, Set<number>>,
  ): Set<number> {
    let positionSet = positionsPresentInSync.get(parentId);

    if (!positionSet) {
      positionSet = new Set<number>();
      positionsPresentInSync.set(parentId, positionSet);
    }
    return positionSet;
  }

  private compareItemsUnderSameParent(
    syncItems: SyncBookmarkItemDto[],
    existingChildren: Map<string, Bookmark>,
    syncPositions: Set<number>,
    comparisonContext: { modified: ChangePair[]; added: SyncBookmarkItemDto[] },
  ): void {
    for (const syncItem of syncItems) {
      // Track this position as present in sync data
      syncPositions.add(syncItem.index);

      // Try to find existing bookmark at this position
      const existingAtPosition = this.findBookmarkAtPosition(
        existingChildren,
        syncItem.index,
      );

      if (existingAtPosition) {
        this.handleExistingBookmark(
          existingAtPosition,
          syncItem,
          comparisonContext.modified,
        );
      } else {
        // New bookmark at this position
        comparisonContext.added.push(syncItem);
      }
    }
  }

  private findBookmarkAtPosition(
    existingChildren: Map<string, Bookmark>,
    position: number,
  ): Bookmark | undefined {
    return Array.from(existingChildren.values()).find(
      bookmark => bookmark.position === position,
    );
  }

  private handleExistingBookmark(
    existingBookmark: Bookmark,
    syncItem: SyncBookmarkItemDto,
    modified: ChangePair[],
  ): void {
    const hasActuallyChanged = BookmarkHelper.hasChanged(
      existingBookmark,
      syncItem,
    );

    if (hasActuallyChanged) {
      modified.push({
        existing: existingBookmark,
        sync: syncItem,
      });
    }
    // If unchanged, no action needed - bookmark stays as is
  }

  private findItemsMissingFromSync(
    existingByParent: BookmarksByParent,
    positionsPresentInSync: Map<ParentId, Set<number>>,
  ): Bookmark[] {
    const deleted: Bookmark[] = [];

    for (const [parentId, existingChildren] of Array.from(
      existingByParent.entries(),
    )) {
      const syncPositions =
        positionsPresentInSync.get(parentId) ?? new Set<number>();

      for (const bookmark of Array.from(existingChildren.values())) {
        const isNotInSyncData = !syncPositions.has(bookmark.position);
        if (isNotInSyncData) {
          deleted.push(bookmark);
        }
      }
    }

    return deleted;
  }

  detectMoves(
    deleted: Bookmark[],
    added: SyncBookmarkItemDto[],
    syncByParent: Map<ParentId, SyncBookmarkItemDto[]>,
  ): {
    moved: ChangePair[];
    remainingDeleted: Bookmark[];
    remainingAdded: SyncBookmarkItemDto[];
  } {
    const moveMatches: ChangePair[] = [];
    const unmatchedDeletes: Bookmark[] = [];
    const usedAddedIndices = new Set<number>();

    // Only detect moves for bookmarks (folders are handled as delete + create)
    for (const deletedItem of deleted) {
      if (this.isFolder(deletedItem)) {
        unmatchedDeletes.push(deletedItem);
        continue;
      }

      const matchInAdded = this.findMatchingBookmarkInAddedList(
        deletedItem,
        added,
        usedAddedIndices,
        syncByParent,
      );

      if (matchInAdded) {
        moveMatches.push({
          existing: deletedItem,
          sync: matchInAdded.item,
        });
        usedAddedIndices.add(matchInAdded.index);
      } else {
        unmatchedDeletes.push(deletedItem);
      }
    }

    // Collect items from 'added' that weren't matched as moves
    const unmatchedAdds = this.filterUnusedItems(added, usedAddedIndices);

    return {
      moved: moveMatches,
      remainingDeleted: unmatchedDeletes,
      remainingAdded: unmatchedAdds,
    };
  }

  private isFolder(bookmark: Bookmark): boolean {
    return bookmark.type === BookmarkType.FOLDER;
  }

  private findMatchingBookmarkInAddedList(
    deletedBookmark: Bookmark,
    addedItems: SyncBookmarkItemDto[],
    usedAddedIndices: Set<number>,
    syncByParent: Map<ParentId, SyncBookmarkItemDto[]>,
  ): { item: SyncBookmarkItemDto; index: number } | null {
    for (const [addedItemIndex, addedItem] of Array.from(
      addedItems.entries(),
    )) {
      // Skip if already matched
      if (usedAddedIndices.has(addedItemIndex)) {
        continue;
      }

      // Only bookmarks can be moved (must have URL)
      if (!this.isBookmark(addedItem)) {
        continue;
      }

      // Check if content matches (same title and URL)
      const contentMatches = BookmarkHelper.matchesBookmark(
        deletedBookmark,
        addedItem,
      );
      if (!contentMatches) {
        continue;
      }

      // Verify position is available (no duplicate at same position)
      const targetPositionAvailable = this.isPositionAvailable(
        addedItem,
        addedItemIndex,
        syncByParent,
      );

      if (targetPositionAvailable) {
        return { item: addedItem, index: addedItemIndex };
      }
    }

    return null;
  }

  private isBookmark(item: SyncBookmarkItemDto): boolean {
    return !!item.url;
  }

  private isPositionAvailable(
    addedItem: SyncBookmarkItemDto,
    currentIndex: number,
    syncByParent: Map<ParentId, SyncBookmarkItemDto[]>,
  ): boolean {
    const parentId = addedItem.parentId ?? '';
    const syncItemsForParent = syncByParent.get(parentId) ?? [];

    // Check if another item exists at the same position
    const otherItemAtSamePosition = syncItemsForParent.find(
      (item, idx) => idx !== currentIndex && item.index === addedItem.index,
    );

    return !otherItemAtSamePosition;
  }

  private filterUnusedItems(
    addedItems: SyncBookmarkItemDto[],
    usedIndices: Set<number>,
  ): SyncBookmarkItemDto[] {
    return addedItems.filter((_, index) => !usedIndices.has(index));
  }
}
