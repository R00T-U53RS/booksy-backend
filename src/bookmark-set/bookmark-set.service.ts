import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';

import { CreateBookmarkSetDto } from './dto/create-bookmark-set.dto';
import { UpdateBookmarkSetDto } from './dto/update-bookmark-set.dto';
import { BookmarkSet } from './entities/bookmark-set.entity';

@Injectable()
export class BookmarkSetService {
  constructor(
    @InjectRepository(BookmarkSet)
    private readonly bookmarkSetRepository: Repository<BookmarkSet>,
  ) {}

  async create(
    createBookmarkSetDto: CreateBookmarkSetDto,
    user: User,
  ): Promise<BookmarkSet> {
    const bookmarkSet = this.bookmarkSetRepository.create({
      ...createBookmarkSetDto,
      user,
    });

    const saved = await this.bookmarkSetRepository.save(bookmarkSet);

    return this.findOne(saved.id, user.id);
  }

  findAll(userId: string): Promise<BookmarkSet[]> {
    return this.bookmarkSetRepository.find({
      where: { user: { id: userId } },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<BookmarkSet> {
    const bookmarkSet = await this.bookmarkSetRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['bookmarks'],
    });

    if (!bookmarkSet) {
      throw new NotFoundException(`BookmarkSet with id ${id} not found`);
    }

    if (!bookmarkSet.bookmarks) {
      bookmarkSet.bookmarks = [];
    }

    return bookmarkSet;
  }

  async update(
    id: string,
    updateBookmarkSetDto: UpdateBookmarkSetDto,
    userId: string,
  ): Promise<BookmarkSet> {
    const bookmarkSet = await this.findOne(id, userId);

    Object.assign(bookmarkSet, updateBookmarkSetDto);
    await this.bookmarkSetRepository.save(bookmarkSet);

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const bookmarkSet = await this.findOne(id, userId);
    await this.bookmarkSetRepository.remove(bookmarkSet);
  }
}
