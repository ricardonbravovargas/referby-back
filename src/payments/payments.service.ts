import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { User } from '../entities/user.entity';
import { MailService } from '../mail/mail.service';
import { ReferralsService } from '../referrals/referrals.service';
import { OrderService } from '../order/order.services';
import { ReferralStats } from '../dtos/commission.dto';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
    private readonly referralsService: ReferralsService,
    private readonly orderService: OrderService,
  ) {
    this.initializeStripe();
  }

  private initializeStripe() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    this.logger.log('🔍 Verificando configuración de Stripe...');

    if (!stripeSecretKey) {
      this.logger.error(
        '❌ STRIPE_SECRET_KEY no está definida en las variables de entorno',
      );
      throw new Error(
        'STRIPE_SECRET_KEY is not defined in environment variables',
      );
    }

    if (!stripeSecretKey.startsWith('sk_')) {
      this.logger.error(
        '❌ STRIPE_SECRET_KEY no parece ser una clave válida (debe empezar con sk_)',
      );
      throw new Error('STRIPE_SECRET_KEY appears to be invalid');
    }

    try {
      this.stripe = new Stripe(stripeSecretKey);
      this.logger.log('✅ Stripe inicializado correctamente');
    } catch (error) {
      this.logger.error('❌ Error inicializando Stripe:', error);
      throw new Error('Error initializing Stripe');
    }
  }

  getStripeConfig() {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      this.logger.error('❌ STRIPE_PUBLISHABLE_KEY no está definida');
      throw new Error(
        'STRIPE_PUBLISHABLE_KEY is not defined in environment variables',
      );
    }

    if (!publishableKey.startsWith('pk_')) {
      this.logger.error(
        '❌ STRIPE_PUBLISHABLE_KEY no parece ser válida (debe empezar con pk_)',
      );
      throw new Error('STRIPE_PUBLISHABLE_KEY appears to be invalid');
    }

    return {
      publishableKey,
    };
  }

  async createPaymentIntent(data: any) {
    const { amount, currency, items, customerInfo, userId, referredBy } = data;

    this.logger.log('💳 Creando Payment Intent...', {
      amount: `${amount} centavos ($${(amount / 100).toFixed(2)})`,
      currency,
      itemsCount: items?.length || 0,
      customerEmail: customerInfo?.email,
      hasUserId: !!userId,
      hasReferral: !!referredBy,
    });

    try {
      // Validaciones adicionales
      if (!amount || amount <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }

      if (amount < 50) {
        // Stripe requiere mínimo 50 centavos
        throw new Error('El monto mínimo es $0.50');
      }

      if (!items || items.length === 0) {
        throw new Error('Debe haber al menos un producto');
      }

      if (!customerInfo || !customerInfo.email) {
        throw new Error('Email del cliente es requerido');
      }

      // Crear metadata optimizada (máximo 500 caracteres por campo)
      const itemsSummary = items
        .map((item) => `${item.nombre} x${item.cantidad} ($${item.precio})`)
        .join(', ');

      // Truncar si es muy largo para cumplir límite de Stripe (500 chars)
      const truncatedSummary =
        itemsSummary.length > 450
          ? itemsSummary.substring(0, 447) + '...'
          : itemsSummary;

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount), // Asegurar que sea entero
        currency: currency || 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId: userId || 'guest',
          referredBy: referredBy || '',
          itemsSummary: truncatedSummary,
          itemsCount: items.length.toString(),
          customerEmail: customerInfo.email,
          customerName: customerInfo.name || '',
          totalAmount: (amount / 100).toFixed(2),
        },
        description: `Pedido de ${items.length} producto${items.length > 1 ? 's' : ''} - ${customerInfo.email} - Total: $${(amount / 100).toFixed(2)}`,
      });

      this.logger.log('✅ Payment Intent creado exitosamente:', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        itemsCount: items.length,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error('❌ Error creando payment intent:', {
        error: error.message,
        code: error.code,
        type: error.type,
        requestId: error.requestId,
        amount,
        currency,
      });

      // Re-lanzar con mensaje más descriptivo
      if (error.type === 'StripeCardError') {
        throw new Error(`Error de tarjeta: ${error.message}`);
      } else if (error.type === 'StripeInvalidRequestError') {
        throw new Error(`Solicitud inválida: ${error.message}`);
      } else if (error.type === 'StripeAPIError') {
        throw new Error(`Error de API de Stripe: ${error.message}`);
      } else if (error.type === 'StripeConnectionError') {
        throw new Error('Error de conexión con Stripe');
      } else if (error.type === 'StripeAuthenticationError') {
        throw new Error(
          'Error de autenticación con Stripe - verifica las claves API',
        );
      } else {
        throw new Error(`Error creando payment intent: ${error.message}`);
      }
    }
  }

  async confirmPayment(data: any) {
    const { paymentIntentId, userId, referredBy, items, customerInfo } = data;

    this.logger.log('🔍 Confirmando pago...', {
      paymentIntentId,
      userId: userId || 'guest',
      hasReferral: !!referredBy,
      itemsCount: items?.length || 0,
    });

    try {
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      this.logger.log('📋 Estado del Payment Intent:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: {
          userId: paymentIntent.metadata.userId,
          referredBy: paymentIntent.metadata.referredBy,
          itemsCount: paymentIntent.metadata.itemsCount,
        },
      });

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(
          `Pago no exitoso. Estado actual: ${paymentIntent.status}`,
        );
      }

      // Calcular el monto total del pedido
      const totalAmount = items.reduce(
        (sum: number, item: any) => sum + item.precio * item.cantidad,
        0,
      );

      this.logger.log('💰 Calculando comisiones...', {
        totalAmount,
        referredBy,
        willProcessCommission: !!(referredBy && userId !== referredBy),
      });

      // Si hay un referido, registrar la comisión
      if (referredBy && userId !== referredBy) {
        await this.processReferralCommission(
          referredBy,
          userId,
          totalAmount,
          paymentIntentId,
          customerInfo,
        );
      }

      // 🔥 NUEVA FUNCIONALIDAD: Crear órdenes reales en la base de datos
      await this.orderService.createOrdersFromPayment(
        paymentIntentId,
        userId,
        items,
        customerInfo,
      );

      this.logger.log('✅ Pago confirmado exitosamente');

      return {
        success: true,
        paymentIntentId,
        commission: referredBy ? this.calculateCommission(items) : 0,
      };
    } catch (error) {
      this.logger.error('❌ Error confirmando pago:', error);
      throw new Error(`Error confirmando pago: ${error.message}`);
    }
  }

  private calculateCommission(items: any[]): number {
    const total = items.reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0,
    );
    return total * 0.05; // 5% de comisión
  }

  private async processReferralCommission(
    referredBy: string,
    userId: string,
    totalAmount: number,
    paymentIntentId: string,
    customerInfo: any,
  ) {
    try {
      this.logger.log('🎯 Procesando comisión de referido...', {
        referredBy,
        userId,
        totalAmount,
      });

      // Buscar el usuario que refirió
      const referrer = await this.userRepository.findOne({
        where: { id: referredBy },
      });

      if (referrer) {
        const commission = totalAmount * 0.05; // 5% de comisión

        this.logger.log('✅ Comisión registrada:', {
          referrerId: referredBy,
          referrerEmail: referrer.email,
          referredUserId: userId,
          totalAmount,
          commission,
        });

        console.log(
          `Commission registered: ${referredBy} (${referrer.email}) referred ${userId} for $${totalAmount}. Commission: $${commission}`,
        );

        // Guardar comisión en ReferralsService
        await this.referralsService.createCommission({
          referrerId: referredBy,
          referredUserId: userId,
          referredUserEmail: customerInfo.email,
          referredUserName: customerInfo.name,
          amount: totalAmount,
          commission: commission,
          paymentIntentId: paymentIntentId,
        });

        // Enviar email de notificación al embajador
        await this.sendReferralNotification(
          referrer,
          userId,
          totalAmount,
          commission,
        );
      } else {
        this.logger.warn(
          '⚠️ Referidor no encontrado en la base de datos:',
          referredBy,
        );
      }
    } catch (error) {
      this.logger.error('❌ Error procesando comisión de referido:', error);
      // No lanzar error para no afectar el flujo principal de pago
    }
  }

  private async sendReferralNotification(
    referrer: User,
    referredUserId: string,
    totalAmount: number,
    commission: number,
  ): Promise<void> {
    try {
      this.logger.log('📧 Enviando email de comisión al embajador...', {
        referrerEmail: referrer.email,
        referredUserId,
        totalAmount,
        commission,
      });

      // Buscar información del usuario que compró (opcional)
      let referredUserName = 'un cliente';
      try {
        const referredUser = await this.userRepository.findOne({
          where: { id: referredUserId },
        });
        if (referredUser && referredUser.name) {
          referredUserName = referredUser.name;
        }
      } catch (error) {
        this.logger.warn(
          'No se pudo obtener info del usuario referido:',
          error,
        );
      }

      const subject = 'Nueva comision ganada - Programa de referidos';

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h2 style="color: #28a745; margin: 0;">💰 Nueva Comision Ganada</h2>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
            <p><strong>¡Felicidades ${referrer.name || 'Embajador'}!</strong></p>
            
            <p>Has ganado una nueva comision por referido.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="color: #495057; margin-top: 0;">Detalles de la comision:</h3>
              <p style="margin: 5px 0;"><strong>Monto de compra:</strong> $${totalAmount.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Tu comision (5%):</strong> <span style="color: #28a745; font-weight: bold;">$${commission.toFixed(2)}</span></p>
              <p style="margin: 5px 0;"><strong>Cliente referido:</strong> ${referredUserName}</p>
              <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="color: #1565c0; margin-top: 0;">¿Que sigue?</h3>
              <p style="margin: 5px 0;">• Tu comision se procesara en los proximos dias</p>
              <p style="margin: 5px 0;">• Recibiras una notificacion cuando este disponible</p>
              <p style="margin: 5px 0;">• Sigue compartiendo tus enlaces para ganar mas comisiones</p>
            </div>
            
            <p>Gracias por ser parte de nuestro programa de referidos.</p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
            
            <p style="font-size: 12px; color: #6c757d; text-align: center;">
              Este es un email automatico del sistema de referidos.
            </p>
          </div>
        </div>
      `;

      const text = `
Hola ${referrer.name || 'Embajador'},

Has ganado una nueva comision por referido.

Detalles:
- Monto de compra: $${totalAmount.toFixed(2)}
- Tu comision: $${commission.toFixed(2)}
- Cliente referido: ${referredUserName}
- Fecha: ${new Date().toLocaleDateString('es-ES')}

Tu comision se procesara en los proximos dias.

Gracias por ser parte de nuestro programa de referidos.
      `;

      await this.mailService.sendMail({
        to: referrer.email,
        subject,
        html,
        text,
      });

      this.logger.log('✅ Email de comisión enviado exitosamente', {
        to: referrer.email,
        commission: commission,
      });
    } catch (error) {
      this.logger.error('❌ Error enviando email de comisión:', {
        error: error.message,
        stack: error.stack,
        referrerEmail: referrer.email,
        totalAmount,
        commission,
      });
    }
  }

  async getUserPaymentHistory(userId: string) {
    try {
      this.logger.log(
        `📊 Obteniendo historial de pagos para usuario: ${userId}`,
      );
      return [];
    } catch (error) {
      this.logger.error('❌ Error obteniendo historial de pagos:', error);
      throw new Error('Error getting payment history');
    }
  }

  async getReferralStats(userId: string): Promise<ReferralStats> {
    try {
      return await this.referralsService.getUserStats(userId);
    } catch (error) {
      this.logger.error(
        '❌ Error obteniendo estadísticas de referidos:',
        error,
      );
      throw new Error('Error getting referral statistics');
    }
  }
}
