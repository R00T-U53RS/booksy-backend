import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';

import {
  buildBatchAggregates,
  type HistoryBatchAggregate,
} from './batch-history.util';
import { BookmarkChangeLogQueryRepository } from './bookmark-change-log-query.repository';
import { BookmarkChangeLog } from './bookmark-change-log.entity';
import { ChangeType } from './enums';
import {
  clampHistoryListLimit,
  MAX_BATCH_PAGE_SIZE,
  MIN_BATCH_PAGE_SIZE,
} from './history-query.constants';

export interface HistoryQueryOptions {
  limit?: number;
  offset?: number;
  changeType?: ChangeType;
  startDate?: Date;
  endDate?: Date;
}

export type { HistoryBatchAggregate } from './batch-history.util';

type HistoryScopeField = 'profileId' | 'bookmarkId';

@Injectable()
export class BookmarkHistoryService {
  constructor(
    @InjectRepository(BookmarkChangeLog)
    private readonly changeLogRepository: Repository<BookmarkChangeLog>,
    private readonly changeLogQueryRepository: BookmarkChangeLogQueryRepository,
  ) {}

  getProfileHistory(
    profileId: string,
    userId: string,
    options: HistoryQueryOptions = {},
  ): Promise<{ changes: BookmarkChangeLog[]; total: number }> {
    return this.runScopedHistoryQuery('profileId', profileId, userId, options);
  }

  getBookmarkHistory(
    bookmarkId: string,
    userId: string,
    options: HistoryQueryOptions = {},
  ): Promise<{ changes: BookmarkChangeLog[]; total: number }> {
    return this.runScopedHistoryQuery(
      'bookmarkId',
      bookmarkId,
      userId,
      options,
    );
  }

  private async runScopedHistoryQuery(
    field: HistoryScopeField,
    value: string,
    userId: string,
    options: HistoryQueryOptions,
  ): Promise<{ changes: BookmarkChangeLog[]; total: number }> {
    const { limit = 50, offset = 0, changeType, startDate, endDate } = options;
    const safeLimit = clampHistoryListLimit(limit);
    const safeOffset = Math.max(0, offset);

    const qb = this.buildHistoryQueryBuilder(field, value, userId, {
      changeType,
      startDate,
      endDate,
    })
      .take(safeLimit)
      .skip(safeOffset);

    const [changes, total] = await qb.getManyAndCount();
    return { changes, total };
  }

  private buildHistoryQueryBuilder(
    field: HistoryScopeField,
    value: string,
    userId: string,
    filters: Pick<HistoryQueryOptions, 'changeType' | 'startDate' | 'endDate'>,
  ): SelectQueryBuilder<BookmarkChangeLog> {
    const { changeType, startDate, endDate } = filters;
    const qb = this.changeLogRepository
      .createQueryBuilder('changeLog')
      .where(`changeLog.${field} = :scopeValue`, { scopeValue: value })
      .andWhere('changeLog.userId = :userId', { userId })
      .orderBy('changeLog.createdAt', 'DESC')
      .addOrderBy('changeLog.version', 'DESC')
      .leftJoinAndSelect('changeLog.bookmark', 'bookmark');

    if (changeType) {
      qb.andWhere('changeLog.changeType = :changeType', { changeType });
    }
    if (startDate) {
      qb.andWhere('changeLog.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('changeLog.createdAt <= :endDate', { endDate });
    }
    return qb;
  }

  /**
   * Paginated list of change batches (non-null sync_batch_id only). Each batch includes full log rows.
   */
  async getBatchedHistory(
    profileId: string,
    userId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<{ batches: HistoryBatchAggregate[]; total: number }> {
    const safeLimit = Math.min(
      MAX_BATCH_PAGE_SIZE,
      Math.max(MIN_BATCH_PAGE_SIZE, limit),
    );
    const safeOffset = Math.max(0, offset);

    const { syncBatchIds, total } =
      await this.changeLogQueryRepository.findBatchIdsPage(
        profileId,
        userId,
        safeLimit,
        safeOffset,
      );

    if (syncBatchIds.length === 0) {
      return { batches: [], total };
    }

    const rows = await this.changeLogRepository.find({
      where: {
        profileId,
        userId,
        syncBatchId: In(syncBatchIds),
      },
      relations: ['bookmark'],
      order: { createdAt: 'ASC', version: 'ASC' },
    });

    const batches = buildBatchAggregates(syncBatchIds, rows);
    return { batches, total };
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
        version: 'ASC',
      },
      relations: ['bookmark'],
    });
  }
}
