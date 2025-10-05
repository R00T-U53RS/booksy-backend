import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class DeleteBookmarkResponseDto {
  @Expose()
  id: string;
}
