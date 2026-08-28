/**
 * A single polite live region for status text (loading, success, non-error info).
 * Validation and failure messages use role="alert" at their own field/location instead,
 * since those need assertive announcement tied to the control they describe.
 */
export function StatusRegion({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  )
}
