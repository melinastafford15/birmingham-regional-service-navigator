'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Info } from 'lucide-react'
import { IssueForm, type FormErrors } from '@/app/components/handoff/IssueForm'
import { HandoffCard } from '@/app/components/handoff/HandoffCard'
import { StatusRegion } from '@/app/components/handoff/StatusRegion'
import { EmptyStatePanel, ErrorPanel, OutOfScopePanel, UnknownJurisdictionPanel } from '@/app/components/handoff/OutcomePanels'
import { SYNTHETIC_LOCATIONS } from '@/app/lib/handoff-fixtures'
import { getApiMode, submitRoute } from '@/app/lib/handoff-client'
import type { RouteOutcome } from '@/app/lib/handoff-contract'

export default function Home() {
  const [message, setMessage] = useState('')
  const [locationId, setLocationId] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<RouteOutcome | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [lastMode, setLastMode] = useState<'mock' | 'live' | null>(null)
  const resultHeadingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (outcome && !submitting) {
      resultHeadingRef.current?.focus()
    }
  }, [outcome, submitting])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const nextErrors: FormErrors = {}
    if (!message.trim()) {
      nextErrors.message = 'Describe the problem before continuing.'
    }
    if (!locationId) {
      nextErrors.location = 'Choose one of the four synthetic demo locations.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setStatusMessage('There is a problem with your entry. See the messages below.')
      return
    }

    const location = SYNTHETIC_LOCATIONS.find((loc) => loc.id === locationId)
    if (!location) return

    const mode = getApiMode()
    setSubmitting(true)
    setStatusMessage('Finding the likely place to start…')
    setOutcome(null)
    setLastMode(mode)

    const result = await submitRoute({
      message,
      syntheticLocationId: location.id,
      jurisdictionHint: location.jurisdictionHint,
      mode,
    })

    setOutcome(result)
    setSubmitting(false)
    setStatusMessage(
      result.kind === 'ok'
        ? 'Result ready.'
        : result.kind === 'error'
          ? 'Something went wrong.'
          : 'This request is outside what the prototype currently supports.',
    )
  }

  function handleRetry() {
    setOutcome(null)
    setStatusMessage('')
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-accent">
          Resident tool · Prototype
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          CivicRoute BHM — find the likely place to start
        </h1>
        <p className="text-base text-ink-muted">
          Describe a public right-of-way problem and this tool will suggest which office
          most likely handles it, with its confidence and its source.
        </p>
        <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent-soft p-3 text-sm text-ink">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <p>
            <strong className="font-semibold">This is a prototype.</strong> It uses synthetic
            example locations. Office contacts are a mix of verified public listings and
            example placeholders; anything unverified is marked{' '}
            <strong className="font-semibold">[Synthetic]</strong> wherever it appears. It does
            not submit a service request to any real agency, and it does not collect a real
            address, name, phone number, or email.
          </p>
        </div>
        <div className="w-fit rounded-full border border-border bg-card px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Demo mode — showing example responses
        </div>
      </header>

      <StatusRegion message={statusMessage} />

      {!outcome && !submitting && <EmptyStatePanel />}

      <IssueForm
        message={message}
        onMessageChange={setMessage}
        locationId={locationId}
        onLocationChange={setLocationId}
        errors={errors}
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      {submitting && (
        <p className="text-base font-medium text-ink-muted">Finding the likely place to start…</p>
      )}

      {outcome && !submitting && (
        <div ref={resultHeadingRef} tabIndex={-1}>
          {lastMode === 'live' && (
            <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Served by the live API
            </p>
          )}
          {outcome.kind === 'ok' && <HandoffCard data={outcome.data} />}
          {outcome.kind === 'out_of_scope' && <OutOfScopePanel supportedIssueTypes={outcome.supportedIssueTypes} />}
          {outcome.kind === 'unknown_jurisdiction' && (
            <UnknownJurisdictionPanel supportedJurisdictions={outcome.supportedJurisdictions} />
          )}
          {outcome.kind === 'error' && <ErrorPanel message={outcome.message} onRetry={handleRetry} />}
        </div>
      )}
    </div>
  )
}
