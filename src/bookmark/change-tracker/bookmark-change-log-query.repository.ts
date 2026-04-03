import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BookmarkChangeLog } from './bookmark-change-log.entity';

@Injectable()
export class BookmarkChangeLogQueryRepository {
  constructor(
    @InjectRepository(BookmarkChangeLog)
    private readonly repo: Repository<BookmarkChangeLog>,
  ) {}

  async findBatchIdsPage(
    profileId: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ syncBatchIds: string[]; total: number }> {
    const rows = await this.repo
      .createQueryBuilder('log')
      .select('log.syncBatchId', 'syncBatchId')
      .addSelect('MAX(log.createdAt)', 'maxCreated')
      .addSelect('COUNT(*) OVER ()', 'total')
      .where('log.profileId = :profileId', { profileId })
      .andWhere('log.userId = :userId', { userId })
      .andWhere('log.syncBatchId IS NOT NULL')
      .groupBy('log.syncBatchId')
      .orderBy('MAX(log.createdAt)', 'DESC')
      .limit(limit)
      .offset(offset)
      .getRawMany<{ syncBatchId: string; total: string }>();

    if (rows.length === 0) {
      const totalRow = await this.repo
        .createQueryBuilder('log')
        .select('COUNT(DISTINCT log.syncBatchId)', 'cnt')
        .where('log.profileId = :profileId', { profileId })
        .andWhere('log.userId = :userId', { userId })
        .andWhere('log.syncBatchId IS NOT NULL')
        .getRawOne<{ cnt: string }>();
      return {
        syncBatchIds: [],
        total: Number(totalRow?.cnt ?? 0),
      };
    }

    const total = Number(rows[0]?.total ?? 0);
    const syncBatchIds = rows
      .map(r => r.syncBatchId)
      .filter((id): id is string => id != null && id !== '');

    return { syncBatchIds, total };
  }
}
