// dtos/cart.dto.ts
import { IsUUID, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsUUID()
  referredBy?: string;
}

export class UpdateCartItemDto {
  @IsNumber()
  @Min(0)
  cantidad: number;
}

export class CreateReferralDto {
  @IsUUID()
  referredUserId: string;

  @IsString()
  orderId: string;

  @IsNumber()
  @Min(0)
  commission: number;
}