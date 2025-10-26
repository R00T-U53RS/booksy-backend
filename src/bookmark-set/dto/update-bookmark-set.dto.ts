import { PartialType } from '@nestjs/mapped-types';

import { CreateBookmarkSetDto } from './create-bookmark-set.dto';

export class UpdateBookmarkSetDto extends PartialType(CreateBookmarkSetDto) {}
