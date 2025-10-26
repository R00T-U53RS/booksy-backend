import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { BookmarkSetService } from './bookmark-set.service';

@Controller('bookmark-set')
export class BookmarkSetController {
  constructor(private readonly bookmarkSetService: BookmarkSetService) {}

  @Post()
  create() {
    return this.bookmarkSetService.create();
  }

  @Get()
  findAll() {
    return this.bookmarkSetService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookmarkSetService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string) {
    return this.bookmarkSetService.update(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookmarkSetService.remove(+id);
  }
}
