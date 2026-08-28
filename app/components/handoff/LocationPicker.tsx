import { SYNTHETIC_LOCATIONS } from '@/app/lib/handoff-fixtures'

interface LocationPickerProps {
  value: string | null
  onChange: (id: string) => void
  errorId?: string
}

export function LocationPicker({ value, onChange, errorId }: LocationPickerProps) {
  return (
    <fieldset aria-describedby={errorId}>
      <legend className="text-sm font-semibold text-ink">
        Choose a synthetic demo location
      </legend>
      <p className="mt-1 text-sm text-ink-muted">
        This prototype does not collect a real address. Pick one of four example
        locations to see how the tool responds.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SYNTHETIC_LOCATIONS.map((location) => {
          const inputId = `location-${location.id}`
          return (
            <label
              key={location.id}
              htmlFor={inputId}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface"
            >
              <input
                id={inputId}
                type="radio"
                name="synthetic-location"
                value={location.id}
                checked={value === location.id}
                onChange={() => onChange(location.id)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-ink">{location.label}</span>
                <span className="block text-sm text-ink-muted">{location.description}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
