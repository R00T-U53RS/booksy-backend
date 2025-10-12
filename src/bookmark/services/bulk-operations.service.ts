import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { BulkDeleteBookmarkRequestDto } from '../dto/bulk-delete-request.dto';
import { BulkDeleteBookmarkResponseDto } from '../dto/bulk-delete-response.dto';
import { BulkTagBookmarkRequestDto } from '../dto/bulk-tag-request.dto';
import { BulkTagBookmarkResponseDto } from '../dto/bulk-tag-response.dto';
import { Bookmark } from '../entity/bookmark.entity';

@Injectable()
export class BulkOperationsService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
  ) {}

  async bulkDelete(
    bulkDeleteDto: BulkDeleteBookmarkRequestDto,
    user: User,
  ): Promise<BulkDeleteBookmarkResponseDto> {
    const { ids } = bulkDeleteDto;
    const deletedIds: string[] = [];
    const failedIds: string[] = [];

    for (const id of ids) {
      try {
        const result = await this.bookmarkRepository.delete({ id, user });
        if (result.affected && result.affected > 0) {
          deletedIds.push(id);
        } else {
          failedIds.push(id);
        }
      } catch (_error) {
        failedIds.push(id);
      }
    }

    return {
      deletedIds,
      failedIds,
      totalDeleted: deletedIds.length,
      totalFailed: failedIds.length,
      success: failedIds.length === 0,
      message:
        failedIds.length === 0
          ? `Successfully deleted ${deletedIds.length} bookmarks`
          : `Deleted ${deletedIds.length} bookmarks, failed to delete ${failedIds.length} bookmarks`,
    };
  }

  async bulkTag(
    bulkTagDto: BulkTagBookmarkRequestDto,
    user: User,
  ): Promise<BulkTagBookmarkResponseDto> {
    const { ids, tagsToAdd, tagsToRemove, tagsToSet } = bulkTagDto;
    const updatedIds: string[] = [];
    const failedIds: string[] = [];
    const operation = this.determineTagOperation(
      tagsToAdd,
      tagsToRemove,
      tagsToSet,
    );

    for (const id of ids) {
      try {
        const success = await this.updateBookmarkTags(
          id,
          user,
          operation,
          bulkTagDto,
        );
        if (success) {
          updatedIds.push(id);
        } else {
          failedIds.push(id);
        }
      } catch (_error) {
        failedIds.push(id);
      }
    }

    return {
      updatedIds,
      failedIds,
      totalUpdated: updatedIds.length,
      totalFailed: failedIds.length,
      success: failedIds.length === 0,
      message:
        failedIds.length === 0
          ? `Successfully updated tags for ${updatedIds.length} bookmarks`
          : `Updated tags for ${updatedIds.length} bookmarks, failed to update ${failedIds.length} bookmarks`,
      operation,
    };
  }

  private determineTagOperation(
    tagsToAdd?: string[],
    tagsToRemove?: string[],
    tagsToSet?: string[],
  ): 'add' | 'remove' | 'set' {
    if (tagsToSet && tagsToSet.length > 0) {
      return 'set';
    }
    if (tagsToAdd && tagsToAdd.length > 0) {
      return 'add';
    }
    if (tagsToRemove && tagsToRemove.length > 0) {
      return 'remove';
    }
    return 'set';
  }

  private async updateBookmarkTags(
    id: string,
    user: User,
    operation: 'add' | 'remove' | 'set',
    bulkTagDto: BulkTagBookmarkRequestDto,
  ): Promise<boolean> {
    const bookmark = await this.bookmarkRepository.findOne({
      where: { id, user },
    });

    if (!bookmark) {
      return false;
    }

    const currentTags = this.getCurrentTags(bookmark.tags);
    const newTags = this.calculateNewTags(currentTags, operation, bulkTagDto);

    await this.bookmarkRepository.update(id, {
      tags: newTags.join(','),
    });

    return true;
  }

  private getCurrentTags(tags?: string): string[] {
    if (!tags) return [];
    return tags.split(',').filter(tag => tag.trim() !== '');
  }

  private calculateNewTags(
    currentTags: string[],
    operation: 'add' | 'remove' | 'set',
    bulkTagDto: BulkTagBookmarkRequestDto,
  ): string[] {
    const { tagsToAdd, tagsToRemove, tagsToSet } = bulkTagDto;

    switch (operation) {
      case 'set':
        return tagsToSet ?? [];
      case 'add':
        return [...new Set([...currentTags, ...(tagsToAdd ?? [])])];
      case 'remove':
        return currentTags.filter(tag => !tagsToRemove?.includes(tag));
      default:
        return currentTags;
    }
  }
}
