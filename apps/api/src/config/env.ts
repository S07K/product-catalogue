import { z } from 'zod';

const DEV_ONLY_SMTP_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'mailpit']);

const booleanString = z.enum(['true', 'false']).transform((v) => v === 'true');

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    WEB_ORIGIN: z.url().default('http://localhost:5173'),
    /** Number of reverse proxies in front of the API (nginx in docker compose = 1). */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    PRODUCT_SOURCE: z.enum(['fakestore', 'fixture']).default('fakestore'),
    FAKESTORE_BASE_URL: z.url().default('https://fakestoreapi.com'),
    FIXTURE_PATH: z.string().default('./data/products.fixture.json'),
    PRODUCT_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(300),
    UPSTREAM_TIMEOUT_MS: z.coerce.number().int().min(100).default(5000),
    FEATURED_CONFIG_PATH: z.string().default('./data/featured.json'),

    EMAIL_PROVIDER: z.enum(['smtp', 'console']).default('smtp'),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
    SMTP_SECURE: booleanString.default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().min(3).default('Product Catalogue <no-reply@catalogue.local>'),
    SALES_INBOX: z.email().default('sales@catalogue.local'),

    ENQUIRY_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
    ENQUIRY_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).default(15),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    // Production guard: Mailpit / console are development conveniences only.
    if (env.EMAIL_PROVIDER === 'console') {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_PROVIDER'],
        message: 'console email is not allowed in production (enquiries would be lost)',
      });
    }
    if (env.EMAIL_PROVIDER === 'smtp') {
      if (DEV_ONLY_SMTP_HOSTS.has(env.SMTP_HOST)) {
        ctx.addIssue({
          code: 'custom',
          path: ['SMTP_HOST'],
          message: `"${env.SMTP_HOST}" is a development mail catcher; configure a real SMTP provider`,
        });
      }
      if (!env.SMTP_USER || !env.SMTP_PASS) {
        ctx.addIssue({
          code: 'custom',
          path: ['SMTP_USER'],
          message: 'SMTP credentials are required in production',
        });
      }
    }
  });

export type Config = ReturnType<typeof loadConfig>;

/** Parses and validates configuration. Throws with a readable message on invalid input. */
export function loadConfig(source: NodeJS.ProcessEnv = process.env) {
  // Treat `KEY=` (empty) in .env files as "not set" so defaults apply.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ''));
  const result = EnvSchema.safeParse(cleaned);
  if (!result.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(result.error)}`);
  }
  const env = result.data;
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    webOrigin: env.WEB_ORIGIN,
    trustProxy: env.TRUST_PROXY,
    products: {
      source: env.PRODUCT_SOURCE,
      fakeStoreBaseUrl: env.FAKESTORE_BASE_URL,
      fixturePath: env.FIXTURE_PATH,
      cacheTtlMs: env.PRODUCT_CACHE_TTL_SECONDS * 1000,
      timeoutMs: env.UPSTREAM_TIMEOUT_MS,
    },
    featuredConfigPath: env.FEATURED_CONFIG_PATH,
    email: {
      provider: env.EMAIL_PROVIDER,
      smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      from: env.EMAIL_FROM,
      salesInbox: env.SALES_INBOX,
    },
    enquiryRateLimit: {
      max: env.ENQUIRY_RATE_LIMIT_MAX,
      windowMs: env.ENQUIRY_RATE_LIMIT_WINDOW_MINUTES * 60_000,
    },
  };
}
