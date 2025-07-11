import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from '../entities/banner.entity';
import { CloudinaryService } from '../producto/cloudinary.service';
import { CreateBannerDto } from '../dtos/create-banner.dto';
import { Express } from 'express';
import { UpdateBannerDto } from 'src/dtos/update-banner.dto';

// Interfaces locales (renombradas para evitar conflicto)

interface BannerUpdateDto {
  title?: string;
  description?: string;
  linkUrl?: string;
  order?: number;
  isActive?: boolean;
}

interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Obtener todos los banners activos (público)
  async getActiveBanners(): Promise<Banner[]> {
    return this.bannerRepository.find({
      where: { isActive: true },
      order: { order: 'ASC', createdAt: 'DESC' },
    });
  }

  // Obtener todos los banners (solo admin)
  async getAllBanners(): Promise<Banner[]> {
    return this.bannerRepository.find({
      order: { order: 'ASC', createdAt: 'DESC' },
    });
  }

  // Crear nuevo banner (solo admin)
  async createBanner(
    dto: CreateBannerDto,
    file: Express.Multer.File,
  ): Promise<Banner> {
    if (!file) {
      throw new BadRequestException(
        'Se requiere un archivo de imagen para el banner',
      );
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no soportado. Formatos permitidos: ${allowedMimeTypes.join(', ')}`,
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `El tamaño máximo permitido es ${maxSize / (1024 * 1024)}MB`,
      );
    }

    let uploadResult: CloudinaryUploadResult | null = null;

    try {
      uploadResult = await this.cloudinaryService.uploadImage(file, 'banners');

      const banner = this.bannerRepository.create({
        title: dto.title,
        description: dto.description ?? null,
        linkUrl: dto.linkUrl ?? null,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
        imageUrl: uploadResult.url,
        imagePublicId: uploadResult.publicId,
      });

      return await this.bannerRepository.save(banner);
    } catch (error) {
      if (uploadResult?.publicId) {
        await this.cloudinaryService
          .deleteImage(uploadResult.publicId)
          .catch((e) => console.error('Error al limpiar imagen fallida:', e));
      }
      throw new InternalServerErrorException(
        error.message.includes('Cloudinary')
          ? 'Error al procesar la imagen'
          : 'Error al crear el banner',
      );
    }
  }

  // Actualizar banner (solo admin)
  async updateBanner(
    id: string,
    dto: UpdateBannerDto,
    file?: Express.Multer.File,
  ): Promise<Banner> {
    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException('Banner no encontrado');
    }

    try {
      // Actualizar imagen si se proporciona
      if (file) {
        // Eliminar imagen anterior si existe
        if (banner.imagePublicId) {
          await this.cloudinaryService
            .deleteImage(banner.imagePublicId)
            .catch((e) =>
              console.error('Error al eliminar imagen anterior:', e),
            );
        }

        // Subir nueva imagen
        const uploadResult = await this.cloudinaryService.uploadImage(
          file,
          'banners',
        );
        banner.imageUrl = uploadResult.url;
        banner.imagePublicId = uploadResult.publicId;
      }

      // Validar y actualizar campos
      if (dto.title !== undefined && dto.title !== null) {
        banner.title = dto.title.trim();
      }

      if (dto.description !== undefined) {
        banner.description = dto.description?.trim() || null;
      }

      if (dto.linkUrl !== undefined) {
        banner.linkUrl = dto.linkUrl?.trim() || null;
      }

      if (dto.order !== undefined) {
        banner.order = Number(dto.order) || 0;
      }

      if (dto.isActive !== undefined) {
        banner.isActive = Boolean(dto.isActive);
      }

      // Guardar cambios
      const updatedBanner = await this.bannerRepository.save(banner);

      return updatedBanner;
    } catch (error) {
      console.error('Error updating banner:', error);

      // Manejo específico de errores de Cloudinary
      if (error.message.includes('Cloudinary')) {
        throw new InternalServerErrorException('Error al procesar la imagen');
      }

      throw new InternalServerErrorException('Error al actualizar el banner');
    }
  }

  // Eliminar banner (solo admin)
  async deleteBanner(id: string): Promise<void> {
    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException('Banner no encontrado');
    }

    try {
      // Eliminar imagen de Cloudinary
      if (banner.imagePublicId) {
        await this.cloudinaryService.deleteImage(banner.imagePublicId);
      }

      // Eliminar de la base de datos
      await this.bannerRepository.remove(banner);
    } catch (error) {
      console.error('Error deleting banner:', error);
      throw new Error('Error al eliminar el banner');
    }
  }

  // Obtener banner por ID
  async getBannerById(id: string): Promise<Banner> {
    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException('Banner no encontrado');
    }
    return banner;
  }

  // Cambiar estado activo/inactivo
  async toggleBannerStatus(id: string): Promise<Banner> {
    const banner = await this.getBannerById(id);
    banner.isActive = !banner.isActive;
    return this.bannerRepository.save(banner);
  }

  // Reordenar banners
  async reorderBanners(
    bannerOrders: { id: string; order: number }[],
  ): Promise<void> {
    try {
      for (const { id, order } of bannerOrders) {
        await this.bannerRepository.update(id, { order });
      }
    } catch (error) {
      console.error('Error reordering banners:', error);
      throw new Error('Error al reordenar banners');
    }
  }
}
