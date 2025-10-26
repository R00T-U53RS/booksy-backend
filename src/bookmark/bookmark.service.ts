import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Bookmark } from './entity/bookmark.entity';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarksRepository: Repository<Bookmark>,
  ) {}

  findAllBookmarksInSet(bookmarkSetId: string): Promise<Bookmark[]> {
    return this.bookmarksRepository.find({
      where: {
        bookmarkSet: { id: bookmarkSetId },
      },
    });
  }

  findRootBookmarks(bookmarkSetId: string): Promise<Bookmark[]> {
    return this.bookmarksRepository.find({
      where: {
        bookmarkSet: { id: bookmarkSetId },
        parentId: IsNull(),
      },
    });
  }

  async create(createData: Partial<Bookmark>): Promise<Bookmark> {
    const bookmark = this.bookmarksRepository.create(createData);
    const saved = await this.bookmarksRepository.save(bookmark);

    return saved;
  }

  async update(id: string, updateData: Partial<Bookmark>): Promise<Bookmark> {
    const bookmark = await this.bookmarksRepository.findOne({
      where: { id },
    });

    if (!bookmark) {
      throw new Error(`Bookmark with id ${id} not found`);
    }

    Object.assign(bookmark, updateData);
    const updated = await this.bookmarksRepository.save(bookmark);

    return updated;
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
}
