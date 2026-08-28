import type { ReactNode } from 'react'
import { ISSUE_TYPE_LABELS, JURISDICTION_LABELS, type IssueType, type JurisdictionHint } from '@/app/lib/handoff-contract'

function Panel({ title, tone, children }: { title: string; tone: 'info' | 'warning'; children: ReactNode }) {
  const toneClass = tone === 'warning' ? 'border-amber-700 bg-amber-50' : 'border-zinc-300 bg-zinc-50'
  return (
    <section role="status" aria-live="polite" className={`rounded-xl border p-6 ${toneClass}`}>
      <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
      <div className="mt-2 text-base text-zinc-800">{children}</div>
    </section>
  )
}

export function EmptyStatePanel() {
  return (
    <Panel title="What this tool covers" tone="info">
      <p>
        CivicRoute BHM helps you find the likely place to start for a public
        right-of-way issue in Birmingham, Jefferson County, or Homewood. It supports:
      </p>
      <ul className="mt-2 list-disc pl-6">
        {Object.values(ISSUE_TYPE_LABELS).map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-zinc-600">
        Describe your problem and choose one of three synthetic demo locations below to
        see an example result.
      </p>
    </Panel>
  )
}

export function OutOfScopePanel({ supportedIssueTypes }: { supportedIssueTypes: IssueType[] }) {
  return (
    <Panel title="This doesn't match a supported issue type" tone="warning">
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
    <Panel title="That location isn't one of the covered demo jurisdictions" tone="warning">
      <p>This prototype only covers:</p>
      <ul className="mt-2 list-disc pl-6">
        {supportedJurisdictions.map((hint) => (
          <li key={hint}>{JURISDICTION_LABELS[hint]}</li>
        ))}
      </ul>
      <p className="mt-3">Choose one of the three synthetic demo locations above.</p>
    </Panel>
  )
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section role="alert" className="rounded-xl border border-red-700 bg-red-50 p-6">
      <h2 className="text-lg font-bold text-red-900">Something went wrong</h2>
      <p className="mt-2 text-base text-red-900">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md border border-red-700 px-4 py-2 font-semibold text-red-900 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900"
      >
        Try again
      </button>
    </section>
  )
}
