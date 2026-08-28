'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { IssueForm, type FormErrors } from '@/app/components/handoff/IssueForm'
import { HandoffCard } from '@/app/components/handoff/HandoffCard'
import { StatusRegion } from '@/app/components/handoff/StatusRegion'
import {
  EmergencyPanel,
  EmptyStatePanel,
  ErrorPanel,
  NotCoveredPanel,
  OutOfScopePanel,
  UnknownJurisdictionPanel,
} from '@/app/components/handoff/OutcomePanels'
import { SYNTHETIC_LOCATIONS } from '@/app/lib/handoff-fixtures'
import { submitRoute } from '@/app/lib/handoff-client'
import type { RouteOutcome } from '@/app/lib/handoff-contract'

export default function Home() {
  const [message, setMessage] = useState('')
  const [locationId, setLocationId] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<RouteOutcome | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
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
      nextErrors.location = 'Choose one of the three synthetic demo locations.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setStatusMessage('There is a problem with your entry. See the messages below.')
      return
    }

    const location = SYNTHETIC_LOCATIONS.find((loc) => loc.id === locationId)
    if (!location) return

    setSubmitting(true)
    setStatusMessage('Finding the likely place to start…')
    setOutcome(null)

    const result = await submitRoute({
      message,
      syntheticLocationId: location.id,
      jurisdictionHint: location.jurisdictionHint,
    })

    setOutcome(result)
    setSubmitting(false)
    if (result.kind === 'ok') setStatusMessage('Result ready.')
    else if (result.kind === 'error') setStatusMessage('Something went wrong.')
    else if (result.kind === 'emergency') setStatusMessage('Emergency guidance ready.')
    else setStatusMessage('This request is outside what the prototype currently supports.')
  }

  function handleRetry() {
    setOutcome(null)
    setStatusMessage('')
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          CivicRoute BHM — find the likely place to start
        </h1>
        <p className="text-base text-zinc-700">
          Describe a public right-of-way problem and this tool will suggest which office
          most likely handles it, with its confidence and its source.
        </p>
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
          <strong>This is a prototype.</strong> It uses synthetic example locations and
          example office data only. It does not submit a service request to any real
          agency, and it does not collect a real address, name, phone number, or email.
        </div>
        <div className="w-fit rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Live application flow — synthetic example data
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
        <p className="text-base font-medium text-zinc-700">Finding the likely place to start…</p>
      )}

      {outcome && !submitting && (
        <div ref={resultHeadingRef} tabIndex={-1}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Served by the application API
          </p>
          {outcome.kind === 'ok' && <HandoffCard data={outcome.data} />}
          {outcome.kind === 'out_of_scope' && <OutOfScopePanel supportedIssueTypes={outcome.supportedIssueTypes} />}
          {outcome.kind === 'unknown_jurisdiction' && (
            <UnknownJurisdictionPanel supportedJurisdictions={outcome.supportedJurisdictions} />
          )}
          {outcome.kind === 'error' && <ErrorPanel message={outcome.message} onRetry={handleRetry} />}
          {outcome.kind === 'emergency' && (
            <EmergencyPanel message={outcome.message} disclaimer={outcome.disclaimer} />
          )}
          {outcome.kind === 'not_covered' && (
            <NotCoveredPanel
              reason={outcome.reason}
              conflictOrGap={outcome.conflictOrGap}
              disclaimer={outcome.disclaimer}
            />
          )}
        </div>
      )}
    </div>
  )
}
