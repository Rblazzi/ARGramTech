import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PromotionsService } from './promotions.service';

// Disparador externo para ambientes serverless (Vercel), onde não existe
// um processo persistente rodando o @Cron de PromotionsService — cada
// invocação da função é isolada e morre logo depois de responder.
//
// O Vercel Cron Jobs chama esta rota 1x por dia (configurado em
// vercel.json). Fica fora do JwtAuthGuard de propósito, igual ao
// webhook de pagamento: quem chama não é um usuário logado, é o próprio
// scheduler da Vercel. A Vercel injeta automaticamente o header
// `Authorization: Bearer <CRON_SECRET>` quando a env var CRON_SECRET
// existe no projeto — por isso validamos contra ela.
//
// Em hospedagem tradicional (Railway/Fly/VPS), o @Cron de
// PromotionsService continua funcionando sozinho, sem precisar deste
// endpoint.
@Controller('promotions')
export class PromotionsCronController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly config: ConfigService,
  ) {}

  @Get('cron-trigger')
  async trigger(@Headers('authorization') authHeader?: string) {
    const expected = `Bearer ${this.config.get<string>('CRON_SECRET')}`;
    if (authHeader !== expected) {
      throw new UnauthorizedException('Não autorizado');
    }

    await this.promotionsService.runScheduledPromotions();
    return { ok: true };
  }
}
