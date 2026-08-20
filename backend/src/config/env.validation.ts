import * as Joi from 'joi';

// Valida todas as variáveis de ambiente exigidas pelo backend no boot.
// Se algo estiver faltando ou incorreto, a aplicação falha imediatamente
// em vez de dar erro obscuro em tempo de execução.
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3001),
  CORS_ORIGIN: Joi.string().required(),

  DATABASE_URL: Joi.string().uri().required(),
  DIRECT_URL: Joi.string().uri().required(),

  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  PIX_WEBHOOK_SECRET: Joi.string().min(8).required(),
});
