import type { ReactNode } from 'react'
import type { Confidence, HandoffResponse } from '@/app/lib/handoff-contract'
import { ISSUE_TYPE_LABELS } from '@/app/lib/handoff-contract'

const CONFIDENCE_TEXT: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence — worth double-checking',
  low: 'Low confidence — treat as a starting guess only',
}

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: 'border-green-700 bg-green-50 text-green-900',
  medium: 'border-amber-700 bg-amber-50 text-amber-900',
  low: 'border-red-700 bg-red-50 text-red-900',
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-zinc-200 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{label}</h3>
      <div className="mt-1 text-base text-zinc-900">{children}</div>
    </div>
  )
}

function ContactRow({ label, value, href }: { label: string; value: string | null; href?: string }) {
  if (!value) {
    return (
      <p className="text-sm text-zinc-500">
        {label}: not on file for this example.
      </p>
    )
  }
  return (
    <p className="text-base">
      <span className="font-medium">{label}:</span>{' '}
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline underline-offset-2 hover:text-blue-900">
          {value}
        </a>
      ) : (
        value
      )}
    </p>
  )
}

export function HandoffCard({ data }: { data: HandoffResponse }) {
  const hasContact = data.official_contact && (data.official_contact.phone || data.official_contact.email || data.official_contact.form_url)
  const isExampleData = data.sources.some(
    (source) => source.url.includes('example.invalid') || /placeholder/i.test(source.title),
  )

  return (
    <section aria-labelledby="handoff-heading" className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="handoff-heading" className="text-xl font-bold text-zinc-900">
          Likely place to start
        </h2>
        <div className="flex flex-wrap gap-2">
          {isExampleData && (
            <span className="rounded-full border border-blue-700 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900">
              Example data
            </span>
          )}
          <span
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${CONFIDENCE_STYLE[data.confidence]}`}
          >
            {CONFIDENCE_TEXT[data.confidence]}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Field label="Likely responsible entity">
          <p className="text-lg font-semibold">{data.likely_responsible_entity}</p>
        </Field>

        <Field label="Jurisdiction">
          <p>{data.jurisdiction}</p>
        </Field>

        {data.issue_subtype && (
          <Field label="Issue type">
            <p>{ISSUE_TYPE_LABELS[data.issue_subtype]}</p>
          </Field>
        )}

        <Field label="Why this result">
          <p>{data.reason}</p>
        </Field>

        {data.conflict_or_gap && (
          <Field label="Known conflict or gap">
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">{data.conflict_or_gap}</p>
          </Field>
        )}

        <Field label="Recommended next action">
          <p>{data.next_action}</p>
        </Field>

        <Field label="Official contact">
          {hasContact ? (
            <div className="flex flex-col gap-1">
              <ContactRow label="Phone" value={data.official_contact?.phone ?? null} href={data.official_contact?.phone ? `tel:${data.official_contact.phone}` : undefined} />
              <ContactRow label="Email" value={data.official_contact?.email ?? null} href={data.official_contact?.email ? `mailto:${data.official_contact.email}` : undefined} />
              <ContactRow label="Online form" value={data.official_contact?.form_url ?? null} href={data.official_contact?.form_url ?? undefined} />
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No contact channel is on file for this example.</p>
          )}
        </Field>

        <Field label="Official sources and last-checked dates">
          {data.sources.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {data.sources.map((source) => (
                <li key={source.url} className="rounded-md border border-zinc-200 p-3">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-words text-blue-800 underline underline-offset-2 hover:text-blue-900"
                  >
                    {source.title}
                  </a>
                  <p className="mt-1 text-sm text-zinc-600">
                    {source.publisher} · Last checked {source.last_checked}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No sources are on file for this example.</p>
          )}
        </Field>

        <Field label="Human confirmation required">
          <p className="font-medium">
            {data.requires_human_confirmation ? 'Yes — this must be confirmed by a person before you act on it.' : 'Not flagged for this example.'}
          </p>
          {data.human_confirmation_instruction && (
            <p className="mt-1 text-zinc-700">{data.human_confirmation_instruction}</p>
          )}
        </Field>

        <Field label="Safety disclaimer">
          <p className="font-medium text-zinc-900">{data.disclaimer}</p>
        </Field>
      </div>
    </section>
  )
}
