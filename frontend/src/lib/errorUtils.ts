import axios, { AxiosError } from 'axios'

interface ValidationDetail {
  loc?: Array<string | number>
  msg?: string
  type?: string
  ctx?: Record<string, unknown>
  [key: string]: unknown
}

type WithDetail = {
  detail?: string | ValidationDetail | Array<string | ValidationDetail>
}

const FALLBACK_MESSAGE = 'Unexpected error. Please try again.'

function formatDetailItem(item: string | ValidationDetail | undefined): string | undefined {
  if (!item) {
    return undefined
  }

  if (typeof item === 'string') {
    return item
  }

  const path = Array.isArray(item.loc) ? item.loc.join(' > ') : item.loc
  if (item.msg && path) {
    return `${path}: ${item.msg}`
  }

  if (item.msg) {
    return item.msg
  }

  try {
    return JSON.stringify(item)
  } catch {
    return undefined
  }
}

function safeStringify(value: unknown): string | undefined {
  try {
    return JSON.stringify(value)
  } catch (error) {
    console.error('Failed to serialize error', error)
    return undefined
  }
}

export function formatApiError(error: unknown, fallback = FALLBACK_MESSAGE): string {
  if (axios.isAxiosError(error)) {
    const apiError = error as AxiosError<WithDetail>
    const detail = apiError.response?.data?.detail

    if (typeof detail === 'string') {
      return detail
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => formatDetailItem(item))
        .filter((value): value is string => Boolean(value))

      if (messages.length) {
        return messages.join('; ')
      }
    }

    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      const formatted = formatDetailItem(detail)
      if (formatted) {
        return formatted
      }
    }

    if (apiError.message) {
      return apiError.message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return safeStringify(error) ?? fallback
}
