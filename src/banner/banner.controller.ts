import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannerService } from './banner.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { UserRole } from '../auth/roles.enum';
import { Express } from 'express';
import { CreateBannerDto } from '../dtos/create-banner.dto';
import { UpdateBannerDto } from '../dtos/update-banner.dto';

@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  // Obtener banners activos (público)
  @Get('active')
  async getActiveBanners() {
    return this.bannerService.getActiveBanners();
  }

  // Obtener todos los banners (solo admin)
  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllBanners(@Req() req: any) {
    const userRole = (req.user.rol || req.user.role || '').toLowerCase();
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo los administradores pueden ver todos los banners',
      );
    }
    return this.bannerService.getAllBanners();
  }

  // Crear nuevo banner (solo admin)
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async createBanner(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateBannerDto,
  ) {
    const userRole = (req.user.rol || req.user.role || '').toLowerCase();
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo los administradores pueden crear banners',
      );
    }

    return this.bannerService.createBanner(dto, file);
  }

  // Obtener banner por ID
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getBannerById(@Param('id') id: string) {
    return this.bannerService.getBannerById(id);
  }

  // Actualizar banner (solo admin)
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async updateBanner(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('data') dataString: string, // Cambiado para recibir el string JSON
  ) {
    const userRole = (req.user.rol || req.user.role || '').toLowerCase();
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo los administradores pueden actualizar banners',
      );
    }

    // Parsear el string JSON a DTO
    let dto: UpdateBannerDto;
    try {
      dto = JSON.parse(dataString);
    } catch (error) {
      throw new BadRequestException('Formato de datos inválido');
    }

    return this.bannerService.updateBanner(id, dto, file);
  }

  // Eliminar banner (solo admin)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteBanner(@Param('id') id: string, @Req() req: any) {
    const userRole = (req.user.rol || req.user.role || '').toLowerCase();
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo los administradores pueden eliminar banners',
      );
    }

    return this.bannerService.deleteBanner(id);
  }

  // Cambiar estado del banner (solo admin)
  @Put(':id/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleBannerStatus(@Param('id') id: string, @Req() req: any) {
    const userRole = (req.user.rol || req.user.role || '').toLowerCase();
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo los administradores pueden cambiar el estado de banners',
      );
    }

    return this.bannerService.toggleBannerStatus(id);
  }

  // Reordenar banners (solo admin)
  @Put('reorder')
  @UseGuards(JwtAuthGuard)
  async reorderBanners(
    @Body() bannerOrders: { id: string; order: number }[],
    @Req() req: any,
  ) {
    const userRole = (req.user.rol || req.user.role || '').toLowerCase();
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo los administradores pueden reordenar banners',
      );
    }

    return this.bannerService.reorderBanners(bannerOrders);
  }
}
