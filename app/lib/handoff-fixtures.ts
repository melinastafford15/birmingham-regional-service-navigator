/**
 * UI descriptions for the frozen synthetic demo locations.
 *
 * IDs and jurisdiction mappings come directly from lib/contracts.ts. Keeping only
 * presentation copy here prevents the UI from creating a second routing contract.
 */
import {
  SYNTHETIC_LOCATIONS as CONTRACT_LOCATIONS,
  type SyntheticLocationId,
} from '@/lib/contracts'
import type { SyntheticLocation } from './handoff-contract'

const EXAMPLE_MESSAGES: Record<SyntheticLocationId, string> = {
  'BHM-DEMO-01': 'The sidewalk is broken near my location',
  'BHM-DEMO-02': 'The roadside ditch is flooding near this unincorporated county location',
  'BHM-DEMO-03': 'A tree is blocking the public roadway after a storm',
}

export const SYNTHETIC_LOCATIONS: SyntheticLocation[] = CONTRACT_LOCATIONS.map((location) => ({
  id: location.id,
  jurisdictionHint: location.jurisdiction,
  label: location.label,
  description: location.demonstrates,
  exampleMessage: EXAMPLE_MESSAGES[location.id],
}))
