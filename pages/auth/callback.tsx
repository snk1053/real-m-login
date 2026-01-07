import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthCallback() {
  const handledRef = useRef(false)

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('auth event:', event)

        if (event !== 'SIGNED_IN') return
        if (handledRef.current) return
        handledRef.current = true

        const redirectUri = localStorage.getItem('re-alm:redirect_uri')
        if (!redirectUri) {
          console.error('redirect_uri missing')
          return
        }

        const accessToken = session?.access_token
        if (!accessToken) {
          console.error('access token missing')
          return
        }

        console.log('calling ensure realm')

        await fetch(process.env.NEXT_PUBLIC_REALM_INIT_URL!, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        console.log('calling issue realm jwt')

        const res = await fetch(
          process.env.NEXT_PUBLIC_REALM_ISSUE_URL!,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        )

        if (!res.ok) {
          console.error('issue realm jwt failed', res.status)
          return
        }

        const json = await res.json()

        if (!json.token) {
          console.error('realm jwt missing')
          return
        }

        localStorage.removeItem('re-alm:redirect_uri')

        window.location.replace(
          `${redirectUri}?token=${encodeURIComponent(json.token)}`
        )
      }
    )

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  return <div>Authenticating...</div>
}
