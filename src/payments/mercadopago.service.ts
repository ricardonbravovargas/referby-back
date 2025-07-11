import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Preference } from 'mercadopago';

@Injectable()
export class MercadoPagoService {
  private client: MercadoPagoConfig;

  constructor() {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error(
        'MERCADOPAGO_ACCESS_TOKEN is not defined in environment variables',
      );
    }

    this.client = new MercadoPagoConfig({
      accessToken: accessToken,
      options: { timeout: 5000 },
    });
  }

  async createPreference(data: any) {
    const { items, customerInfo, userId, referredBy } = data;

    try {
      const preference = new Preference(this.client);

      // URLs base
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

      console.log('Creating MercadoPago Checkout Pro preference...');
      console.log('Frontend URL:', frontendUrl);
      console.log('Backend URL:', backendUrl);

      // Configuración MÍNIMA para evitar errores
      const preferenceData = {
        items: items.map((item: any) => ({
          id: item.id.toString(),
          title: item.nombre,
          quantity: item.cantidad,
          unit_price: Number(item.precio),
          currency_id: 'USD',
        })),
        payer: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: {
            number: customerInfo.phone || '',
          },
          address: {
            street_name: customerInfo.address,
            city: customerInfo.city,
            zip_code: customerInfo.postalCode || '',
          },
        },
        back_urls: {
          success: `${frontendUrl}/payment/success`,
          failure: `${frontendUrl}/payment/failure`,
          pending: `${frontendUrl}/payment/success`,
        },
        // REMOVEMOS auto_return que está causando problemas
        // auto_return: 'approved',
        external_reference: `order_${userId || 'guest'}_${Date.now()}`,
        metadata: {
          userId: userId || 'guest',
          referredBy: referredBy || '',
          customerEmail: customerInfo.email,
          customerName: customerInfo.name,
        },
        notification_url: `${backendUrl}/payments/mercadopago/webhook`,
        statement_descriptor: 'TIENDA_ONLINE',
      };

      console.log('Preference data:', JSON.stringify(preferenceData, null, 2));

      const result = await preference.create({ body: preferenceData });

      console.log('MercadoPago preference created successfully:', {
        id: result.id,
        init_point: result.init_point,
        sandbox_init_point: result.sandbox_init_point,
      });

      return {
        preferenceId: result.id,
        initPoint: result.init_point,
        sandboxInitPoint: result.sandbox_init_point,
      };
    } catch (error) {
      console.error('Error creating MercadoPago preference:', error);

      // Log detallado del error
      if (error.response) {
        console.error('MercadoPago API Error Response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      }

      if (error.cause) {
        console.error('Error cause:', error.cause);
      }

      throw new Error(`Error creating MercadoPago preference: ${error.message}`);
    }
  }

  async getPaymentInfo(paymentId: string) {
    try {
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Error fetching payment info: ${response.status} ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting payment info:', error);
      throw new Error('Error getting payment info');
    }
  }

  async processWebhook(data: any) {
    try {
      console.log('Processing MercadoPago webhook:', data);

      if (data.type === 'payment') {
        const paymentInfo = await this.getPaymentInfo(data.data.id);

        console.log('Payment info retrieved:', {
          id: paymentInfo.id,
          status: paymentInfo.status,
          amount: paymentInfo.transaction_amount,
          external_reference: paymentInfo.external_reference,
        });

        if (paymentInfo.status === 'approved') {
          const metadata = paymentInfo.metadata;
          const userId = metadata.userId;
          const referredBy = metadata.referredBy;
          const totalAmount = paymentInfo.transaction_amount;

          // Procesar comisión si hay referido
          if (referredBy && userId !== referredBy) {
            const commission = totalAmount * 0.05;
            console.log(
              `Commission registered: ${referredBy} referred ${userId} for $${totalAmount}. Commission: $${commission}`,
            );
            // TODO: Implementar sistema de comisiones
          }

          // Guardar pedido
          await this.saveOrder(
            paymentInfo.id,
            userId,
            paymentInfo.additional_info?.items || [],
            {
              email: metadata.customerEmail,
              name: metadata.customerName,
            },
          );

          return {
            success: true,
            paymentId: paymentInfo.id,
            commission: referredBy ? totalAmount * 0.05 : 0,
          };
        }
      }

      return {
        success: false,
        message: 'Payment not approved or invalid webhook',
      };
    } catch (error) {
      console.error('Error processing MercadoPago webhook:', error);
      throw new Error('Error processing webhook');
    }
  }

  async confirmPayment(data: any) {
    const { paymentId, merchantOrderId, status, items, customerInfo, userId, referredBy } = data;

    try {
      console.log(`MercadoPago payment confirmation: ${paymentId}, status: ${status}`);

      if (status === 'approved') {
        // Obtener información del pago
        const paymentInfo = await this.getPaymentInfo(paymentId);

        if (paymentInfo.status === 'approved') {
          const totalAmount = items.reduce(
            (sum: number, item: any) => sum + item.precio * item.cantidad,
            0,
          );

          // Procesar comisión
          if (referredBy && userId !== referredBy) {
            const commission = totalAmount * 0.05;
            console.log(
              `Commission registered: ${referredBy} referred ${userId} for $${totalAmount}. Commission: $${commission}`,
            );
          }

          // Guardar pedido
          await this.saveOrder(paymentId, userId, items, customerInfo);

          return {
            success: true,
            paymentId,
            amount: paymentInfo.transaction_amount,
            commission: referredBy ? totalAmount * 0.05 : 0,
          };
        }
      }

      throw new Error(`Payment not approved. Status: ${status}`);
    } catch (error) {
      console.error('Error confirming MercadoPago payment:', error);
      throw new Error('Error confirming payment');
    }
  }

  private async saveOrder(
    paymentId: string,
    userId: string,
    items: any[],
    customerInfo: any,
  ) {
    console.log(
      `MercadoPago - Order saved for user ${userId}, payment ${paymentId}`,
    );
    console.log('Items:', items);
    console.log('Customer info:', customerInfo);
    // TODO: Guardar en base de datos
  }
}