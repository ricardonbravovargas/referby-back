import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { Express } from 'express';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

    console.log('Configurando Cloudinary:', {
      cloudName: cloudName || 'NO CONFIGURADO',
      apiKey: apiKey ? 'CONFIGURADO' : 'NO CONFIGURADO',
      apiSecret: apiSecret ? 'CONFIGURADO' : 'NO CONFIGURADO',
    });

    if (!cloudName || !apiKey || !apiSecret) {
      console.error(
        '❌ Error: Variables de entorno de Cloudinary no configuradas correctamente',
      );
      console.error('Asegúrate de tener en tu .env:');
      console.error('CLOUDINARY_CLOUD_NAME=tu_cloud_name');
      console.error('CLOUDINARY_API_KEY=tu_api_key');
      console.error('CLOUDINARY_API_SECRET=tu_api_secret');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'productos',
  ): Promise<{ url: string; publicId: string }> {
    try {
      console.log('Intentando subir imagen:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        folder,
      });

      const result = await cloudinary.uploader.upload(
        file.path ||
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        {
          folder: folder,
          resource_type: 'auto',
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' },
          ],
        },
      );

      console.log('✅ Imagen subida exitosamente:', {
        url: result.secure_url,
        publicId: result.public_id,
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      console.error('❌ Error uploading to Cloudinary:', error);
      throw new Error('Error uploading image');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      console.log('Eliminando imagen de Cloudinary:', publicId);
      const result = await cloudinary.uploader.destroy(publicId);
      console.log('✅ Imagen eliminada:', result);
    } catch (error) {
      console.error('❌ Error deleting from Cloudinary:', error);
      throw new Error('Error deleting image');
    }
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder = 'productos',
  ): Promise<{ url: string; publicId: string }[]> {
    if (!files || files.length === 0) {
      console.log('No hay archivos para subir');
      return [];
    }

    console.log(`Subiendo ${files.length} imágenes a Cloudinary...`);

    try {
      const uploadPromises = files.map((file, index) => {
        console.log(
          `Procesando archivo ${index + 1}/${files.length}: ${file.originalname}`,
        );
        return this.uploadImage(file, folder);
      });

      const results = await Promise.all(uploadPromises);

      console.log(`✅ ${results.length} imágenes subidas exitosamente`);
      return results;
    } catch (error) {
      console.error('❌ Error subiendo múltiples imágenes:', error);
      throw new Error('Error uploading multiple images');
    }
  }

  async deleteMultipleImages(publicIds: string[]): Promise<void> {
    if (!publicIds || publicIds.length === 0) {
      console.log('No hay imágenes para eliminar');
      return;
    }

    console.log(`Eliminando ${publicIds.length} imágenes de Cloudinary...`);

    try {
      const deletePromises = publicIds.map((publicId, index) => {
        console.log(
          `Eliminando imagen ${index + 1}/${publicIds.length}: ${publicId}`,
        );
        return this.deleteImage(publicId);
      });

      await Promise.all(deletePromises);
      console.log(`✅ ${publicIds.length} imágenes eliminadas exitosamente`);
    } catch (error) {
      console.error('❌ Error eliminando múltiples imágenes:', error);
      throw new Error('Error deleting multiple images');
    }
  }

  // Método auxiliar para extraer public_id de una URL de Cloudinary
  extractPublicIdFromUrl(url: string): string | null {
    try {
      // Ejemplo de URL: https://res.cloudinary.com/demo/image/upload/v1234567890/productos/sample.jpg
      const regex = /\/v\d+\/(.+)\./;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error extrayendo public_id de URL:', error);
      return null;
    }
  }

  // Método para obtener información de una imagen
  async getImageInfo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      console.error('Error obteniendo información de imagen:', error);
      throw new Error('Error getting image info');
    }
  }

  // Método para optimizar imágenes existentes
  async optimizeImage(
    publicId: string,
    transformations: any[] = [],
  ): Promise<string> {
    try {
      const defaultTransformations = [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' },
      ];

      const allTransformations = [
        ...defaultTransformations,
        ...transformations,
      ];

      return cloudinary.url(publicId, {
        transformation: allTransformations,
        secure: true,
      });
    } catch (error) {
      console.error('Error optimizando imagen:', error);
      throw new Error('Error optimizing image');
    }
  }
}
