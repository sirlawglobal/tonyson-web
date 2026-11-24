import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';
import { ApiError } from '@/lib/api/client';

/**
 * Copies the API's per-field validation errors (ApiErrorBody.details) onto a react-hook-form form.
 * Returns true if at least one field was marked, so the caller can skip the generic banner.
 */
export function applyApiErrors<T extends FieldValues>(form: UseFormReturn<T>, error: unknown, fields: readonly FieldPath<T>[]): boolean {
  if (!(error instanceof ApiError) || !error.details) return false;
  let applied = false;
  for (const field of fields) {
    const message = error.fieldError(field);
    if (message) {
      form.setError(field, { message });
      applied = true;
    }
  }
  return applied;
}
