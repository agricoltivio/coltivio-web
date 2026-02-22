import { useRef, useEffect } from 'react'

const LANGUAGES = [
  { code: 'de', label: 'DE', href: '/' },
  { code: 'fr', label: 'FR', href: '/fr' },
  { code: 'it', label: 'IT', href: '/it' },
  { code: 'en', label: 'EN', href: '/en' },
] as const

interface Props {
  lang: string
}

export function LanguageSwitcher({ lang }: Props) {
  const currentLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? 'DE'
  const detailsRef = useRef<HTMLDetailsElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <details ref={detailsRef} className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors select-none">
        {/* Globe icon (inline SVG, same as lucide Globe) */}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
          <path d="M2 12h20"/>
        </svg>
        <span>{currentLabel}</span>
      </summary>
      <ul className="absolute right-0 top-full z-50 mt-1 min-w-[6rem] rounded-md border bg-background shadow-md py-1">
        {LANGUAGES.map((l) => (
          <li key={l.code}>
            <a
              href={l.href}
              className={`block px-3 py-1.5 text-sm hover:bg-muted transition-colors ${lang === l.code ? 'font-semibold' : 'text-muted-foreground'}`}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
