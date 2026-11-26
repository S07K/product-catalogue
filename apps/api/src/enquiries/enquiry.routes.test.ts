import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp } from '../test-support';

const validEnquiry = {
  productId: '7',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+61 400 000 000',
  message: 'Is this available in <script>alert(1)</script> size L?',
};

describe('POST /api/enquiries', () => {
  it('emails the sales inbox and returns a reference', async () => {
    const { app, email } = buildTestApp();
    const res = await request(app).post('/api/enquiries').send(validEnquiry).expect(202);

    expect(res.body).toEqual({ enquiryId: 'enq-123' });
    expect(email.sent).toHaveLength(1);
    const [message] = email.sent;
    expect(message).toMatchObject({
      to: 'sales@example.com',
      replyTo: { name: 'Ada Lovelace', address: 'ada@example.com' },
      subject: 'New enquiry: Mens Cotton Jacket',
    });
    expect(message?.text).toContain('Reference: enq-123');
  });

  it('escapes customer input in the HTML email', async () => {
    const { app, email } = buildTestApp();
    await request(app).post('/api/enquiries').send(validEnquiry).expect(202);
    expect(email.sent[0]?.html).not.toContain('<script>');
    expect(email.sent[0]?.html).toContain('&lt;script&gt;');
  });

  it('accepts an enquiry with only the required fields', async () => {
    const { app, email } = buildTestApp();
    await request(app)
      .post('/api/enquiries')
      .send({ productId: '7', name: 'Ada', email: 'ada@example.com', phone: '', message: '' })
      .expect(202);
    expect(email.sent[0]?.text).toContain('Phone: Not provided');
  });

  it('rejects invalid input with field-level details and sends nothing', async () => {
    const { app, email } = buildTestApp();
    const res = await request(app)
      .post('/api/enquiries')
      .send({ productId: '7', name: '', email: 'nope' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(['name', 'email']));
    expect(email.sent).toHaveLength(0);
  });

  it('returns 404 when the product does not exist', async () => {
    const { app, email } = buildTestApp();
    await request(app)
      .post('/api/enquiries')
      .send({ ...validEnquiry, productId: '999' })
      .expect(404);
    expect(email.sent).toHaveLength(0);
  });

  it('returns 502 (not a false success) when the email cannot be delivered', async () => {
    const { app, email } = buildTestApp();
    email.failWith = new Error('SMTP connection refused');
    const res = await request(app).post('/api/enquiries').send(validEnquiry).expect(502);
    expect(res.body.error.code).toBe('EMAIL_DELIVERY_FAILED');
    expect(JSON.stringify(res.body)).not.toContain('SMTP');
  });

  it('silently drops honeypot submissions', async () => {
    const { app, email } = buildTestApp();
    await request(app)
      .post('/api/enquiries')
      .send({ ...validEnquiry, website: 'http://spam.example' })
      .expect(202);
    expect(email.sent).toHaveLength(0);
  });

  it('rejects malformed JSON', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post('/api/enquiries')
      .set('content-type', 'application/json')
      .send('{"name":')
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rate limits repeated submissions', async () => {
    const { app } = buildTestApp({ rateLimitMax: 2 });
    await request(app).post('/api/enquiries').send(validEnquiry).expect(202);
    await request(app).post('/api/enquiries').send(validEnquiry).expect(202);
    const res = await request(app).post('/api/enquiries').send(validEnquiry).expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});
