import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaAnalyticsController } from './empresa-analytics.controller';
import { EmpresaAnalyticsService } from './empresa-analytics.service';
import { User } from '../entities/user.entity';
import { Empresa } from '../entities/empresa.entitiy';
import { Producto } from '../entities/producto.entitiy';
import { Vendedor } from '../entities/vendedor.entiity';
import { Orden } from '../entities/orden.entiity';
import { ProductoVendedor } from '../entities/Producto-Vendedor.entiity';
import { Referral } from '../entities/referral.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Empresa,
      Producto,
      Vendedor,
      Orden,
      ProductoVendedor,
      Referral,
    ]),
  ],
  controllers: [EmpresaAnalyticsController],
  providers: [EmpresaAnalyticsService],
  exports: [EmpresaAnalyticsService],
})
export class EmpresaAnalyticsModule {}
