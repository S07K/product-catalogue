import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const controlClass =
  'w-full rounded-control border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted aria-[invalid=true]:border-danger border-border';

interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: string;
}

/** Label, hint and error are wired with for/aria-describedby so screen readers announce them. */
function Field({
  label,
  error,
  hint,
  required,
  children,
}: FieldProps & {
  required?: boolean | undefined;
  children: (ids: { id: string; describedBy: string | undefined }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {!required && <span className="font-normal text-text-muted"> (optional)</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {children({ id, describedBy })}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  error,
  hint,
  ...inputProps
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error} hint={hint} required={inputProps.required}>
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={controlClass}
          {...inputProps}
        />
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  ...textareaProps
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} error={error} hint={hint} required={textareaProps.required}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${controlClass} min-h-28 resize-y`}
          {...textareaProps}
        />
      )}
    </Field>
  );
}
