const isBrowser = () => typeof window !== 'undefined'

const safeRun = <T>(fn: () => T | null): T | null => {
  try {
    if (!isBrowser()) return null
    return fn()
  } catch {
    return null
  }
}

export const browserStorage = {
  get(key: string): string | null {
    return safeRun(() => window.localStorage.getItem(key))
  },
  set(key: string, value: string): void {
    safeRun(() => {
      window.localStorage.setItem(key, value)
      return null
    })
  },
  remove(key: string): void {
    safeRun(() => {
      window.localStorage.removeItem(key)
      return null
    })
  },
}

export const PENDING_GAME_ID_KEY = 'pendingGameId'
