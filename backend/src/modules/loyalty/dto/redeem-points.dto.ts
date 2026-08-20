import { IsInt, Min } from 'class-validator';

export class RedeemPointsDto {
  @IsInt()
  @Min(100)
  points: number;
}
