import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { Profile } from '../../profile/entities/profile.entity';
import { User } from '../../users/entities/user.entity';
import { BookmarkChangeLog } from '../change-tracker/bookmark-change-log.entity';
import { BookmarkChangeTracker } from '../change-tracker/change-tracker.service';
import { ChangeSource } from '../change-tracker/enums';
import { SyncBookmarkItemDto } from '../dto/sync-request.dto';
import { Bookmark } from '../entity/bookmark.entity';

import { BookmarkHelper } from './helper';
import { BookmarkId, BookmarksByParent, ParentId } from './types';

const MAX_TITLE_LENGTH = 255;

interface ChangePair {
  existing: Bookmark;
  sync: SyncBookmarkItemDto;
}

interface ProcessContext {
  profileId: string;
  user: User;
  profile: Profile;
  syncBatchId?: string;
}

interface Changes {
  modified: ChangePair[];
  moved: ChangePair[];
  added: SyncBookmarkItemDto[];
  deleted: Bookmark[];
}

interface SyncStats {
  updated: number;
  created: number;
  deleted: number;
}

@Injectable()
export class BookmarkProcessor {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarksRepository: Repository<Bookmark>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly dataSource: DataSource,
    private readonly changeTracker: BookmarkChangeTracker,
  ) {}

  async loadExistingBookmarks(
    profileId: string,
    userId: string,
  ): Promise<BookmarksByParent> {
    const bookmarks = await this.bookmarksRepository.find({
      where: {
        profile: { id: profileId, user: { id: userId } },
        user: { id: userId },
        deleted: false,
      },
    });

    // Group by parentId, then by bookmark ID (to avoid position collisions)
    // Also maintain a position map for lookup
    const grouped: BookmarksByParent = new Map<
      ParentId,
      Map<BookmarkId, Bookmark>
    >();

    for (const bookmark of bookmarks) {
      const parentId: ParentId = bookmark.parentId ?? '';
      if (!grouped.has(parentId)) {
        grouped.set(parentId, new Map<BookmarkId, Bookmark>());
      }

      const parentGroup = grouped.get(parentId);
      if (parentGroup) {
        parentGroup.set(bookmark.id, bookmark);
      }
    }

    return grouped;
  }

  async findProfile(profileId: string, userId: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId, user: { id: userId } },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with id ${profileId} not found`);
    }

    return profile;
  }

  async processChangesInTransaction(
    changes: Changes,
    context: ProcessContext,
  ): Promise<SyncStats> {
    const result = await this.dataSource.transaction(async manager => {
      const bookmarkRepo = manager.getRepository(Bookmark);
      const stats: SyncStats = {
        updated: 0,
        created: 0,
        deleted: 0,
      };

      const changeLogRepo = manager.getRepository(BookmarkChangeLog);

      stats.updated += await this.processModifiedItems(
        bookmarkRepo,
        changeLogRepo,
        changes.modified,
        context,
      );
      stats.updated += await this.processMovedItems(
        bookmarkRepo,
        changeLogRepo,
        changes.moved,
        context,
      );
      stats.created += await this.processAddedItems(
        bookmarkRepo,
        changeLogRepo,
        changes.added,
        context,
      );
      stats.deleted += await this.processDeletedItems(
        bookmarkRepo,
        changeLogRepo,
        changes.deleted,
        context,
      );

      return stats;
    });
    return result;
  }

  private async processModifiedItems(
    bookmarkRepo: Repository<Bookmark>,
    changeLogRepo: Repository<BookmarkChangeLog>,
    modified: ChangePair[],
    context: ProcessContext,
  ): Promise<number> {
    if (modified.length === 0) {
      return 0;
    }

    const oldValuesMap = this.captureOldValues(modified);
    const modifiedBookmarks = this.applyModifications(modified);
    await bookmarkRepo.save(modifiedBookmarks);
    await this.trackModifications(
      changeLogRepo,
      modifiedBookmarks,
      oldValuesMap,
      context,
    );

    return modifiedBookmarks.length;
  }

  private captureOldValues(
    modified: ChangePair[],
  ): Map<string, Partial<Bookmark>> {
    const oldValuesMap = new Map<string, Partial<Bookmark>>();
    modified.forEach(({ existing }) => {
      oldValuesMap.set(existing.id, {
        title: existing.title,
        url: existing.url,
        position: existing.position,
        parentId: existing.parentId,
        type: existing.type,
        dateGroupModified: existing.dateGroupModified,
        description: existing.description,
        tags: existing.tags,
      });
    });
    return oldValuesMap;
  }

  private applyModifications(modified: ChangePair[]): Bookmark[] {
    return modified.map(({ existing, sync }) => {
      const type = BookmarkHelper.determineBookmarkType(sync);
      existing.title = sync.title.trim().slice(0, MAX_TITLE_LENGTH);
      existing.position = sync.index;
      existing.parentId = sync.parentId ?? '';
      existing.type = type;
      existing.deleted = false;

      if (sync.url !== undefined) {
        existing.url = sync.url.trim();
      }

      if (sync.dateGroupModified) {
        existing.dateGroupModified = new Date(sync.dateGroupModified);
      }

      return existing;
    });
  }

  private async trackModifications(
    changeLogRepo: Repository<BookmarkChangeLog>,
    modifiedBookmarks: Bookmark[],
    oldValuesMap: Map<string, Partial<Bookmark>>,
    context: ProcessContext,
  ): Promise<void> {
    for (const bookmark of modifiedBookmarks) {
      const oldValues = oldValuesMap.get(bookmark.id);
      if (oldValues) {
        const newValues = this.extractNewValues(bookmark);
        await this.changeTracker.trackUpdateWithRepo(changeLogRepo, {
          bookmark,
          oldValues,
          newValues,
          source: ChangeSource.SYNC,
          userId: context.user.id,
          profileId: context.profileId,
          syncBatchId: context.syncBatchId,
        });
      }
    }
  }

  private extractNewValues(bookmark: Bookmark): Partial<Bookmark> {
    return {
      title: bookmark.title,
      url: bookmark.url,
      position: bookmark.position,
      parentId: bookmark.parentId,
      type: bookmark.type,
      dateGroupModified: bookmark.dateGroupModified,
      description: bookmark.description,
      tags: bookmark.tags,
    };
  }

  private async processMovedItems(
    bookmarkRepo: Repository<Bookmark>,
    changeLogRepo: Repository<BookmarkChangeLog>,
    moved: ChangePair[],
    context: ProcessContext,
  ): Promise<number> {
    if (moved.length === 0) {
      return 0;
    }

    const moveData = this.captureMoveData(moved);
    const movedBookmarks = this.applyMoves(moved);
    await bookmarkRepo.save(movedBookmarks);
    await this.trackMoves(changeLogRepo, moveData, context);

    return movedBookmarks.length;
  }

  private captureMoveData(moved: ChangePair[]): Array<{
    bookmark: Bookmark;
    oldPosition: number;
    oldParentId: string | null;
    newPosition: number;
    newParentId: string;
  }> {
    return moved.map(({ existing, sync }) => ({
      bookmark: existing,
      oldPosition: existing.position,
      oldParentId: existing.parentId,
      newPosition: sync.index,
      newParentId: sync.parentId ?? '',
    }));
  }

  private applyMoves(moved: ChangePair[]): Bookmark[] {
    return moved.map(({ existing, sync }) => {
      existing.position = sync.index;
      existing.parentId = sync.parentId ?? '';
      existing.deleted = false;
      existing.title = sync.title.trim().slice(0, MAX_TITLE_LENGTH);

      if (sync.url !== undefined) {
        existing.url = sync.url.trim();
      }

      if (sync.dateGroupModified) {
        existing.dateGroupModified = new Date(sync.dateGroupModified);
      }

      return existing;
    });
  }

  private async trackMoves(
    changeLogRepo: Repository<BookmarkChangeLog>,
    moveData: Array<{
      bookmark: Bookmark;
      oldPosition: number;
      oldParentId: string | null;
      newPosition: number;
      newParentId: string;
    }>,
    context: ProcessContext,
  ): Promise<void> {
    for (const move of moveData) {
      await this.changeTracker.trackMoveWithRepo(changeLogRepo, {
        bookmark: move.bookmark,
        oldPosition: move.oldPosition,
        newPosition: move.newPosition,
        oldParentId: move.oldParentId,
        newParentId: move.newParentId,
        source: ChangeSource.SYNC,
        userId: context.user.id,
        profileId: context.profileId,
        syncBatchId: context.syncBatchId,
      });
    }
  }

  private async processAddedItems(
    bookmarkRepo: Repository<Bookmark>,
    changeLogRepo: Repository<BookmarkChangeLog>,
    added: SyncBookmarkItemDto[],
    context: ProcessContext,
  ): Promise<number> {
    if (added.length === 0) {
      return 0;
    }

    const newBookmarks = added.map(sync => {
      const type = BookmarkHelper.determineBookmarkType(sync);
      return bookmarkRepo.create({
        title: sync.title.trim().slice(0, MAX_TITLE_LENGTH),
        url: sync.url?.trim() ?? undefined,
        type,
        parentId: sync.parentId ?? '',
        position: sync.index,
        dateGroupModified: sync.dateGroupModified
          ? new Date(sync.dateGroupModified)
          : undefined,
        deleted: false,
        profile: context.profile,
        user: context.user,
      });
    });

    await bookmarkRepo.save(newBookmarks);

    for (const bookmark of newBookmarks) {
      await this.changeTracker.trackCreationWithRepo(changeLogRepo, {
        bookmark,
        source: ChangeSource.SYNC,
        userId: context.user.id,
        profileId: context.profileId,
        syncBatchId: context.syncBatchId,
      });
    }

    return newBookmarks.length;
  }

  private async processDeletedItems(
    bookmarkRepo: Repository<Bookmark>,
    changeLogRepo: Repository<BookmarkChangeLog>,
    deleted: Bookmark[],
    context: ProcessContext,
  ): Promise<number> {
    if (deleted.length === 0) {
      return 0;
    }

    // Track deletions before updating (need full bookmark data)
    for (const bookmark of deleted) {
      await this.changeTracker.trackDeletionWithRepo(changeLogRepo, {
        bookmark,
        source: ChangeSource.SYNC,
        userId: context.user.id,
        profileId: context.profileId,
        syncBatchId: context.syncBatchId,
      });
    }

    const deletedIds = deleted.map(bookmark => bookmark.id);
    await bookmarkRepo.update({ id: In(deletedIds) }, { deleted: true });
    return deletedIds.length;
  }
}
