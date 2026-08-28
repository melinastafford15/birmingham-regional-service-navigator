import { SYNTHETIC_LOCATIONS } from '@/app/lib/handoff-fixtures'

interface LocationPickerProps {
  value: string | null
  onChange: (id: string) => void
  errorId?: string
}

export function LocationPicker({ value, onChange, errorId }: LocationPickerProps) {
  return (
    <fieldset aria-describedby={errorId}>
      <legend className="text-sm font-semibold text-zinc-900">
        Choose a synthetic demo location
      </legend>
      <p className="mt-1 text-sm text-zinc-600">
        This prototype does not collect a real address. Pick one of three example
        locations to see how the tool responds.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {SYNTHETIC_LOCATIONS.map((location) => {
          const inputId = `location-${location.id}`
          return (
            <label
              key={location.id}
              htmlFor={inputId}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-300 p-3 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600"
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
                <span className="block font-medium text-zinc-900">{location.label}</span>
                <span className="block text-sm text-zinc-600">{location.description}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
