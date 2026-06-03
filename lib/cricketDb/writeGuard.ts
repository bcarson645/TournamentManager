import { isCricketDbReadonly } from './path'

export class CricketDbReadonlyError extends Error {
  constructor() {
    super(
      'This deployment uses built-in T20 stats (read-only). CSV import and mapping edits are disabled locally; refresh the bundled database in the repo to update stats.',
    )
    this.name = 'CricketDbReadonlyError'
  }
}

export function assertCricketDbWritable(): void {
  if (isCricketDbReadonly()) {
    throw new CricketDbReadonlyError()
  }
}

export function isCricketDbReadonlyError(e: unknown): boolean {
  return e instanceof CricketDbReadonlyError
}
