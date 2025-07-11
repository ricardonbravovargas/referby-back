import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { BannerController } from './banner.controller';
import { BannerService } from './banner.service';
import { Banner } from '../entities/banner.entity';
import { CloudinaryService } from '../producto/cloudinary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Banner]),
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [BannerController],
  providers: [BannerService, CloudinaryService],
  exports: [BannerService],
})
export class BannerModule {}
