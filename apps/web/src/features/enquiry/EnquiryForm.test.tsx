import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderApp } from '../../test/render';
import { server } from '../../test/server';

async function openEnquiryForm() {
  const utils = renderApp('/products/4');
  await utils.user.click(await screen.findByRole('button', { name: 'Enquire' }));
  return utils;
}

describe('Enquiry', () => {
  it('submits contact details and shows a thank you message', async () => {
    let received: unknown;
    server.use(
      http.post('/api/enquiries', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ enquiryId: 'ref-42' }, { status: 202 });
      }),
    );
    const { user } = await openEnquiryForm();

    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText(/Message/), 'Do you have this in rose gold?');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(
      await screen.findByRole('heading', { name: 'Thank you for your enquiry!' }),
    ).toHaveFocus();
    expect(screen.getByText('Reference: ref-42')).toBeInTheDocument();
    expect(received).toEqual({
      productId: '4',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Do you have this in rose gold?',
    });
  });

  it('shows field errors and does not submit invalid details', async () => {
    let called = false;
    server.use(
      http.post('/api/enquiries', () => {
        called = true;
        return HttpResponse.json({ enquiryId: 'x' }, { status: 202 });
      }),
    );
    const { user } = await openEnquiryForm();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Please enter your name');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Please enter a valid email address',
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(called).toBe(false);
  });

  it('shows the server error and no thank you when the email cannot be sent', async () => {
    server.use(
      http.post('/api/enquiries', () =>
        HttpResponse.json(
          {
            error: {
              code: 'EMAIL_DELIVERY_FAILED',
              message: 'We could not send your enquiry right now. Please try again shortly.',
            },
          },
          { status: 502 },
        ),
      ),
    );
    const { user } = await openEnquiryForm();

    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('could not send your enquiry');
    expect(screen.queryByText(/thank you/i)).not.toBeInTheDocument();
    // The customer's details are kept so they can retry.
    expect(screen.getByLabelText('Name')).toHaveValue('Ada');
  });

  it('maps server-side validation errors onto fields', async () => {
    server.use(
      http.post('/api/enquiries', () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'The request is invalid',
              details: { email: ['Email domain is not accepted'] },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = await openEnquiryForm();
    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByText('Email domain is not accepted')).toBeInTheDocument();
  });
});
