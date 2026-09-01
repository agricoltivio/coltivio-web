import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'
import { supabase } from '../lib/supabase'
import i18n from '../i18n'
import { getStoredActiveFarmId, notifyFarmSelectionIssue } from '../lib/activeFarm'

const baseUrl = import.meta.env.VITE_API_URL

if (!baseUrl) {
  throw new Error('Missing VITE_API_URL environment variable')
}

// A burst of parallel requests would otherwise each call supabase.auth.getSession(),
// and those race for the same Navigator LockManager lock ("lock:sb-*-auth-token"),
// producing noisy "Acquiring an exclusive ... lock immediately failed" errors.
// Share a single in-flight lookup instead.
let inFlightSession: ReturnType<typeof supabase.auth.getSession> | null = null
function getSessionDeduped() {
  if (!inFlightSession) {
    inFlightSession = supabase.auth.getSession().finally(() => {
      inFlightSession = null
    })
  }
  return inFlightSession
}

// Middleware to inject Authorization / Accept-Language / x-farm-id headers and to
// detect farm-selection problems in responses.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const { data: { session } } = await getSessionDeduped()
    if (session?.access_token) {
      request.headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    request.headers.set('Accept-Language', i18n.language)

    // Attach the active farm when one is selected. When none is selected the header is
    // omitted entirely — safe for users with 0 or 1 farm (backend auto-defaults).
    const userId = session?.user?.id
    if (userId) {
      const activeFarmId = getStoredActiveFarmId(userId)
      if (activeFarmId) {
        request.headers.set('x-farm-id', activeFarmId)
      }
    }
    return request
  },

  async onResponse({ response }) {
    if (!response.ok && (response.status === 400 || response.status === 403)) {
      try {
        const body = await response.clone().json()
        const message = typeof body?.error === 'string' ? body.error : ''
        if (message.includes('specify the X-Farm-Id header')) {
          notifyFarmSelectionIssue('ambiguous')
        } else if (
          response.status === 403 &&
          message.includes('not a member of the specified farm')
        ) {
          notifyFarmSelectionIssue('stale-membership')
        }
      } catch {
        // non-JSON body — nothing to do
      }
    }
    return response
  },
}

export const apiClient = createClient<paths>({ baseUrl })
apiClient.use(authMiddleware)
