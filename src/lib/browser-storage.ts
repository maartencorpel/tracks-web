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

export const sessionStorage = {
  get(key: string): string | null {
    return safeRun(() => window.sessionStorage.getItem(key))
  },
  set(key: string, value: string): void {
    safeRun(() => {
      window.sessionStorage.setItem(key, value)
      return null
    })
  },
  remove(key: string): void {
    safeRun(() => {
      window.sessionStorage.removeItem(key)
      return null
    })
  },
}

export const PENDING_GAME_ID_KEY = 'pendingGameId'
export const SPOTIFY_ACCESS_TOKEN_KEY = 'spotifyAccessToken'
export const SELECTED_QUESTIONS_KEY_PREFIX = 'selectedQuestions_'
export const QUESTIONS_CACHE_KEY = 'questionsCache'

export function getSelectedQuestionsKey(gameId: string): string {
  return `${SELECTED_QUESTIONS_KEY_PREFIX}${gameId}`
}

interface QuestionsCache {
  questions: any[]
  timestamp: number
}

export function getQuestionsCache(): any[] | null {
  const cached = browserStorage.get(QUESTIONS_CACHE_KEY)
  if (!cached) {
    return null
  }

  try {
    const data: QuestionsCache = JSON.parse(cached)
    return data.questions
  } catch {
    return null
  }
}

export function setQuestionsCache(questions: any[], ttlMs: number): void {
  const cache: QuestionsCache = {
    questions,
    timestamp: Date.now() + ttlMs,
  }
  browserStorage.set(QUESTIONS_CACHE_KEY, JSON.stringify(cache))
}

export function isQuestionsCacheValid(): boolean {
  const cached = browserStorage.get(QUESTIONS_CACHE_KEY)
  if (!cached) {
    return false
  }

  try {
    const data: QuestionsCache = JSON.parse(cached)
    return Date.now() < data.timestamp
  } catch {
    return false
  }
}
