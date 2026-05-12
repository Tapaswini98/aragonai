import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImagesService } from './images.service';
import type { RawUpload } from '../../common/types/image.types';

@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(@UploadedFile() file: Express.Multer.File) {
    const raw: RawUpload = {
      originalname: file.originalname,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    };
    return this.imagesService.upload(raw);
  }

  @Post('upload-bulk')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', 50, { storage: memoryStorage() }))
  uploadBulk(@UploadedFiles() files: Express.Multer.File[]) {
    const raws: RawUpload[] = files.map((f) => ({
      originalname: f.originalname,
      mimetype: f.mimetype,
      buffer: f.buffer,
      size: f.size,
    }));
    return this.imagesService.uploadBulk(raws);
  }

  @Get()
  findAll() {
    return this.imagesService.findAll();
  }

  @Get('accepted')
  findAccepted() {
    return this.imagesService.findByStatus('ACCEPTED');
  }

  @Get('rejected')
  findRejected() {
    return this.imagesService.findByStatus('REJECTED');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const image = await this.imagesService.findOne(id);
    if (!image) throw new NotFoundException(`Image ${id} not found`);
    return image;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.imagesService.remove(id);
  }
}
