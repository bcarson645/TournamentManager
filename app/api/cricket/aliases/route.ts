import { NextResponse } from 'next/server'
import { deleteAlias, listAliases, upsertAlias } from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return NextResponse.json({ aliases: listAliases() })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to list aliases'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { appName: string; playerId: string; notes?: string }
    if (!body.appName?.trim() || !body.playerId?.trim()) {
      return NextResponse.json({ error: 'appName and playerId required' }, { status: 400 })
    }
    upsertAlias(body.appName, body.playerId, body.notes ?? null)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Save failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const appName = searchParams.get('appName')
    if (!appName) return NextResponse.json({ error: 'appName required' }, { status: 400 })
    deleteAlias(appName)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Delete failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
