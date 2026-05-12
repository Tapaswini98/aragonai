import { Module } from '@nestjs/common';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { ImageProcessingService } from './services/image-processing.service';
import { StorageService } from './services/storage.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [ImagesController],
  providers: [ImagesService, ImageProcessingService, StorageService, PrismaService],
})
export class ImagesModule {}
