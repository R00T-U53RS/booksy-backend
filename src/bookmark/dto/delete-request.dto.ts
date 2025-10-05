import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteBookmarkDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}
