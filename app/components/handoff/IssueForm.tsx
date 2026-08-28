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
        <label htmlFor="issue-message" className="text-sm font-semibold text-zinc-900">
          Describe the problem
        </label>
        <p id="message-hint" className="mt-1 text-sm text-zinc-600">
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
          className="mt-2 w-full rounded-md border border-zinc-300 p-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        />
        {errors.message && (
          <p id={messageErrorId} role="alert" className="mt-1 text-sm font-medium text-red-700">
            {errors.message}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onMessageChange(example)}
              className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
          <p id={locationErrorId} role="alert" className="mt-2 text-sm font-medium text-red-700">
            {errors.location}
          </p>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={submitting}
          aria-disabled={submitting}
          className="w-full rounded-md bg-blue-700 px-5 py-3 text-base font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
        >
          {submitting ? 'Finding the likely office…' : 'Find where to start'}
        </button>
        <p className="mt-2 text-sm text-zinc-500">
          This does not submit a service request to any office.
        </p>
      </div>
    </form>
  )
}
