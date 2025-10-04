import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';

import { CreateBookmarkDto } from './dto/create-bookmark.dto';
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
}
