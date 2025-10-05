import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { JwtGuard } from '../auth/guards/jwt.guard';
import { User } from '../users/entities/user.entity';

import { BookmarkService } from './bookmark.service';
import { CreateBookmarkDto } from './dto/create-request.dto';
import { BookmarkResponseDto } from './dto/create-response.dto';
import { ReadBookmarkRequestDto } from './dto/read-request.dto';
import { ReadBookmarkResponseDto } from './dto/read-response.dto';
import { UpdateBookmarkDto } from './dto/update-request.dto';
import { UpdateBookmarkResponseDto } from './dto/update-response.dto';

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

    return plainToInstance(BookmarkResponseDto, bookmark);
  }

  @UseGuards(JwtGuard)
  @Get()
  async read(
    @Query() readBookmarkRequestDto: ReadBookmarkRequestDto,
    @Request() request: { user: User },
  ): Promise<ReadBookmarkResponseDto[]> {
    const bookmarks = await this.bookmarkService.read(
      request.user,
      readBookmarkRequestDto,
    );

    return plainToInstance(ReadBookmarkResponseDto, bookmarks, {
      excludeExtraneousValues: true,
    });
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookmarkDto: UpdateBookmarkDto,
    @Request() request: { user: User },
  ): Promise<UpdateBookmarkResponseDto> {
    return this.bookmarkService.update(id, updateBookmarkDto, request.user);
  }
}
