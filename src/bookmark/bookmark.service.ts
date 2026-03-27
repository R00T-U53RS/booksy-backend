import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Profile } from '../profile/entities/profile.entity';
import { User } from '../users/entities/user.entity';

import { BookmarkChangeTracker } from './change-tracker/change-tracker.service';
import { ChangeSource } from './change-tracker/enums';
import { CreateBookmarkDto } from './dto/create-request.dto';
import { SyncBookmarkItemDto } from './dto/sync-request.dto';
import { Bookmark } from './entity/bookmark.entity';
import { BookmarkSyncService } from './sync/orchestrator.service';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarksRepository: Repository<Bookmark>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly bookmarkSyncService: BookmarkSyncService,
    private readonly changeTracker: BookmarkChangeTracker,
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

    const savedBookmark = await this.bookmarksRepository.save(bookmark);

    // Track creation
    await this.changeTracker.trackCreation({
      bookmark: savedBookmark,
      source: ChangeSource.MANUAL_UPDATE,
      userId: user.id,
      profileId,
    });

    return savedBookmark;
  }

  async update(
    profileId: string,
    id: string,
    updateData: Partial<Bookmark>,
    userId: string,
  ): Promise<Bookmark> {
    const bookmark = await this.findBookmarkForUpdate(profileId, id, userId);

    const oldValues = this.captureBookmarkValues(bookmark);
    Object.assign(bookmark, updateData);
    const savedBookmark = await this.bookmarksRepository.save(bookmark);
    await this.trackBookmarkUpdate(savedBookmark, oldValues, userId, profileId);

    return savedBookmark;
  }

  private async findBookmarkForUpdate(
    profileId: string,
    id: string,
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

    return bookmark;
  }

  private captureBookmarkValues(bookmark: Bookmark): Partial<Bookmark> {
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

  private async trackBookmarkUpdate(
    bookmark: Bookmark,
    oldValues: Partial<Bookmark>,
    userId: string,
    profileId: string,
  ): Promise<void> {
    const newValues = this.captureBookmarkValues(bookmark);
    await this.changeTracker.trackUpdate({
      bookmark,
      oldValues,
      newValues,
      source: ChangeSource.MANUAL_UPDATE,
      userId,
      profileId,
    });
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

  sync(
    profileId: string,
    user: User,
    bookmarks: SyncBookmarkItemDto[],
  ): Promise<{ updated: number; created: number; deleted: number }> {
    return this.bookmarkSyncService.sync(profileId, user, bookmarks);
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
