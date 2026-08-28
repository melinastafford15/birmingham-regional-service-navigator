import { NextResponse } from 'next/server'
import { officeRepository } from '@/lib/repositories/json-repository'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    ok: true,
    officeCount: await officeRepository.count(),
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
  })
}
