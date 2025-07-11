import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MercadoPagoService } from './mercadopago.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { MailService } from 'src/mail/mail.service';
import { MailModule } from 'src/mail/mail.module';
import { ReferralsModule } from 'src/referrals/referrals.module';
import { Empresa } from 'src/entities/empresa.entitiy';
import { AutomatedEmailsModule } from 'src/mail/automatico/automated-emails.module';
import { Vendedor } from 'src/entities/vendedor.entiity';
import { Orden } from 'src/entities/orden.entiity';
import { OrderService } from 'src/order/order.services';
import { Producto } from 'src/entities/producto.entitiy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Empresa, Vendedor, Orden, Producto]),
    AuthModule,
    MailModule,
    ReferralsModule,
    AutomatedEmailsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MercadoPagoService, MailService, OrderService],
  exports: [PaymentsService, MercadoPagoService, OrderService],
})
export class PaymentsModule {}
