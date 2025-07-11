// cart/cart.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddToCartDto, UpdateCartItemDto } from '../dtos/cart.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.cartService.getCart(userId);
  }

  @Post('add')
  async addToCart(@Req() req: any, @Body() dto: AddToCartDto) {
    const userId = req.user.id || req.user.sub;
    return this.cartService.addToCart(userId, dto);
  }

  @Put('item/:itemId')
  async updateCartItem(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.cartService.updateCartItem(userId, itemId, dto);
  }

  @Delete('item/:itemId')
  async removeFromCart(@Req() req: any, @Param('itemId') itemId: string) {
    const userId = req.user.id || req.user.sub;
    return this.cartService.removeFromCart(userId, itemId);
  }

  @Delete('clear')
  async clearCart(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    await this.cartService.clearCart(userId);
    return { message: 'Carrito vaciado exitosamente' };
  }
}
