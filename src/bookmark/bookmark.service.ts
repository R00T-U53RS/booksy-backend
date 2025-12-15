import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Profile } from '../profile/entities/profile.entity';
import { User } from '../users/entities/user.entity';

import { CreateBookmarkDto } from './dto/create-request.dto';
import { SyncBookmarkItemDto } from './dto/sync-request.dto';
import { Bookmark, BookmarkType } from './entity/bookmark.entity';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarksRepository: Repository<Bookmark>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  findAllBookmarksInProfile(
    profileId: string,
    userId: string,
  ): Promise<Bookmark[]> {
    return this.bookmarksRepository.find({
      where: {
        profile: { id: profileId, user: { id: userId } },
        user: { id: userId },
        deleted: false,
      },
    });
  }

  findRootBookmarks(profileId: string, userId: string): Promise<Bookmark[]> {
    return this.bookmarksRepository.find({
      where: {
        profile: { id: profileId, user: { id: userId } },
        user: { id: userId },
        parentId: IsNull(),
        deleted: false,
      },
    });
  }

  async create(
    profileId: string,
    user: User,
    createData: CreateBookmarkDto,
  ): Promise<Bookmark> {
    const profile = await this.findProfile(profileId, user.id);

    const bookmark = this.bookmarksRepository.create({
      ...createData,
      parentId: createData.parentId || '',
      position: createData.position ?? 0,
      profile,
      user,
    });

    return this.bookmarksRepository.save(bookmark);
  }

  async update(
    profileId: string,
    id: string,
    updateData: Partial<Bookmark>,
    userId: string,
  ): Promise<Bookmark> {
    const bookmark = await this.bookmarksRepository.findOne({
      where: {
        id,
        profile: { id: profileId, user: { id: userId } },
        user: { id: userId },
      },
    });

    if (!bookmark) {
      throw new NotFoundException(`Bookmark with id ${id} not found`);
    }

    Object.assign(bookmark, updateData);
    return this.bookmarksRepository.save(bookmark);
  }

  buildTree(bookmarks: Bookmark[]): Array<Bookmark & { children: Bookmark[] }> {
    const bookmarkMap = new Map<string, Bookmark & { children: Bookmark[] }>();
    const rootBookmarks: Array<Bookmark & { children: Bookmark[] }> = [];

    // First pass: create map
    bookmarks.forEach(bookmark => {
      bookmarkMap.set(bookmark.id, { ...bookmark, children: [] });
    });

    // Second pass: build tree
    bookmarks.forEach(bookmark => {
      const node = bookmarkMap.get(bookmark.id);
      if (!node) return;

      if (bookmark.parentId === null) {
        rootBookmarks.push(node);
      } else {
        const parent = bookmarkMap.get(bookmark.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return rootBookmarks;
  }

  async sync(
    profileId: string,
    user: User,
    bookmarks: SyncBookmarkItemDto[],
  ): Promise<{ updated: number; created: number; deleted: number }> {
    this.validateSyncData(bookmarks);

    const profile = await this.findProfile(profileId, user.id);
    const context = {
      profileId,
      user,
      profile,
      stats: { updated: 0, created: 0, deleted: 0 },
      seenUrls: new Set<string>(),
    };

    // Mark all existing bookmarks in this profile as deleted
    // We'll unmark them as we process the sync data
    await this.bookmarksRepository.update(
      {
        profile: { id: profileId },
        user: { id: user.id },
      },
      { deleted: true },
    );

    // Process all bookmarks from sync data
    for (const bookmark of bookmarks) {
      await this.processBookmarkItem(bookmark, context);
    }

    // Count how many bookmarks are still marked as deleted
    const deletedCount = await this.bookmarksRepository.count({
      where: {
        profile: { id: profileId },
        user: { id: user.id },
        deleted: true,
      },
    });

    context.stats.deleted = deletedCount;
    return context.stats;
  }

  private async processBookmarkItem(
    item: SyncBookmarkItemDto,
    context: {
      profileId: string;
      user: User;
      profile: Profile;
      stats: { updated: number; created: number; deleted: number };
      seenUrls: Set<string>;
    },
  ): Promise<void> {
    for (const child of item?.children ?? []) {
      await this.processBookmarkItem(child, context);
    }

    if (this.shouldSkipBookmark(item.id)) {
      return;
    }

    const url = item.url ?? '';
    if (url) {
      context.seenUrls.add(url);
    }

    const result = await this.createOrUpdateBookmark(item, context);

    if (result.isNew) {
      context.stats.created++;
    } else {
      context.stats.updated++;
    }
  }

  private validateSyncData(bookmarks: SyncBookmarkItemDto[]): void {
    if (bookmarks === null || bookmarks === undefined) {
      throw new BadRequestException('Bookmarks data is required');
    }

    if (!Array.isArray(bookmarks)) {
      throw new BadRequestException(
        `Bookmarks must be an array. Received: ${typeof bookmarks}`,
      );
    }

    if (bookmarks.length === 0) {
      throw new BadRequestException('Bookmarks array cannot be empty');
    }
  }

  // We skip these bookmarks, the root bookmark, bookmarks bar, and other bookmarks, these are not editable by the browser
  private shouldSkipBookmark(id: string): boolean {
    return id === '0' || id === '1' || id === '2';
  }

  private async createOrUpdateBookmark(
    item: SyncBookmarkItemDto,
    context: {
      profileId: string;
      user: User;
      profile: Profile;
    },
  ): Promise<{ bookmark: Bookmark; isNew: boolean }> {
    const url = item.url ?? null;
    const existing = await this.findBookmarkByUrl(
      url,
      context.profileId,
      context.user.id,
    );

    if (existing) {
      return this.updateExistingBookmark(existing, item);
    }

    return this.createNewBookmark(item, context);
  }

  private findBookmarkByUrl(
    url: string | null,
    profileId: string,
    userId: string,
  ): Promise<Bookmark | null> {
    if (url === null) {
      return this.bookmarksRepository.findOne({
        where: {
          profile: { id: profileId },
          user: { id: userId },
          url: IsNull(),
        },
      });
    }

    return this.bookmarksRepository.findOne({
      where: {
        profile: { id: profileId },
        user: { id: userId },
        url,
      },
    });
  }

  private async updateExistingBookmark(
    existing: Bookmark,
    item: SyncBookmarkItemDto,
  ): Promise<{ bookmark: Bookmark; isNew: boolean }> {
    const type = this.determineBookmarkType(item);
    existing.title = item.title;
    existing.position = item.index;
    existing.parentId = item.parentId ?? '';
    if (item.url !== undefined) {
      existing.url = item.url || '';
    }
    existing.type = type;
    existing.deleted = false;
    if (item.dateGroupModified) {
      existing.dateGroupModified = new Date(item.dateGroupModified);
    }
    const saved = await this.bookmarksRepository.save(existing);
    return { bookmark: saved, isNew: false };
  }

  private async createNewBookmark(
    item: SyncBookmarkItemDto,
    context: {
      profile: Profile;
      user: User;
    },
  ): Promise<{ bookmark: Bookmark; isNew: boolean }> {
    const type = this.determineBookmarkType(item);
    const bookmarkData: Partial<Bookmark> = {
      title: item.title,
      url: item.url ?? undefined,
      type,
      parentId: item.parentId ?? '',
      position: item.index,
      dateGroupModified: item.dateGroupModified
        ? new Date(item.dateGroupModified)
        : undefined,
      deleted: false,
      profile: context.profile,
      user: context.user,
    };

    const bookmark = this.bookmarksRepository.create(bookmarkData);
    const saved = await this.bookmarksRepository.save(bookmark);
    return { bookmark: saved, isNew: true };
  }

  private determineBookmarkType(item: SyncBookmarkItemDto): BookmarkType {
    return !item.url || (item.children && item.children.length > 0)
      ? BookmarkType.FOLDER
      : BookmarkType.BOOKMARK;
  }

  private async findProfile(profileId: string, userId: string) {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId, user: { id: userId } },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with id ${profileId} not found`);
    }

    return profile;
  }
}
