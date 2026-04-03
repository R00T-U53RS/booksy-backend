import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Profile } from '../../profile/entities/profile.entity';
import { User } from '../../users/entities/user.entity';
import { Bookmark } from '../entity/bookmark.entity';

import { ChangeSource, ChangeType, FieldChange } from './enums';
import type { BookmarkValuesSnapshot } from './types';

@Entity('bookmark_change_logs')
@Index(['bookmarkId'])
@Index(['userId'])
@Index(['profileId'])
@Index(['syncBatchId'])
@Index(['createdAt'])
@Index(['bookmarkId', 'createdAt'])
@Index(['changeType'])
@Index(['source'])
@Index(['bookmarkId', 'changeType'])
@Index(['bookmarkId', 'version'], { unique: true })
export class BookmarkChangeLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Bookmark, { nullable: false, onDelete: 'CASCADE' })
  bookmark: Bookmark;

  @Column()
  bookmarkId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'enum', enum: ChangeType })
  changeType: ChangeType;

  @Column({ type: 'enum', enum: ChangeSource })
  source: ChangeSource;

  @Column({ type: 'jsonb', nullable: true })
  fieldChanges?: FieldChange[] | null;

  @Column({ type: 'jsonb', nullable: true })
  oldValues?: BookmarkValuesSnapshot;

  @Column({ type: 'jsonb', nullable: true })
  newValues?: BookmarkValuesSnapshot;

  // User who made the change
  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Column()
  userId: string;

  // Profile context
  @ManyToOne(() => Profile, { nullable: false })
  profile: Profile;

  @Column()
  profileId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'uuid', nullable: true })
  syncBatchId?: string | null;
}
