import { NextResponse } from 'next/server'
import { getCricketDbOpenError } from '../cricketDb/client'
import { isCricketDbReadonlyError } from '../cricketDb/writeGuard'

export function cricketApiErrorResponse(e: unknown, fallback: string): NextResponse {
  const message = e instanceof Error ? e.message : fallback
  if (isCricketDbReadonlyError(e)) {
    return NextResponse.json({ error: message, readonly: true }, { status: 403 })
  }
  const status =
    message.includes('Cannot open SQLite') ||
    message.includes('Cannot create database') ||
    message.includes('Built-in stats database missing') ||
    message.includes('Bundled database') ||
    message.includes('Database error') ||
    getCricketDbOpenError()
      ? 503
      : 500
  return NextResponse.json({ error: message }, { status })
}
