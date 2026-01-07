import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const REDIRECT_KEY = 're-alm:redirect_uri'

export default function AuthCallback() {
  // StrictMode / 二重実行対策
  const handledRef = useRef(false)

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('auth event:', event, session)

        // SIGNED_IN 以外は無視
        if (event !== 'SIGNED_IN') return
        if (handledRef.current) return
        handledRef.current = true

        // ① redirect_uri を取得
        const redirectUri = localStorage.getItem(REDIRECT_KEY)
        if (!redirectUri) {
          console.error('redirect_uri not found in storage')
          return
        }

        // ② access_token を取得
        const accessToken = session?.access_token
        if (!accessToken) {
          console.error('access_token missing')
          return
        }

        try {
          // ③ Re-alm 初期化
          console.log('calling ensure-realm-initialized')
          await fetch(process.env.NEXT_PUBLIC_REALM_INIT_URL!, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
          })

          // ④ Re-alm JWT 発行
          console.log('calling issue-realm-jwt')
          const res = await fetch(
            process.env.NEXT_PUBLIC_REALM_ISSUE_URL!,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              },
            }
          )

          if (!res.ok) {
            console.error('issue-realm-jwt failed', res.status)
            return
          }

          const json = await res.json()
          if (!json.token) {
            console.error('realm jwt missing in response')
            return
          }

          // ⑤ 後始末
          localStorage.removeItem(REDIRECT_KEY)

          // ⑥ 個別サービスへリダイレクト
          window.location.replace(
            `${redirectUri}?token=${encodeURIComponent(json.token)}`
          )
        } catch (e) {
          console.error('callback error', e)
        }
      }
    )

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <main
      style={{
        padding: 40,
        fontFamily: 'monospace',
        color: '#666',
      }}
    >
      Authenticating...
    </main>
  )
}
