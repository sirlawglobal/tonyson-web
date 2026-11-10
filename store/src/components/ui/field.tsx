'use client';

import * as React from 'react';

/**
 * Label + control + hint/error. The control is wrapped by the label (so it gets its accessible name),
 * while hint and error text live outside the label and are linked with aria-describedby.
 */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const descId = React.useId();
  const describedBy = error || hint ? descId : undefined;
  const control = React.isValidElement<Record<string, unknown>>(children)
    ? React.cloneElement(children, {
        'aria-describedby': describedBy ?? children.props['aria-describedby'],
        'aria-invalid': error ? true : children.props['aria-invalid'],
      })
    : children;
  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">{label}</span>
        {control}
      </label>
      {error ? (
        <p id={descId} role="alert" className="mt-1 text-sm text-danger">{error}</p>
      ) : hint ? (
        <p id={descId} className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
