import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const REDIRECT_KEY = 're-alm:redirect_uri'

export default function AuthCallback() {
  const handledRef = useRef(false)

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('auth event:', event)

        if (handledRef.current) return
        if (event !== 'SIGNED_IN') return
        if (!session?.access_token) return

        handledRef.current = true

        const redirectUri = localStorage.getItem(REDIRECT_KEY)
        if (!redirectUri) {
          console.error('redirect_uri not found')
          return
        }

        const accessToken = session.access_token

        // realm 初期化
        await fetch(process.env.NEXT_PUBLIC_REALM_INIT_URL!, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        // realm jwt 発行
        const res = await fetch(
          process.env.NEXT_PUBLIC_REALM_ISSUE_URL!,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        )

        if (!res.ok) {
          console.error('issue realm jwt failed')
          return
        }

        const json = await res.json()
        if (!json.token) {
          console.error('realm jwt missing')
          return
        }

        localStorage.removeItem(REDIRECT_KEY)

        window.location.replace(
          `${redirectUri}?token=${encodeURIComponent(json.token)}`
        )
      }
    )

    return () => {
      sub.data.subscription.unsubscribe()
    }
  }, [])

  return (
    <main style={{ padding: 40, color: '#666' }}>
      Authenticating...
    </main>
  )
}
