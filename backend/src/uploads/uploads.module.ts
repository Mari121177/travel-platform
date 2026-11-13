import { Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import express from 'express';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from './upload.constants';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
  // Other modules import UploadsModule to call deleteByUrl()
  exports: [UploadsService],
})
export class UploadsModule implements OnModuleInit {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  // Serves the saved images at /uploads/<file> (GEN-08), outside the /api prefix
  onModuleInit() {
    const server = this.adapterHost.httpAdapter.getInstance();
    server.use(UPLOADS_URL_PREFIX, express.static(UPLOADS_DIR));
  }
}