import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { User } from './entities/user.entity';
import { Empresa } from './entities/empresa.entitiy';
import { Producto } from './entities/producto.entitiy';
import { Vendedor } from './entities/vendedor.entiity';
import { Orden } from './entities/orden.entiity';
import { CoreModule } from './core/core.module';
import { ProductoVendedor } from './entities/Producto-Vendedor.entiity';
import { VendedorModule } from './vendedor/vendedor.module';
import { ProductoModule } from './producto/producto.module';
import { CartModule } from './cart/cart.module';
import { PaymentsModule } from './payments/payments.module';
import { ReferralsModule } from './referrals/referrals.module';
import { MailModule } from './mail/mail.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// Import new referral entities
import {
  Referral,
  ReferralShortCode,
  SharedCartLink,
} from './entities/referral.entity';
import { AnalyticsModule } from './analytics/analytics-module';
import { BannerModule } from './banner/banner.module';
import { AutomatedEmailsModule } from './mail/automatico/automated-emails.module';
import { EmpresaAnalyticsModule } from './empresa/empresa-analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // carga variables .env

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      // host: process.env.DB_HOST,
      // port: Number.parseInt(process.env.DB_PORT || '5432'),
      // username: process.env.DB_USERNAME,
      // password: process.env.DB_PASSWORD,
      // database: process.env.DB_NAME,
      autoLoadEntities: true,
      entities: [
        User,
        Empresa,
        Producto,
        Vendedor,
        Orden,
        ProductoVendedor,
        // Add new referral entities
        Referral,
        ReferralShortCode,
        SharedCartLink,
      ],
      synchronize: true,
      logging: false,
      dropSchema: false,
    }),
    AuthModule,
    CoreModule,
    VendedorModule,
    ProductoModule,
    CartModule,
    PaymentsModule,
    ReferralsModule,
    MailModule,
    AnalyticsModule,
    BannerModule,
    AutomatedEmailsModule,
    EmpresaAnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
