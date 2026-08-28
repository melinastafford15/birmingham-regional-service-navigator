import type { ReactNode } from 'react'
import { AlertTriangle, ArrowRight, Building2, FileText, Lightbulb, Link2, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import type { HandoffResponse } from '@/app/lib/handoff-contract'
import { ISSUE_TYPE_LABELS } from '@/app/lib/handoff-contract'
import { ConfidenceMeter } from './ConfidenceMeter'

type IconComponent = typeof Building2

function Field({ label, icon: Icon, children }: { label: string; icon?: IconComponent; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-ink-muted">
        {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
        {label}
      </h3>
      <div className="mt-1 text-base text-ink">{children}</div>
    </div>
  )
}

const LINK_CLASS =
  'rounded-sm text-accent underline underline-offset-2 hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card'

function ContactRow({ icon: Icon, label, value, href }: { icon: IconComponent; label: string; value: string | null; href?: string }) {
  if (!value) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {label}: not on file for this example.
      </p>
    )
  }
  return (
    <p className="flex items-center gap-2 text-base">
      <Icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <span className="font-medium">{label}:</span>{' '}
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
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

  return (
    <section aria-labelledby="handoff-heading" className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="handoff-heading" className="text-xl font-bold text-ink">
          Likely place to start
        </h2>
        <ConfidenceMeter confidence={data.confidence} />
      </div>

      <div className="flex flex-col gap-4">
        <Field label="Likely responsible entity" icon={Building2}>
          <p className="text-lg font-semibold">{data.likely_responsible_entity}</p>
        </Field>

        <Field label="Jurisdiction" icon={MapPin}>
          <p>{data.jurisdiction}</p>
        </Field>

        {data.issue_subtype && (
          <Field label="Issue type">
            <p>{ISSUE_TYPE_LABELS[data.issue_subtype]}</p>
          </Field>
        )}

        <Field label="Why this result" icon={Lightbulb}>
          <p>{data.reason}</p>
        </Field>

        {data.conflict_or_gap && (
          <Field label="Known conflict or gap" icon={AlertTriangle}>
            <p className="rounded-md border border-warning/30 bg-warning-soft p-3 text-ink">{data.conflict_or_gap}</p>
          </Field>
        )}

        <Field label="Recommended next action" icon={ArrowRight}>
          <p>{data.next_action}</p>
        </Field>

        <Field label="Official contact">
          {hasContact ? (
            <div className="flex flex-col gap-1.5">
              <ContactRow
                icon={Phone}
                label="Phone"
                value={data.official_contact?.phone ?? null}
                href={data.official_contact?.phone ? `tel:${data.official_contact.phone}` : undefined}
              />
              <ContactRow
                icon={Mail}
                label="Email"
                value={data.official_contact?.email ?? null}
                href={data.official_contact?.email ? `mailto:${data.official_contact.email}` : undefined}
              />
              <ContactRow
                icon={Link2}
                label="Online form"
                value={data.official_contact?.form_url ?? null}
                href={data.official_contact?.form_url ?? undefined}
              />
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No contact channel is on file for this example.</p>
          )}
        </Field>

        <Field label="Official sources and last-checked dates">
          {data.sources.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {data.sources.map((source) => (
                <li key={source.url} className="rounded-md border border-border p-3">
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className={`flex items-start gap-2 break-words ${LINK_CLASS}`}>
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    {source.title}
                  </a>
                  <p className="mt-1 text-sm text-ink-muted">
                    {source.publisher} · Last checked <span className="font-mono">{source.last_checked}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">No sources are on file for this example.</p>
          )}
        </Field>

        <Field label="Human confirmation required" icon={ShieldCheck}>
          <p className="font-medium">
            {data.requires_human_confirmation ? 'Yes — this must be confirmed by a person before you act on it.' : 'Not flagged for this example.'}
          </p>
          {data.human_confirmation_instruction && <p className="mt-1 text-ink">{data.human_confirmation_instruction}</p>}
        </Field>

        <Field label="Safety disclaimer">
          <p className="font-medium text-ink">{data.disclaimer}</p>
        </Field>
      </div>
    </section>
  )
}
