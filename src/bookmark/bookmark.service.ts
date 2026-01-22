import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Profile } from '../profile/entities/profile.entity';
import { User } from '../users/entities/user.entity';

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
