import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BookmarkChangeLog } from './bookmark-change-log.entity';
import { ChangeType } from './enums';

export interface HistoryQueryOptions {
  limit?: number;
  offset?: number;
  changeType?: ChangeType;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class BookmarkHistoryService {
  constructor(
    @InjectRepository(BookmarkChangeLog)
    private readonly changeLogRepository: Repository<BookmarkChangeLog>,
  ) {}

  /**
   * Get recent changes for a profile (activity feed)
   */
  async getRecentChanges(
    profileId: string,
    userId: string,
    limit: number = 50,
  ): Promise<{ changes: BookmarkChangeLog[]; total: number }> {
    const [changes, total] = await this.changeLogRepository.findAndCount({
      where: {
        profileId,
        userId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      relations: ['bookmark'],
    });

    return { changes, total };
  }

  /**
   * Get all changes for a profile with optional filters
   */
  async getProfileHistory(
    profileId: string,
    userId: string,
    options: HistoryQueryOptions = {},
  ): Promise<{ changes: BookmarkChangeLog[]; total: number }> {
    const { limit = 50, offset = 0, changeType, startDate, endDate } = options;

    const queryBuilder = this.changeLogRepository
      .createQueryBuilder('changeLog')
      .where('changeLog.profileId = :profileId', { profileId })
      .andWhere('changeLog.userId = :userId', { userId })
      .orderBy('changeLog.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .leftJoinAndSelect('changeLog.bookmark', 'bookmark');

    if (changeType) {
      queryBuilder.andWhere('changeLog.changeType = :changeType', {
        changeType,
      });
    }

    if (startDate) {
      queryBuilder.andWhere('changeLog.createdAt >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      queryBuilder.andWhere('changeLog.createdAt <= :endDate', { endDate });
    }

    const [changes, total] = await queryBuilder.getManyAndCount();

    return { changes, total };
  }

  /**
   * Get all changes for a specific bookmark
   */
  async getBookmarkHistory(
    bookmarkId: string,
    userId: string,
    options: HistoryQueryOptions = {},
  ): Promise<{ changes: BookmarkChangeLog[]; total: number }> {
    const { limit = 50, offset = 0, changeType, startDate, endDate } = options;

    const queryBuilder = this.changeLogRepository
      .createQueryBuilder('changeLog')
      .where('changeLog.bookmarkId = :bookmarkId', { bookmarkId })
      .andWhere('changeLog.userId = :userId', { userId })
      .orderBy('changeLog.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .leftJoinAndSelect('changeLog.bookmark', 'bookmark');

    if (changeType) {
      queryBuilder.andWhere('changeLog.changeType = :changeType', {
        changeType,
      });
    }

    if (startDate) {
      queryBuilder.andWhere('changeLog.createdAt >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      queryBuilder.andWhere('changeLog.createdAt <= :endDate', { endDate });
    }

    const [changes, total] = await queryBuilder.getManyAndCount();

    return { changes, total };
  }

  /**
   * Get changes by sync batch
   */
  getSyncBatchHistory(
    syncBatchId: string,
    userId: string,
  ): Promise<BookmarkChangeLog[]> {
    return this.changeLogRepository.find({
      where: {
        syncBatchId,
        userId,
      },
      order: {
        createdAt: 'ASC',
      },
      relations: ['bookmark'],
    });
  }
}
