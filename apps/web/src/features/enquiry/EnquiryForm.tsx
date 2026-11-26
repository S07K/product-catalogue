import { useEffect, useRef, useState, type FormEvent } from 'react';
import { EnquiryInputSchema, ENQUIRY_LIMITS, type Product } from '@catalogue/shared';
import { useSubmitEnquiry } from '../../api/hooks';
import { ApiRequestError } from '../../api/client';
import { ProductImage } from '../../components/ProductImage';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/TextField';
import { formatPrice } from '../../lib/format';

type FieldName = 'name' | 'email' | 'phone' | 'message';
type FieldErrors = Partial<Record<FieldName, string>>;

const emptyForm = { name: '', email: '', phone: '', message: '', website: '' };

/** First message per field, from either client-side zod issues or the API's `details`. */
function toFieldErrors(details: Record<string, string[] | undefined>): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of ['name', 'email', 'phone', 'message'] as const) {
    const message = details[field]?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}

function CloseButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Close"
      className="-m-2 rounded-control p-2 text-text-muted hover:bg-surface-muted hover:text-text disabled:opacity-50"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
        <path
          d="M5 5l10 10M15 5L5 15"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/** The product being enquired about, so the customer always sees what they're asking about. */
function ProductSummary({ product }: { product: Product }) {
  return (
    <div className="flex items-center gap-4">
      <ProductImage
        src={product.imageUrl}
        alt=""
        categorySlug={product.category.slug}
        className="h-16 w-16 shrink-0 rounded-card"
        imageClassName="p-2"
        loading="eager"
      />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium">{product.title}</p>
        <p className="font-display font-semibold">{formatPrice(product.price)}</p>
      </div>
    </div>
  );
}

export function EnquiryForm({
  product,
  onClose,
  onBusyChange,
}: {
  product: Product;
  onClose: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [values, setValues] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const submit = useSubmitEnquiry();
  const thankYouRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    onBusyChange?.(submit.isPending);
  }, [submit.isPending, onBusyChange]);

  // After a failed submit, move focus to the first invalid field so the error is announced.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [fieldErrors]);

  // Move focus to the confirmation so keyboard and screen-reader users know it worked.
  useEffect(() => {
    if (submit.isSuccess) thankYouRef.current?.focus();
  }, [submit.isSuccess]);

  if (submit.isSuccess) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 px-6 py-10 text-center sm:px-10"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-surface text-success">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2
          ref={thankYouRef}
          tabIndex={-1}
          id="enquiry-heading"
          className="text-2xl font-semibold outline-none"
        >
          Thank you for your enquiry!
        </h2>
        <p className="max-w-sm text-text-muted">
          Our sales team will be in touch about{' '}
          <strong className="text-text">{product.title}</strong> soon.
        </p>
        <p className="text-xs text-text-muted">Reference: {submit.data.enquiryId}</p>
        <Button className="mt-2" onClick={onClose}>
          Done
        </Button>
      </div>
    );
  }

  const update = (field: keyof typeof emptyForm) => (value: string) =>
    setValues((v) => ({ ...v, [field]: value }));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    // Same schema as the API: instant feedback here, and the server still re-validates.
    const parsed = EnquiryInputSchema.safeParse({ ...values, productId: product.id });
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        (details[key] ??= []).push(issue.message);
      }
      setFieldErrors(toFieldErrors(details));
      return;
    }
    setFieldErrors({});
    submit.mutate(parsed.data, {
      onError: (error) => {
        if (error instanceof ApiRequestError && error.details) {
          setFieldErrors(toFieldErrors(error.details));
        }
      },
    });
  }

  const serverError =
    submit.isError && !(submit.error instanceof ApiRequestError && submit.error.details)
      ? submit.error instanceof ApiRequestError
        ? submit.error.message
        : 'Your enquiry was not sent. Please try again.'
      : null;

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col">
      <header className="flex flex-col gap-5 border-b border-border px-6 pb-5 pt-6 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="enquiry-heading" className="text-2xl font-semibold">
              Enquire about this product
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Leave your details and our sales team will get back to you.
            </p>
          </div>
          <CloseButton onClick={onClose} disabled={submit.isPending} />
        </div>
        <ProductSummary product={product} />
      </header>

      <div className="flex flex-col gap-4 px-6 py-6 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Name"
            name="name"
            autoComplete="name"
            required
            data-autofocus
            maxLength={ENQUIRY_LIMITS.nameMax}
            value={values.name}
            onChange={(e) => update('name')(e.target.value)}
            error={fieldErrors.name}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={(e) => update('email')(e.target.value)}
            error={fieldErrors.email}
          />
        </div>
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => update('phone')(e.target.value)}
          error={fieldErrors.phone}
        />
        <TextAreaField
          label="Message"
          name="message"
          placeholder="Ask about sizes, availability, bulk pricing…"
          maxLength={ENQUIRY_LIMITS.messageMax}
          value={values.message}
          onChange={(e) => update('message')(e.target.value)}
          error={fieldErrors.message}
        />

        {/* Honeypot: invisible to people and assistive tech; bots that fill it are dropped server-side. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              name="website"
              value={values.website}
              onChange={(e) => update('website')(e.target.value)}
            />
          </label>
        </div>

        {serverError && (
          <p role="alert" className="rounded-control bg-danger-surface p-3 text-sm text-danger">
            {serverError}
          </p>
        )}
      </div>

      <footer className="flex flex-col-reverse gap-3 border-t border-border bg-page px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-xs text-text-muted">
          We only use your details to reply to this enquiry.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submit.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? 'Sending…' : 'Send enquiry'}
          </Button>
        </div>
      </footer>
    </form>
  );
}
