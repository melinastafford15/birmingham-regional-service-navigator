/**
 * MOCK DATA — clearly synthetic, isolated from display components on purpose.
 *
 * Everything in this file is example content for the CivicRoute BHM prototype. None of
 * it is a real office, phone number, or public source. Do not import fixtures directly
 * into a component's JSX — pass them through the same shape a real API response would
 * take (see handoff-contract.ts / handoff-client.ts) so swapping the client later is a
 * one-file change.
 */
import {
  REQUIRED_DISCLAIMER,
  type HandoffResponse,
  type IssueType,
  type RouteOutcome,
  type SyntheticLocation,
} from './handoff-contract'

export const SYNTHETIC_LOCATIONS: SyntheticLocation[] = [
  {
    id: 'BHM-DEMO-01',
    jurisdictionHint: 'birmingham-al',
    label: 'Birmingham — residential sidewalk (synthetic)',
    description: 'A cracked, uplifted sidewalk panel on a residential block in Birmingham.',
    exampleMessage: 'The sidewalk is broken near my location',
  },
  {
    id: 'BHM-DEMO-02',
    jurisdictionHint: 'homewood-al',
    label: 'Homewood — storm-damaged tree limb (synthetic)',
    description: 'A large tree limb fell across the sidewalk and curb after a storm.',
    exampleMessage: 'A tree limb fell and is blocking the sidewalk',
  },
  {
    id: 'BHM-DEMO-03',
    jurisdictionHint: 'jefferson-county-al',
    label: 'Jefferson County — corner storm drain (synthetic)',
    description: 'A storm drain at a corner backs up and floods the street during heavy rain.',
    exampleMessage: 'The storm drain on the corner is blocked and water backs up every time it rains',
  },
  {
    id: 'BHM-DEMO-04',
    jurisdictionHint: 'birmingham-al',
    label: 'A "Birmingham" mailing address (synthetic)',
    description:
      'A mailing address that reads Birmingham but sits in a different city and a different county. Shows why the envelope does not decide who is responsible.',
    exampleMessage: 'The storm drain on the corner is blocked and water backs up every time it rains',
  },
]

function classifyIssueType(message: string): IssueType | null {
  const text = message.toLowerCase()
  if (/\bsidewalk\b/.test(text)) return 'sidewalk_damage'
  if (/\b(drain|drainage|flood|flooding|backs? ?up|standing water)\b/.test(text)) return 'blocked_drainage'
  if (/\b(tree|limb|branch|debris|fallen)\b/.test(text)) return 'fallen_tree_debris'
  if (/\b(pothole|road|street|pavement|asphalt)\b/.test(text)) return 'pothole_road_damage'
  return null
}

const BIRMINGHAM_SIDEWALK: HandoffResponse = {
  service: 'Public right-of-way maintenance',
  issue_subtype: 'sidewalk_damage',
  likely_responsible_entity: '[Synthetic] Birmingham Department of Public Works',
  jurisdiction: 'Birmingham city',
  reason:
    'Sidewalk maintenance within Birmingham city limits is handled by the city public works department under its right-of-way program.',
  confidence: 'high',
  conflict_or_gap: null,
  next_action: 'Contact Birmingham Public Works and reference the sidewalk panel location and the type of damage.',
  official_contact: {
    phone: '205-555-0117',
    email: null,
    form_url: 'https://example.invalid/birmingham/public-works/sidewalk-report',
  },
  sources: [
    {
      title: 'Sidewalk Maintenance and Repair',
      publisher: '[Synthetic] City of Birmingham Department of Public Works',
      url: 'https://example.invalid/birmingham/public-works/sidewalks',
      last_checked: '2026-08-28',
    },
  ],
  requires_human_confirmation: true,
  human_confirmation_instruction:
    'A Birmingham Public Works representative must confirm this location is within city right-of-way before any work is scheduled.',
  disclaimer: REQUIRED_DISCLAIMER,
}

const HOMEWOOD_TREE_DEBRIS: HandoffResponse = {
  service: 'Public right-of-way maintenance',
  issue_subtype: 'fallen_tree_debris',
  likely_responsible_entity: '[Synthetic] Homewood Public Works — Urban Forestry',
  jurisdiction: 'Homewood city',
  reason:
    'Fallen limbs and debris in the public right-of-way are typically cleared by the city urban forestry crew, but responsibility can shift if the tree originated on private property.',
  confidence: 'medium',
  conflict_or_gap:
    'It is unclear from the description alone whether the tree stood on public right-of-way or an adjacent private lot; that distinction changes who is responsible for removal.',
  next_action: 'Contact Homewood Public Works and describe exactly where the tree or limb is lying relative to the curb and sidewalk.',
  official_contact: {
    phone: '205-555-0142',
    email: 'publicworks@example.invalid',
    form_url: null,
  },
  sources: [
    {
      title: 'Storm Debris and Downed Trees',
      publisher: '[Synthetic] City of Homewood Public Works',
      url: 'https://example.invalid/homewood/public-works/storm-debris',
      last_checked: '2026-08-27',
    },
    {
      title: 'Right-of-Way Tree Maintenance Policy',
      publisher: '[Synthetic] City of Homewood Urban Forestry Board',
      url: 'https://example.invalid/homewood/urban-forestry/policy',
      last_checked: '2026-08-20',
    },
  ],
  requires_human_confirmation: true,
  human_confirmation_instruction:
    'A Homewood Public Works representative must confirm the debris is in the public right-of-way before crews are dispatched.',
  disclaimer: REQUIRED_DISCLAIMER,
}

