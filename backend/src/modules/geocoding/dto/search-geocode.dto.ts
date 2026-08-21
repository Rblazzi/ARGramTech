import { IsString, MinLength } from 'class-validator';

export class SearchGeocodeDto {
  @IsString()
  @MinLength(3)
  q: string;
}
