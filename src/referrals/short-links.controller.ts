import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';

@Controller('short-links')
export class ShortLinksController {
  private readonly logger = new Logger(ShortLinksController.name);

  constructor(private readonly referralsService: ReferralsService) {}

  @Post('shared-cart')
  async createSharedCartLink(
    @Body() body: { shortCode?: string; userId: string; cartData: any[] },
  ) {
    try {
      this.logger.log('🛒 Creando enlace de carrito compartido:', {
        userId: body.userId,
        itemCount: body.cartData?.length || 0,
        shortCode: body.shortCode,
      });

      const { userId, cartData, shortCode } = body;

      if (!userId || !cartData) {
        throw new HttpException(
          'User ID and cart data are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const code = await this.referralsService.createSharedCartLink(
        userId,
        cartData,
        shortCode,
      );

      return { shortCode: code };
    } catch (error) {
      this.logger.error('❌ Error creando enlace de carrito:', error);

      throw new HttpException(
        {
          message: 'Error creating shared cart link',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('resolve/:code')
  async resolveSharedCartLink(@Param('code') code: string) {
    try {
      this.logger.log(`🔍 Resolviendo enlace de carrito: ${code}`);

      const result = await this.referralsService.resolveSharedCartLink(code);

      return result;
    } catch (error) {
      this.logger.error('❌ Error resolviendo enlace de carrito:', error);

      throw new HttpException(
        {
          message: 'Shared cart link not found',
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
