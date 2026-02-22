import { useState, useEffect } from 'react'

const TURNSTILE_SITE_KEY = '0x4AAAAAACgTy04qy1vutytf'
const BREVO_ACTION =
  'https://99c7cbc2.sibforms.com/serve/MUIFAKcs-LJK_AAAjKMfi9aymTyNFXgtZ5rRXL6Ux83EyD2IrUcSDUyJWRlbhkR-b-Rv1Xt3BexoJVpNrqF7LzYleIZbyqlVvmLqBS5Ak1iO4R8ezgIbOJ1yqf3Ni-A-l3yQD4OX2zCexvUE-jUFlIlew-pyNB8MTw_qHa2y0pVqZ0lq5u17_Mkzu_stGMFIox8JPgkZc982Jer_'

interface Props {
  apiUrl: string
  lang: string
  placeholder: string
  cta: string
  successMsg: string
  errorMsg: string
}

export function NewsletterForm({ apiUrl, lang, placeholder, cta, successMsg, errorMsg }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (document.querySelector('script[src*="turnstile"]')) return
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const token = new FormData(e.currentTarget).get('cf-turnstile-response') as string
    if (!token) return

    setStatus('loading')

    try {
      const captchaRes = await fetch(`${apiUrl}/v1/captcha/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const captchaData = await captchaRes.json() as { data?: { success: boolean } }
      if (!captchaData.data?.success) throw new Error('captcha failed')

      const formData = new FormData()
      formData.append('EMAIL', email)
      formData.append('email_address_check', '')
      formData.append('locale', lang.slice(0, 2))
      await fetch(BREVO_ACTION, { method: 'POST', body: formData, mode: 'no-cors' })

      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return <p className="text-sm font-medium text-green-600">{successMsg}</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          placeholder={placeholder}
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          className="max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? '…' : cta}
        </button>
      </div>
      <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
      {status === 'error' && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}
    </form>
  )
}
