import type { Confidence } from '@/app/lib/handoff-contract'

const CONFIDENCE_TEXT: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence — worth double-checking',
  low: 'Low confidence — treat as a starting guess only',
}

/** Segments filled per level: low = 1/3, medium = 2/3, high = 3/3. Purely decorative —
 * the text label is what carries meaning for assistive tech. */
const CONFIDENCE_LEVEL: Record<Confidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

const CONFIDENCE_DOT: Record<Confidence, string> = {
  high: 'bg-confidence-high',
  medium: 'bg-confidence-medium',
  low: 'bg-confidence-low',
}

const CONFIDENCE_TEXT_COLOR: Record<Confidence, string> = {
  high: 'text-confidence-high',
  medium: 'text-confidence-medium',
  low: 'text-confidence-low',
}

const CONFIDENCE_SOFT: Record<Confidence, string> = {
  high: 'border-confidence-high/30 bg-confidence-high-soft',
  medium: 'border-confidence-medium/30 bg-confidence-medium-soft',
  low: 'border-confidence-low/30 bg-confidence-low-soft',
}

export function ConfidenceMeter({ confidence }: { confidence: Confidence }) {
  const filled = CONFIDENCE_LEVEL[confidence]

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${CONFIDENCE_SOFT[confidence]} ${CONFIDENCE_TEXT_COLOR[confidence]}`}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {[1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={`h-2 w-2 rounded-full ${segment <= filled ? CONFIDENCE_DOT[confidence] : 'bg-ink-muted/25'}`}
          />
        ))}
      </span>
      {CONFIDENCE_TEXT[confidence]}
    </span>
  )
}
