import { Injectable } from '@nestjs/common';

@Injectable()
export class BookmarkSetService {
  create() {
    return 'This action adds a new bookmarkSet';
  }

  findAll() {
    return `This action returns all bookmarkSet`;
  }

  findOne(id: number) {
    return `This action returns a #${id} bookmarkSet`;
  }

  update(id: number) {
    return `This action updates a #${id} bookmarkSet`;
  }

  remove(id: number) {
    return `This action removes a #${id} bookmarkSet`;
  }
}
