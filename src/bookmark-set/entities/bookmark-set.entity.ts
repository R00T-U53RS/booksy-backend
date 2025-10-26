import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Bookmark } from '../../bookmark/entity/bookmark.entity';
import { User } from '../../users/entities/user.entity';

@Entity('bookmark_sets')
export class BookmarkSet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.bookmarkSets, {
    nullable: false,
  })
  user: User;

  @OneToMany(() => Bookmark, bookmark => bookmark.bookmarkSet)
  bookmarks: Bookmark[];
}