const JEFFERSON_COUNTY_DRAINAGE: HandoffResponse = {
  service: 'Public right-of-way maintenance',
  issue_subtype: 'blocked_drainage',
  likely_responsible_entity: '[Synthetic] Jefferson County Roads and Transportation',
  jurisdiction: 'Jefferson County (unincorporated)',
  reason:
    'Storm drains along unincorporated county roads are generally maintained by the county roads department, but city and county storm-drain boundaries are frequently contested near annexed streets.',
  confidence: 'low',
  conflict_or_gap:
    'Published city and county sources both claim maintenance responsibility for storm drains on streets near this jurisdictional edge. This is a known, unresolved boundary — not a data error.',
  next_action:
    'Start with Jefferson County Roads and Transportation. If they redirect you, ask explicitly which office confirmed that redirection.',
  official_contact: {
    phone: '205-555-0188',
    email: null,
    form_url: null,
  },
  sources: [
    {
      title: 'County Road Drainage Maintenance',
      publisher: '[Synthetic] Jefferson County Roads and Transportation',
      url: 'https://example.invalid/jefferson-county/roads/drainage',
      last_checked: '2026-08-15',
    },
    {
      title: 'Municipal Annexation and Maintenance Boundaries',
      publisher: '[Synthetic] Jefferson County Planning and Zoning',
      url: 'https://example.invalid/jefferson-county/planning/annexation-boundaries',
      last_checked: '2026-07-30',
    },
  ],
  requires_human_confirmation: true,
  human_confirmation_instruction:
    'Because this is a contested boundary, a county representative must confirm responsibility before you are redirected elsewhere.',
  disclaimer: REQUIRED_DISCLAIMER,
}

/** Demonstrates null-safe contact rendering: only a form URL is on file, no phone or email. */
const HOMEWOOD_SIDEWALK_FORM_ONLY: HandoffResponse = {
  service: 'Public right-of-way maintenance',
  issue_subtype: 'sidewalk_damage',
  likely_responsible_entity: '[Synthetic] Homewood Public Works',
  jurisdiction: 'Homewood city',
  reason: 'Sidewalk maintenance within Homewood city limits is handled by the city public works department.',
  confidence: 'medium',
  conflict_or_gap: null,
  next_action: 'Submit a report through the Homewood Public Works online form with the sidewalk location and damage type.',
  official_contact: {
    phone: null,
    email: null,
    form_url: 'https://example.invalid/homewood/public-works/report-form',
  },
  sources: [
    {
      title: 'Sidewalk Repair Requests',
      publisher: '[Synthetic] City of Homewood Public Works',
      url: 'https://example.invalid/homewood/public-works/sidewalks',
      last_checked: '2026-08-10',
    },
  ],
  requires_human_confirmation: true,
  human_confirmation_instruction: 'A Homewood Public Works representative must confirm receipt of the online form before any work is scheduled.',
  disclaimer: REQUIRED_DISCLAIMER,
}

const FALLBACK_LOW_EVIDENCE: HandoffResponse = {
  service: 'Public right-of-way maintenance',
  issue_subtype: null,
  likely_responsible_entity: '[Synthetic] General public works intake — entity not yet determined',
  jurisdiction: 'Unresolved for this example',
  reason: 'The published example sources do not yet cover this specific combination of issue and location.',
  confidence: 'low',
  conflict_or_gap: 'Not enough matching source material exists in this prototype to name a single likely entity.',
  next_action: 'Try describing the issue with one of the supported categories, or contact the general public works line for the selected jurisdiction.',
  official_contact: null,
  sources: [],
  requires_human_confirmation: true,
  human_confirmation_instruction: 'Any office you reach must confirm responsibility directly — this result has low confidence.',
  disclaimer: REQUIRED_DISCLAIMER,
}

const RESPONSE_TABLE: Record<string, HandoffResponse> = {
  'BHM-DEMO-01:sidewalk_damage': BIRMINGHAM_SIDEWALK,
  'BHM-DEMO-02:fallen_tree_debris': HOMEWOOD_TREE_DEBRIS,
  'BHM-DEMO-02:sidewalk_damage': HOMEWOOD_SIDEWALK_FORM_ONLY,
  'BHM-DEMO-03:blocked_drainage': JEFFERSON_COUNTY_DRAINAGE,
}

export function getMockRouteOutcome(message: string, syntheticLocationId: string): RouteOutcome {
  const issueType = classifyIssueType(message)
  if (!issueType) {
    return { kind: 'out_of_scope', supportedIssueTypes: ['pothole_road_damage', 'sidewalk_damage', 'blocked_drainage', 'fallen_tree_debris'] }
  }
  const known = SYNTHETIC_LOCATIONS.some((loc) => loc.id === syntheticLocationId)
  if (!known) {
    return {
      kind: 'unknown_jurisdiction',
      supportedJurisdictions: ['birmingham-al', 'jefferson-county-al', 'homewood-al'],
    }
  }
  const key = `${syntheticLocationId}:${issueType}`
  const data = RESPONSE_TABLE[key] ?? FALLBACK_LOW_EVIDENCE
  return { kind: 'ok', data }
}
