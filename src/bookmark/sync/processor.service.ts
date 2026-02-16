import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { Profile } from '../../profile/entities/profile.entity';
import { User } from '../../users/entities/user.entity';
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
  ) {}

  async loadExistingBookmarks(
    profileId: string,
    userId: string,
  ): Promise<BookmarksByParent> {
    const bookmarks = await this.bookmarksRepository.find({
      where: {
        profile: { id: profileId, user: { id: userId } },
        user: { id: userId },
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

      stats.updated += await this.processModifiedItems(
        bookmarkRepo,
        changes.modified,
      );
      stats.updated += await this.processMovedItems(
        bookmarkRepo,
        changes.moved,
      );
      stats.created += await this.processAddedItems(
        bookmarkRepo,
        changes.added,
        context,
      );
      stats.deleted += await this.processDeletedItems(
        bookmarkRepo,
        changes.deleted,
      );

      return stats;
    });
    return result;
  }

  private async processModifiedItems(
    bookmarkRepo: Repository<Bookmark>,
    modified: ChangePair[],
  ): Promise<number> {
    if (modified.length === 0) {
      return 0;
    }

    const modifiedBookmarks = modified.map(({ existing, sync }) => {
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

    await bookmarkRepo.save(modifiedBookmarks);
    return modifiedBookmarks.length;
  }

  private async processMovedItems(
    bookmarkRepo: Repository<Bookmark>,
    moved: ChangePair[],
  ): Promise<number> {
    if (moved.length === 0) {
      return 0;
    }

    const movedBookmarks = moved.map(({ existing, sync }) => {
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

    await bookmarkRepo.save(movedBookmarks);
    return movedBookmarks.length;
  }

  private async processAddedItems(
    bookmarkRepo: Repository<Bookmark>,
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
    return newBookmarks.length;
  }

  private async processDeletedItems(
    bookmarkRepo: Repository<Bookmark>,
    deleted: Bookmark[],
  ): Promise<number> {
    if (deleted.length === 0) {
      return 0;
    }

    const deletedIds = deleted.map(bookmark => bookmark.id);
    await bookmarkRepo.update({ id: In(deletedIds) }, { deleted: true });
    return deletedIds.length;
  }
}
