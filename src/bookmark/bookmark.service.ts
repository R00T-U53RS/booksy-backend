import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';

import { CreateBookmarkDto } from './dto/create-request.dto';
import { ReadBookmarkRequestDto } from './dto/read-request.dto';
import { UpdateBookmarkDto } from './dto/update-request.dto';
import { UpdateBookmarkResponseDto } from './dto/update-response.dto';
import { Bookmark } from './entity/bookmark.entity';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
  ) {}

  create(createBookmarkDto: CreateBookmarkDto, user: User): Promise<Bookmark> {
    const newBookmark = this.bookmarkRepository.create({
      ...createBookmarkDto,
      user,
    });

    return this.bookmarkRepository.save(newBookmark);
  }

  read(
    user: User,
    readBookmarkRequestDto: ReadBookmarkRequestDto,
  ): Promise<Bookmark[]> {
    const queryBuilder = this.bookmarkRepository
      .createQueryBuilder('bookmark')
      .where('bookmark.user = :userId', { userId: user.id });

    if (readBookmarkRequestDto.source) {
      queryBuilder.andWhere('bookmark.source = :source', {
        source: readBookmarkRequestDto.source,
      });
    }

    if (readBookmarkRequestDto.title) {
      queryBuilder.andWhere('bookmark.title LIKE :title', {
        title: `%${readBookmarkRequestDto.title}%`,
      });
    }

    if (readBookmarkRequestDto.tags) {
      queryBuilder.andWhere('bookmark.tags LIKE :tags', {
        tags: `%${readBookmarkRequestDto.tags}%`,
      });
    }

    if (readBookmarkRequestDto.url) {
      queryBuilder.andWhere('bookmark.url LIKE :url', {
        url: `%${readBookmarkRequestDto.url}%`,
      });
    }

    return queryBuilder.getMany();
  }
  async update(
    id: string,
    updateBookmarkDto: UpdateBookmarkDto,
    user: User,
  ): Promise<UpdateBookmarkResponseDto> {
    const bookmark = await this.bookmarkRepository.findOne({
      where: { id, user },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.bookmarkRepository.update(id, {
      ...updateBookmarkDto,
      tags: updateBookmarkDto.tags?.join(','),
    });

    return { id };
  }
}
