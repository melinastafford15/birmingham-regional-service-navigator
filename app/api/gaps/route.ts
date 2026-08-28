import { NextResponse } from 'next/server'
import { listGaps } from '@/lib/gaps'

export const runtime = 'nodejs'

export async function GET() {
  const entries = listGaps()
  return NextResponse.json({ count: entries.length, entries })
}
