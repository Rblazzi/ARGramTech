import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeocodingService } from './geocoding.service';
import { SearchGeocodeDto } from './dto/search-geocode.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';

// Exige login (qualquer papel) só pra não deixar nosso backend virar um
// proxy anônimo aberto pro Nominatim — não depende de empresa/tenant.
// Throttle mais apertado que o padrão global: o Nominatim é um serviço
// gratuito com política de uso limitada, e abusar dele pode fazer nosso
// IP ser bloqueado por eles.
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 15, ttl: 60 } })
@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get('search')
  search(@Query() dto: SearchGeocodeDto) {
    return this.geocodingService.search(dto.q);
  }

  @Get('reverse')
  reverse(@Query() dto: ReverseGeocodeDto) {
    return this.geocodingService.reverse(dto.lat, dto.lon);
  }
}
