import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

// Encapsula toda a comunicação com o Supabase (Auth + Storage).
// Nenhum outro módulo deve importar @supabase/supabase-js ou jose
// diretamente — tudo passa por aqui, para manter o Supabase substituível
// no futuro.
@Injectable()
export class SupabaseService {
  // Cliente com a chave anônima: usado para operações em nome do usuário
  // final (ex.: login), exatamente como o SDK client-side faria.
  public readonly anonClient: SupabaseClient;

  // Cliente com a service_role key: privilégios administrativos
  // (criar usuário, deletar usuário, resetar senha). NUNCA expor ao frontend.
  public readonly adminClient: SupabaseClient;

  // Conjunto de chaves públicas do projeto Supabase, usado para validar a
  // assinatura dos access tokens (ES256/RS256) sem precisar de round-trip
  // à API a cada request. Buscado uma vez e cacheado automaticamente pela
  // lib `jose` (com refetch quando o `kid` não é encontrado, ex.: rotação
  // de chaves).
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL')!;

    this.anonClient = createClient(url, this.config.get<string>('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    this.adminClient = createClient(url, this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    this.jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  }

  // Verifica a assinatura, expiração, emissor e audiência de um access
  // token emitido pelo Supabase Auth. Lança se o token for
  // inválido/expirado ou não tiver sido emitido para este projeto —
  // sem pinar iss/aud, qualquer token assinado pela mesma chave do
  // projeto passaria, mesmo que emitido para outro propósito.
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const url = this.config.get<string>('SUPABASE_URL')!;
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: `${url}/auth/v1`,
      audience: 'authenticated',
    });
    return payload;
  }
}
