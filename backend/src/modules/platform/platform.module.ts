import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { UploadsModule } from '../uploads/uploads.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [CompaniesModule, UploadsModule],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
