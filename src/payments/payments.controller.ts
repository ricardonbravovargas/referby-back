import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MailService } from '../mail/mail.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Obtener configuración pública de Stripe
   */
  @Get('config')
  getStripeConfig() {
    try {
      this.logger.log('📋 Obteniendo configuración de Stripe...');
      const config = this.paymentsService.getStripeConfig();
      this.logger.log('✅ Configuración obtenida exitosamente');
      return config;
    } catch (error) {
      this.logger.error('❌ Error obteniendo configuración:', error);
      throw new HttpException(
        'Error obteniendo configuración de pagos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Crear Payment Intent para Stripe
   */
  @Post('create-payment-intent')
  async createPaymentIntent(@Body() paymentData: any, @Request() req?: any) {
    try {
      this.logger.log('💳 Solicitud de Payment Intent recibida:', {
        amount: paymentData.amount,
        currency: paymentData.currency,
        itemsCount: paymentData.items?.length || 0,
        customerEmail: paymentData.customerInfo?.email,
        hasUser: !!req?.user,
        hasReferral: !!paymentData.referredBy,
      });

      // Validaciones básicas
      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new HttpException(
          'El monto debe ser mayor a 0',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!paymentData.items || paymentData.items.length === 0) {
        throw new HttpException(
          'Debe incluir al menos un producto',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!paymentData.customerInfo || !paymentData.customerInfo.email) {
        throw new HttpException(
          'Información del cliente es requerida',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Agregar userId si está autenticado
      const enrichedData = {
        ...paymentData,
        userId: req?.user?.id || null,
      };

      const result =
        await this.paymentsService.createPaymentIntent(enrichedData);

      this.logger.log('✅ Payment Intent creado exitosamente');
      return result;
    } catch (error) {
      this.logger.error('❌ Error creando Payment Intent:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Error creando payment intent',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Confirmar pago exitoso y enviar emails
   */
  @Post('confirm-payment')
  async confirmPayment(@Body() confirmData: any, @Request() req?: any) {
    try {
      this.logger.log('🔍 Confirmando pago y procesando notificaciones...', {
        paymentIntentId: confirmData.paymentIntentId,
        userId: confirmData.userId || req?.user?.id,
        hasReferral: !!confirmData.referredBy,
        itemsCount: confirmData.items?.length || 0,
      });

      // Validaciones
      if (!confirmData.paymentIntentId) {
        throw new HttpException(
          'Payment Intent ID es requerido',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!confirmData.items || confirmData.items.length === 0) {
        throw new HttpException(
          'Items del pedido son requeridos',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!confirmData.customerInfo) {
        throw new HttpException(
          'Información del cliente es requerida',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Enriquecer datos con información del usuario autenticado
      const enrichedData = {
        ...confirmData,
        userId: confirmData.userId || req?.user?.id || null,
      };

      // 1. Confirmar pago y procesar comisiones (tu lógica existente)
      const paymentResult =
        await this.paymentsService.confirmPayment(enrichedData);

      // 2. NUEVO: Procesar notificaciones a empresarios con dirección completa
      await this.processCompanyNotifications(
        confirmData.items,
        confirmData.customerInfo,
        confirmData.paymentIntentId,
      );

      this.logger.log('✅ Pago confirmado y notificaciones enviadas');
      return {
        ...paymentResult,
        success: true,
        message: 'Pago procesado exitosamente',
      };
    } catch (error) {
      this.logger.error('❌ Error confirmando pago:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Error confirmando pago',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * MEJORADO: Procesar notificaciones a empresarios con información completa de envío
   */
  private async processCompanyNotifications(
    items: any[],
    customerInfo: any,
    orderId: string,
  ) {
    try {
      this.logger.log('📧 Procesando notificaciones a empresarios...', {
        itemsCount: items.length,
        customerEmail: customerInfo.email,
        customerAddress: customerInfo.address,
        customerCity: customerInfo.city,
        orderId,
      });

      // Agrupar productos por empresa
      const productsByCompany = new Map();

      items.forEach((item) => {
        const companyId = item.empresa?.id || 'sin-empresa';
        const companyEmail = item.empresa?.email;
        const companyName = item.empresa?.nombre || 'Empresa';

        // Solo procesar si la empresa tiene email
        if (companyEmail) {
          if (!productsByCompany.has(companyId)) {
            productsByCompany.set(companyId, {
              company: {
                id: companyId,
                name: companyName,
                email: companyEmail,
              },
              products: [],
              total: 0,
            });
          }

          const companyData = productsByCompany.get(companyId);
          companyData.products.push({
            name: item.nombre,
            quantity: item.cantidad,
            price: item.precio,
            subtotal: item.precio * item.cantidad,
          });
          companyData.total += item.precio * item.cantidad;
        }
      });

      this.logger.log(
        `📊 Se encontraron ${productsByCompany.size} empresas para notificar`,
      );

      // Enviar emails a cada empresa con información completa de envío
      const emailPromises = Array.from(productsByCompany.values()).map(
        async (companyData) => {
          try {
            await this.mailService.sendCompanyOrderNotification(
              companyData.company.email,
              companyData.company.name,
              {
                customerName: customerInfo.name,
                customerEmail: customerInfo.email,
                customerAddress: customerInfo.address || 'No especificada',
                customerCity: customerInfo.city || 'No especificada',
                customerPhone: customerInfo.phone || 'No especificado',
                products: companyData.products,
                totalAmount: companyData.total,
                orderId: orderId,
              },
            );

            this.logger.log(
              `✅ Email enviado a empresa: ${companyData.company.name} (${companyData.company.email})`,
            );
          } catch (emailError) {
            this.logger.warn(
              `⚠️ No se pudo enviar email a empresa ${companyData.company.name}:`,
              emailError.message,
            );
            // No lanzar error para no afectar el flujo principal
          }
        },
      );

      // Esperar a que todos los emails se envíen (o fallen)
      await Promise.allSettled(emailPromises);

      this.logger.log('📧 Notificaciones a empresarios procesadas');
    } catch (error) {
      this.logger.error(
        '❌ Error procesando notificaciones a empresarios:',
        error,
      );
      // No lanzar error para no afectar el flujo principal de pago
    }
  }

  /**
   * Obtener estadísticas de referidos (requiere autenticación)
   */
  @Get('referral-stats')
  @UseGuards(JwtAuthGuard)
  async getReferralStats(@Request() req, @Query('userId') userId?: string) {
    try {
      const targetUserId = userId || req.user.id;

      this.logger.log('📊 Obteniendo estadísticas de referidos:', {
        requestedBy: req.user.id,
        targetUserId,
      });

      const stats = await this.paymentsService.getReferralStats(targetUserId);

      return {
        success: true,
        ...stats,
      };
    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas:', error);
      throw new HttpException(
        'Error obteniendo estadísticas de referidos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener historial de pagos del usuario (requiere autenticación)
   */
  @Get('payment-history')
  @UseGuards(JwtAuthGuard)
  async getPaymentHistory(@Request() req) {
    try {
      this.logger.log('📋 Obteniendo historial de pagos:', {
        userId: req.user.id,
      });

      const history = await this.paymentsService.getUserPaymentHistory(
        req.user.id,
      );

      return {
        success: true,
        payments: history,
      };
    } catch (error) {
      this.logger.error('❌ Error obteniendo historial:', error);
      throw new HttpException(
        'Error obteniendo historial de pagos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * NUEVO: Endpoint para probar el sistema de emails (solo desarrollo)
   */
  @Post('test-company-email')
  async testCompanyEmail(@Body() testData: any) {
    try {
      // Solo permitir en desarrollo
      if (process.env.NODE_ENV === 'production') {
        throw new HttpException(
          'Endpoint solo disponible en desarrollo',
          HttpStatus.FORBIDDEN,
        );
      }

      this.logger.log('🧪 Probando email de empresa...');

      const mockOrderDetails = {
        customerName: testData.customerName || 'Cliente de Prueba',
        customerEmail: testData.customerEmail || 'cliente@test.com',
        customerAddress: testData.customerAddress || 'Av. Corrientes 1234',
        customerCity: testData.customerCity || 'Buenos Aires',
        customerPhone: testData.customerPhone || '+54911234567',
        products: testData.products || [
          {
            name: 'Producto de Prueba',
            quantity: 1,
            price: 29.99,
          },
        ],
        totalAmount: testData.totalAmount || 29.99,
        orderId: testData.orderId || 'TEST-' + Date.now(),
      };

      await this.mailService.sendCompanyOrderNotification(
        testData.companyEmail,
        testData.companyName || 'Empresa de Prueba',
        mockOrderDetails,
      );

      return {
        success: true,
        message: 'Email de prueba enviado exitosamente',
        sentTo: testData.companyEmail,
      };
    } catch (error) {
      this.logger.error('❌ Error enviando email de prueba:', error);
      throw new HttpException(
        error.message || 'Error enviando email de prueba',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * NUEVO: Endpoint para envío manual de email de empresa (para casos especiales)
   */
  @Post('manual-company-notification')
  @UseGuards(JwtAuthGuard)
  async sendManualCompanyNotification(
    @Body() notificationData: any,
    @Request() req,
  ) {
    try {
      // Solo admins pueden usar este endpoint
      if (req.user.role !== 'admin' && req.user.rol !== 'admin') {
        throw new HttpException(
          'Solo administradores pueden enviar notificaciones manuales',
          HttpStatus.FORBIDDEN,
        );
      }

      this.logger.log('📧 Enviando notificación manual a empresa...', {
        companyEmail: notificationData.companyEmail,
        adminUser: req.user.id,
      });

      await this.mailService.sendCompanyOrderNotification(
        notificationData.companyEmail,
        notificationData.companyName,
        notificationData.orderDetails,
      );

      return {
        success: true,
        message: 'Notificación enviada exitosamente',
        sentTo: notificationData.companyEmail,
        sentBy: req.user.email,
      };
    } catch (error) {
      this.logger.error('❌ Error enviando notificación manual:', error);
      throw new HttpException(
        error.message || 'Error enviando notificación manual',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
