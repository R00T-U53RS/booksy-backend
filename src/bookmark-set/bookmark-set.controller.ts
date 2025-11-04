import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { JwtGuard } from '../auth/guards/jwt.guard';
import { User } from '../users/entities/user.entity';

import { BookmarkSetService } from './bookmark-set.service';
import { BookmarkSetResponseDto } from './dto/bookmark-set-response.dto';
import { CreateBookmarkSetDto } from './dto/create-bookmark-set.dto';
import { UpdateBookmarkSetDto } from './dto/update-bookmark-set.dto';

@Controller('bookmark-set')
@UseGuards(JwtGuard)
export class BookmarkSetController {
  constructor(private readonly bookmarkSetService: BookmarkSetService) {}

  @Post()
  async create(
    @Body() createBookmarkSetDto: CreateBookmarkSetDto,
    @Request() request: { user: User },
  ): Promise<BookmarkSetResponseDto> {
    const bookmarkSet = await this.bookmarkSetService.create(
      createBookmarkSetDto,
      request.user,
    );
    return plainToInstance(BookmarkSetResponseDto, bookmarkSet, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  async findAll(
    @Request() request: { user: User },
  ): Promise<BookmarkSetResponseDto[]> {
    const bookmarkSets = await this.bookmarkSetService.findAll(request.user.id);
    return plainToInstance(BookmarkSetResponseDto, bookmarkSets, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() request: { user: User },
  ): Promise<BookmarkSetResponseDto> {
    const bookmarkSet = await this.bookmarkSetService.findOne(
      id,
      request.user.id,
    );
    return plainToInstance(BookmarkSetResponseDto, bookmarkSet, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBookmarkSetDto: UpdateBookmarkSetDto,
    @Request() request: { user: User },
  ): Promise<BookmarkSetResponseDto> {
    const bookmarkSet = await this.bookmarkSetService.update(
      id,
      updateBookmarkSetDto,
      request.user.id,
    );
    return plainToInstance(BookmarkSetResponseDto, bookmarkSet, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() request: { user: User }) {
    return this.bookmarkSetService.remove(id, request.user.id);
  }
}
