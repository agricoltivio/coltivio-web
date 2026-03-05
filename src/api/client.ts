import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'
import { supabase } from '../lib/supabase'
import i18n from '../i18n'

const baseUrl = import.meta.env.VITE_API_URL

if (!baseUrl) {
  throw new Error('Missing VITE_API_URL environment variable')
}

// Middleware to inject Authorization and Accept-Language headers
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      request.headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    request.headers.set('Accept-Language', i18n.language)
    return request
  },
}

export const apiClient = createClient<paths>({ baseUrl })
apiClient.use(authMiddleware)
