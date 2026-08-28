import type { FormEvent } from 'react'
import { LocationPicker } from './LocationPicker'

export interface FormErrors {
  message?: string
  location?: string
}

interface IssueFormProps {
  message: string
  onMessageChange: (value: string) => void
  locationId: string | null
  onLocationChange: (id: string) => void
  errors: FormErrors
  submitting: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

const EXAMPLE_PROMPTS = [
  'The sidewalk is broken near my location',
  'A tree limb fell and is blocking the sidewalk',
  'The storm drain on the corner is blocked and water backs up every time it rains',
  'There is a large pothole in the road',
]

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

export function IssueForm({
  message,
  onMessageChange,
  locationId,
  onLocationChange,
  errors,
  submitting,
  onSubmit,
}: IssueFormProps) {
  const messageErrorId = 'message-error'
  const locationErrorId = 'location-error'

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <label htmlFor="issue-message" className="text-sm font-semibold text-ink">
          Describe the problem
        </label>
        <p id="message-hint" className="mt-1 text-sm text-ink-muted">
          Plain language is fine. We cover pothole or road damage, sidewalk damage,
          blocked drainage, and fallen tree or debris.
        </p>
        <textarea
          id="issue-message"
          name="message"
          rows={3}
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          aria-describedby={errors.message ? `message-hint ${messageErrorId}` : 'message-hint'}
          aria-invalid={Boolean(errors.message)}
          className={`mt-2 w-full rounded-lg border bg-card p-3 text-base text-ink ${errors.message ? 'border-danger' : 'border-border'} ${FOCUS_RING}`}
        />
        {errors.message && (
          <p id={messageErrorId} role="alert" className="mt-1 text-sm font-medium text-danger">
            {errors.message}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onMessageChange(example)}
              className={`rounded-full border border-border bg-card px-3 py-1 text-sm text-ink-muted transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-ink ${FOCUS_RING}`}
            >
              Use example: “{example}”
            </button>
          ))}
        </div>
      </div>

      <div>
        <LocationPicker
          value={locationId}
          onChange={onLocationChange}
          errorId={errors.location ? locationErrorId : undefined}
        />
        {errors.location && (
          <p id={locationErrorId} role="alert" className="mt-2 text-sm font-medium text-danger">
            {errors.location}
          </p>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={submitting}
          aria-disabled={submitting}
          className={`w-full rounded-lg bg-accent px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-ink-muted/40 disabled:text-ink-muted sm:w-auto ${FOCUS_RING}`}
        >
          {submitting ? 'Finding the likely office…' : 'Find where to start'}
        </button>
        <p className="mt-2 text-sm text-ink-muted">
          This does not submit a service request to any office.
        </p>
      </div>
    </form>
  )
}
