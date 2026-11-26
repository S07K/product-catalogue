import { describe, expect, it } from 'vitest';
import { EnquiryInputSchema } from './enquiry';

const valid = { productId: '1', name: 'Ada Lovelace', email: 'ada@example.com' };

describe('EnquiryInputSchema', () => {
  it('accepts the minimum required fields', () => {
    expect(EnquiryInputSchema.parse(valid)).toEqual(valid);
  });

  it('trims input and treats empty optional fields as absent', () => {
    const parsed = EnquiryInputSchema.parse({
      ...valid,
      name: '  Ada  ',
      phone: '  ',
      message: '',
    });
    expect(parsed.name).toBe('Ada');
    expect(parsed.phone).toBeUndefined();
    expect(parsed.message).toBeUndefined();
  });

  it('uses friendly messages when required fields are missing entirely', () => {
    const result = EnquiryInputSchema.safeParse({ productId: '1' });
    expect(result.error?.issues.map((i) => i.message)).toEqual([
      'Please enter your name',
      'Please enter a valid email address',
    ]);
  });

  it.each([
    ['missing name', { ...valid, name: '   ' }, 'name'],
    ['invalid email', { ...valid, email: 'not-an-email' }, 'email'],
    ['invalid phone', { ...valid, phone: 'call me' }, 'phone'],
    ['message too long', { ...valid, message: 'x'.repeat(1001) }, 'message'],
  ])('rejects %s', (_label, input, field) => {
    const result = EnquiryInputSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toContain(field);
  });
});
