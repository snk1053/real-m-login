import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthCallback() {
  // StrictMode / 再レンダリング対策
  const handledRef = useRef(false)

  useEffect(() => {
    const run = async () => {
      if (handledRef.current) return
      handledRef.current = true

      // ① 保存しておいた redirect_uri を取得
      const redirectUri = sessionStorage.getItem('redirect_uri')

      if (!redirectUri) {
        console.error('redirect_uri not found in sessionStorage')
        return
      }

      // ② Supabase session を取得（OAuth 復帰後）
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session) {
        console.error('session not found', error)
        return
      }

      const accessToken = data.session.access_token

      // ③ Re-alm 初期化（初回のみ内部で効く）
      await fetch(process.env.NEXT_PUBLIC_REALM_INIT_URL!, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      // ④ Re-alm JWT 発行
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

      // ⑤ 後始末（重要）
      sessionStorage.removeItem('redirect_uri')

      // ⑥ 個別サービスへ戻す
      window.location.replace(
        `${redirectUri}?token=${encodeURIComponent(json.token)}`
      )
    }

    run()
  }, [])

  // 画面は一切見せない
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
