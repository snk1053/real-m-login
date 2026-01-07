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
    const run = async () => {
      if (handledRef.current) return
      handledRef.current = true

      // ① redirect_uri を取得（localStorage）
      const redirectUri = localStorage.getItem(REDIRECT_KEY)

      if (!redirectUri) {
        console.error('redirect_uri not found in localStorage')
        return
      }

      // ② Supabase session を取得
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session) {
        console.error('session not found', error)
        return
      }

      const accessToken = data.session.access_token

      // ③ realm 初期化
      await fetch(process.env.NEXT_PUBLIC_REALM_INIT_URL!, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      // ④ realm JWT 発行
      const res = await fetch(
        process.env.NEXT_PUBLIC_REALM_ISSUE_URL!,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
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

      // ⑤ 後始末
      localStorage.removeItem(REDIRECT_KEY)

      // ⑥ 個別サービスへリダイレクト
      window.location.replace(
        `${redirectUri}?token=${encodeURIComponent(json.token)}`
      )
    }

    run()
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
