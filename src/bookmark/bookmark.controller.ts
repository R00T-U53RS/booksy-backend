import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { JwtGuard } from '../auth/guards/jwt.guard';
import { User } from '../users/entities/user.entity';

import { BookmarkService } from './bookmark.service';
import { BookmarkResponseDto } from './dto/bookmark-response.dto';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @UseGuards(JwtGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createBookmarkDto: CreateBookmarkDto,
    @Request() request: { user: User },
  ): Promise<BookmarkResponseDto> {
    const bookmark = await this.bookmarkService.create(
      createBookmarkDto,
      request.user,
    );

    return plainToInstance(BookmarkResponseDto, bookmark, {
      excludeExtraneousValues: true,
    });
  }
}
