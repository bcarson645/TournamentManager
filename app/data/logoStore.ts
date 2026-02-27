const logoStore: Record<string, string> = {}

export function getTeamLogo(teamId: string): string | null {
  return logoStore[teamId] ?? null
}

export function setTeamLogo(teamId: string, dataUrl: string): void {
  logoStore[teamId] = dataUrl
}
