import type { ReactNode } from 'react'
import { AlertTriangle, Info, XCircle } from 'lucide-react'
import { ISSUE_TYPE_LABELS, JURISDICTION_LABELS, type IssueType, type JurisdictionHint } from '@/app/lib/handoff-contract'

type IconComponent = typeof Info

function Panel({ title, icon: Icon, tone, children }: { title: string; icon: IconComponent; tone: 'info' | 'warning'; children: ReactNode }) {
  const toneClass = tone === 'warning' ? 'border-warning/40 bg-warning-soft' : 'border-border bg-card'
  const iconClass = tone === 'warning' ? 'text-warning' : 'text-accent'
  return (
    <section role="status" aria-live="polite" className={`rounded-2xl border p-6 shadow-card ${toneClass}`}>
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
        <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-2 text-base text-ink">{children}</div>
    </section>
  )
}

export function EmptyStatePanel() {
  return (
    <Panel title="What this tool covers" icon={Info} tone="info">
      <p>
        CivicRoute BHM helps you find the likely place to start for a public
        right-of-way issue in Birmingham, Jefferson County, or Homewood. It supports:
      </p>
      <ul className="mt-2 list-disc pl-6">
        {Object.values(ISSUE_TYPE_LABELS).map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-ink-muted">
        Describe your problem and choose one of four synthetic demo locations below to
        see an example result.
      </p>
    </Panel>
  )
}

export function OutOfScopePanel({ supportedIssueTypes }: { supportedIssueTypes: IssueType[] }) {
  return (
    <Panel title="This doesn't match a supported issue type" icon={AlertTriangle} tone="warning">
      <p>This prototype only covers:</p>
      <ul className="mt-2 list-disc pl-6">
        {supportedIssueTypes.map((type) => (
          <li key={type}>{ISSUE_TYPE_LABELS[type]}</li>
        ))}
      </ul>
      <p className="mt-3">Try describing your problem using one of these categories.</p>
    </Panel>
  )
}

export function UnknownJurisdictionPanel({ supportedJurisdictions }: { supportedJurisdictions: JurisdictionHint[] }) {
  return (
    <Panel title="That location isn't one of the covered demo jurisdictions" icon={AlertTriangle} tone="warning">
      <p>This prototype only covers:</p>
      <ul className="mt-2 list-disc pl-6">
        {supportedJurisdictions.map((hint) => (
          <li key={hint}>{JURISDICTION_LABELS[hint]}</li>
        ))}
      </ul>
      <p className="mt-3">Choose one of the four synthetic demo locations above.</p>
    </Panel>
  )
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section role="alert" className="rounded-2xl border border-danger/40 bg-danger-soft p-6 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
        <XCircle className="h-5 w-5 text-danger" aria-hidden="true" />
        Something went wrong
      </h2>
      <p className="mt-2 text-base text-ink">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg border border-danger px-4 py-2 font-semibold text-danger transition-colors hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        Try again
      </button>
    </section>
  )
}
