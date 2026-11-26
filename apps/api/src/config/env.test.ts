import { describe, expect, it } from 'vitest';
import { loadConfig } from './env';

const productionSmtp = {
  NODE_ENV: 'production',
  EMAIL_PROVIDER: 'smtp',
  SMTP_HOST: 'email-smtp.ap-southeast-2.amazonaws.com',
  SMTP_PORT: '587',
  SMTP_USER: 'user',
  SMTP_PASS: 'pass',
};

describe('loadConfig', () => {
  it('runs with local defaults when nothing is set', () => {
    const config = loadConfig({});
    expect(config.products.source).toBe('fakestore');
    expect(config.email).toMatchObject({
      provider: 'smtp',
      smtp: { host: 'localhost', port: 1025 },
    });
  });

  it('treats empty values as unset', () => {
    expect(loadConfig({ SMTP_USER: '', PORT: '' }).port).toBe(3000);
  });

  it('rejects invalid values with a readable message', () => {
    expect(() => loadConfig({ PRODUCT_SOURCE: 'shopify' })).toThrow(/PRODUCT_SOURCE/);
  });

  describe('production email guard', () => {
    it('accepts a real SMTP provider with credentials', () => {
      expect(loadConfig(productionSmtp).email.smtp.host).toContain('amazonaws');
    });

    it.each(['localhost', 'mailpit'])('refuses the dev mail catcher host %s', (host) => {
      expect(() => loadConfig({ ...productionSmtp, SMTP_HOST: host })).toThrow(
        /development mail catcher/,
      );
    });

    it('requires SMTP credentials', () => {
      expect(() => loadConfig({ ...productionSmtp, SMTP_PASS: '' })).toThrow(/credentials/);
    });

    it('refuses the console email provider', () => {
      expect(() => loadConfig({ ...productionSmtp, EMAIL_PROVIDER: 'console' })).toThrow(
        /not allowed in production/,
      );
    });
  });
});
