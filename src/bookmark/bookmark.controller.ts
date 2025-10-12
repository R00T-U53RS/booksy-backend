import {
  Body,
  Controller,
  Delete,
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
import { BulkDeleteBookmarkRequestDto } from './dto/bulk-delete-request.dto';
import { BulkDeleteBookmarkResponseDto } from './dto/bulk-delete-response.dto';
import { BulkTagBookmarkRequestDto } from './dto/bulk-tag-request.dto';
import { BulkTagBookmarkResponseDto } from './dto/bulk-tag-response.dto';
import { CreateBookmarkDto } from './dto/create-request.dto';
import { BookmarkResponseDto } from './dto/create-response.dto';
import { DeleteBookmarkResponseDto } from './dto/delete-response.dto';
import { ReadBookmarkRequestDto } from './dto/read-request.dto';
import { ReadBookmarkResponseDto } from './dto/read-response.dto';
import { RefreshMetadataResponseDto } from './dto/refresh-metadata-response.dto';
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

  @UseGuards(JwtGuard)
  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Request() request: { user: User },
  ): Promise<DeleteBookmarkResponseDto> {
    return this.bookmarkService.delete(id, request.user);
  }

  @UseGuards(JwtGuard)
  @Post(':id/refresh-metadata')
  @HttpCode(HttpStatus.OK)
  refreshMetadata(
    @Param('id') id: string,
    @Request() request: { user: User },
  ): Promise<RefreshMetadataResponseDto> {
    return this.bookmarkService.refreshMetadata(id, request.user);
  }

  @UseGuards(JwtGuard)
  @Post('bulk/delete')
  @HttpCode(HttpStatus.OK)
  bulkDelete(
    @Body() bulkDeleteDto: BulkDeleteBookmarkRequestDto,
    @Request() request: { user: User },
  ): Promise<BulkDeleteBookmarkResponseDto> {
    return this.bookmarkService.bulkDelete(bulkDeleteDto, request.user);
  }

  @UseGuards(JwtGuard)
  @Post('bulk/tag')
  @HttpCode(HttpStatus.OK)
  bulkTag(
    @Body() bulkTagDto: BulkTagBookmarkRequestDto,
    @Request() request: { user: User },
  ): Promise<BulkTagBookmarkResponseDto> {
    return this.bookmarkService.bulkTag(bulkTagDto, request.user);
  }
}
