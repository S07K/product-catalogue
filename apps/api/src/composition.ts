import pino, { type Logger } from 'pino';
import type { Config } from './config/env';
import type { ProductSource } from './adapters/product-source/product-source';
import type { EmailSender } from './adapters/email/email-sender';
import { FakeStoreProductSource } from './adapters/product-source/fakestore.adapter';
import { FixtureProductSource } from './adapters/product-source/fixture.adapter';
import { CachingProductSource } from './adapters/product-source/caching.adapter';
import { JsonFileFeaturedRepository } from './adapters/featured/json-file.adapter';
import { SmtpEmailSender } from './adapters/email/smtp.adapter';
import { ConsoleEmailSender } from './adapters/email/console.adapter';
import { CatalogueService } from './catalogue/catalogue.service';
import { EnquiryService } from './enquiries/enquiry.service';
import { HealthService } from './health/health.service';
import { readinessChecks } from './health/readiness-checks';
import type { AppDependencies } from './app';

/**
 * Composition root: the only place that maps configuration to concrete
 * adapters. Swapping the product source or email provider happens here.
 */
export function buildDependencies(
  config: Config,
  logger: Logger = createLogger(config),
): AppDependencies {
  const products = buildProductSource(config, logger);
  const featured = JsonFileFeaturedRepository.fromFile(config.featuredConfigPath);
  const catalogue = new CatalogueService(products, featured, logger);
  const email = buildEmailSender(config, logger);
  const enquiries = new EnquiryService(catalogue, email, config.email.salesInbox, logger);

  const health = new HealthService(readinessChecks(products, email), {
    timeoutMs: config.healthCheckTimeoutMs,
    logger,
  });

  return {
    catalogue,
    enquiries,
    health,
    logger,
    webOrigin: config.webOrigin,
    trustProxy: config.trustProxy,
    enquiryRateLimit: config.enquiryRateLimit,
  };
}

export function createLogger(config: Config): Logger {
  return pino({
    level: config.logLevel,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  });
}

function buildProductSource(config: Config, logger: Logger): ProductSource {
  switch (config.products.source) {
    case 'fixture':
      return FixtureProductSource.fromFile(config.products.fixturePath);
    case 'fakestore':
      return new CachingProductSource(
        new FakeStoreProductSource({
          baseUrl: config.products.fakeStoreBaseUrl,
          timeoutMs: config.products.timeoutMs,
          logger,
        }),
        { ttlMs: config.products.cacheTtlMs, logger },
      );
  }
}

function buildEmailSender(config: Config, logger: Logger): EmailSender {
  switch (config.email.provider) {
    case 'console':
      return new ConsoleEmailSender(logger);
    case 'smtp':
      return new SmtpEmailSender({ ...config.email.smtp, from: config.email.from });
  }
}
