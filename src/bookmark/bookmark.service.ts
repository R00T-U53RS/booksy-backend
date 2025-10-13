import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';

import { BulkDeleteBookmarkRequestDto } from './dto/bulk-delete-request.dto';
import { BulkDeleteBookmarkResponseDto } from './dto/bulk-delete-response.dto';
import { BulkTagBookmarkRequestDto } from './dto/bulk-tag-request.dto';
import { BulkTagBookmarkResponseDto } from './dto/bulk-tag-response.dto';
import { CreateBookmarkDto } from './dto/create-request.dto';
import { DeleteBookmarkResponseDto } from './dto/delete-response.dto';
import { ReadBookmarkRequestDto } from './dto/read-request.dto';
import { RefreshMetadataResponseDto } from './dto/refresh-metadata-response.dto';
import { UpdateBookmarkDto } from './dto/update-request.dto';
import { UpdateBookmarkResponseDto } from './dto/update-response.dto';
import { Bookmark } from './entity/bookmark.entity';
import { BulkOperationsService } from './services/bulk-operations.service';
import { MetadataExtractionService } from './services/metadata-extraction.service';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
    private readonly metadataExtractionService: MetadataExtractionService,
    private readonly bulkOperationsService: BulkOperationsService,
  ) {}

  async create(
    createBookmarkDto: CreateBookmarkDto,
    user: User,
  ): Promise<Bookmark> {
    const newBookmark = this.bookmarkRepository.create({
      ...createBookmarkDto,
      user,
    });

    // Extract metadata asynchronously after saving
    const savedBookmark = await this.bookmarkRepository.save(newBookmark);

    // Extract metadata in the background
    void this.extractAndUpdateMetadata(savedBookmark.id, createBookmarkDto.url);

    return savedBookmark;
  }

  private async extractAndUpdateMetadata(
    bookmarkId: string,
    url: string,
  ): Promise<void> {
    try {
      const metadata =
        await this.metadataExtractionService.extractMetadata(url);

      const bookmark = await this.bookmarkRepository.findOne({
        where: { id: bookmarkId },
      });

      if (bookmark) {
        bookmark.metadata = metadata as Record<string, unknown>;
        // Update title and description if they weren't provided
        if (metadata.title) bookmark.title = metadata.title;
        if (metadata.description) bookmark.description = metadata.description;

        await this.bookmarkRepository.save(bookmark);
      }
    } catch (error) {
      throw new Error(
        `Failed to extract metadata for ${url}: ${(error as Error).message}`,
      );
    }
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

  async delete(id: string, user: User): Promise<DeleteBookmarkResponseDto> {
    await this.bookmarkRepository.delete({ id, user });

    return { id };
  }

  async refreshMetadata(
    id: string,
    user: User,
  ): Promise<RefreshMetadataResponseDto> {
    const bookmark = await this.bookmarkRepository.findOne({
      where: { id, user },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    try {
      const metadata = await this.metadataExtractionService.extractMetadata(
        bookmark.url,
      );

      bookmark.metadata = metadata as Record<string, unknown>;
      if (metadata.title) bookmark.title = metadata.title;
      if (metadata.description) bookmark.description = metadata.description;

      await this.bookmarkRepository.save(bookmark);

      return {
        id,
        success: true,
        message: 'Metadata refreshed successfully',
        metadata: metadata as Record<string, unknown>,
      };
    } catch (error) {
      return {
        id,
        success: false,
        message: `Failed to refresh metadata: ${(error as Error).message}`,
      };
    }
  }

  bulkDelete(
    bulkDeleteDto: BulkDeleteBookmarkRequestDto,
    user: User,
  ): Promise<BulkDeleteBookmarkResponseDto> {
    return this.bulkOperationsService.bulkDelete(bulkDeleteDto, user);
  }

  bulkTag(
    bulkTagDto: BulkTagBookmarkRequestDto,
    user: User,
  ): Promise<BulkTagBookmarkResponseDto> {
    return this.bulkOperationsService.bulkTag(bulkTagDto, user);
  }
}
