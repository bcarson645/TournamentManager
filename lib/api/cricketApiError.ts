import { NextResponse } from 'next/server'
import { getCricketDbOpenError } from '../cricketDb/client'

export function cricketApiErrorResponse(e: unknown, fallback: string): NextResponse {
  const message = e instanceof Error ? e.message : fallback
  const status =
    message.includes('Cannot open SQLite') ||
    message.includes('Cannot create database') ||
    message.includes('Database error') ||
    getCricketDbOpenError()
      ? 503
      : 500
  return NextResponse.json({ error: message }, { status })
}
