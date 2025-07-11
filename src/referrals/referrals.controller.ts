import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
export class ReferralsController {
  private readonly logger = new Logger(ReferralsController.name);

  constructor(private readonly referralsService: ReferralsService) {}

  @Get('commissions/:userId')
  async getUserCommissions(@Param('userId') userId: string) {
    try {
      this.logger.log(`📊 Obteniendo comisiones para usuario: ${userId}`);

      if (!userId) {
        throw new HttpException(
          {
            message: 'User ID is required',
            received: userId,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.referralsService.getUserCommissions(userId);

      this.logger.log(
        `✅ Comisiones obtenidas: ${result.commissions.length} registros`,
      );

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('❌ Error obteniendo comisiones:', {
        message: error.message,
        userId,
      });

      throw new HttpException(
        {
          message: 'Error getting user commissions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // NUEVO: Endpoint compatible con frontend que usa query params
  @Get('stats')
  async getUserStatsQuery(@Query('userId') userId: string) {
    try {
      this.logger.log(
        `📈 Obteniendo estadísticas para usuario (query): ${userId}`,
      );

      if (!userId) {
        throw new HttpException(
          {
            message: 'User ID is required in query params',
            received: userId,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const stats = await this.referralsService.getUserStats(userId);

      this.logger.log('✅ Estadísticas obtenidas exitosamente');

      return stats;
    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas (query):', error);

      throw new HttpException(
        {
          message: 'Error getting user stats',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats/:userId')
  async getUserStats(@Param('userId') userId: string) {
    try {
      this.logger.log(`📈 Obteniendo estadísticas para usuario: ${userId}`);

      const stats = await this.referralsService.getUserStats(userId);

      this.logger.log('✅ Estadísticas obtenidas exitosamente');

      return stats;
    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas:', error);

      throw new HttpException(
        {
          message: 'Error getting user stats',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // NUEVO: Obtener código corto existente
  @Get('short-code/:userId')
  async getShortCode(@Param('userId') userId: string) {
    try {
      this.logger.log(`🔗 Obteniendo código corto para usuario: ${userId}`);

      const shortCode =
        await this.referralsService.getOrCreateShortCode(userId);

      return { shortCode };
    } catch (error) {
      this.logger.error('❌ Error obteniendo código corto:', error);

      throw new HttpException(
        {
          message: 'Error getting short code',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // NUEVO: Crear código corto
  @Post('create-short-code')
  async createShortCode(@Body() body: { userId: string; shortCode?: string }) {
    try {
      this.logger.log('🔗 Creando código corto:', body);

      const { userId, shortCode } = body;

      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      let result: string;
      if (shortCode) {
        result = await this.referralsService.createSpecificShortCode(
          userId,
          shortCode,
        );
      } else {
        result = await this.referralsService.getOrCreateShortCode(userId);
      }

      return { shortCode: result };
    } catch (error) {
      this.logger.error('❌ Error creando código corto:', error);

      throw new HttpException(
        {
          message: 'Error creating short code',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // NUEVO: Resolver código de referido
  @Get('resolve/:code')
  async resolveReferralCode(@Param('code') code: string) {
    try {
      this.logger.log(`🔍 Resolviendo código de referido: ${code}`);

      const result = await this.referralsService.resolveReferralCode(code);

      return result;
    } catch (error) {
      this.logger.error('❌ Error resolviendo código:', error);

      throw new HttpException(
        {
          message: 'Referral code not found',
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post('commission')
  async createCommission(@Body() commissionData: any) {
    try {
      this.logger.log('💰 Creando nueva comisión...', {
        referrerId: commissionData.referrerId,
        amount: commissionData.amount,
        commission: commissionData.commission,
      });

      const result =
        await this.referralsService.createCommission(commissionData);

      this.logger.log('✅ Comisión creada exitosamente');

      return result;
    } catch (error) {
      this.logger.error('❌ Error creando comisión:', error);

      throw new HttpException(
        {
          message: 'Error creating commission',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // NUEVO: Marcar comisión como pagada
  @Post('mark-paid/:commissionId')
  async markCommissionAsPaid(@Param('commissionId') commissionId: string) {
    try {
      this.logger.log(`💰 Marcando comisión como pagada: ${commissionId}`);

      const result =
        await this.referralsService.markCommissionAsPaid(commissionId);

      return result;
    } catch (error) {
      this.logger.error('❌ Error marcando comisión como pagada:', error);

      throw new HttpException(
        {
          message: 'Error marking commission as paid',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // NUEVO: Obtener todas las comisiones (admin)
  @Get('all-commissions')
  async getAllCommissions() {
    try {
      this.logger.log('📊 Obteniendo todas las comisiones');

      const commissions = await this.referralsService.getAllCommissions();

      return { commissions };
    } catch (error) {
      this.logger.error('❌ Error obteniendo todas las comisiones:', error);

      throw new HttpException(
        {
          message: 'Error getting all commissions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
