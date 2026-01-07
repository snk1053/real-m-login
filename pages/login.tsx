import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const REDIRECT_KEY = 're-alm:redirect_uri'

export default function Login() {
  const [log, setLog] = useState('')
  const [processing, setProcessing] = useState(false)

  const appendLog = (msg: string) =>
    setLog((prev) => prev + msg + '\n')

  // 🔹 初期化：redirect_uri を保存
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect_uri')

    if (redirect) {
      localStorage.setItem(REDIRECT_KEY, redirect)
      appendLog('redirect_uri saved')
    } else {
      appendLog('redirect_uri missing in URL')
    }
  }, [])

  // 🔹 Googleログイン
  const signInWithGoogle = async () => {
    appendLog('start google login')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    })
  }

  // 🔹 Realm JWT 発行 → リダイレクト
  const issueRealmJwt = async () => {
    if (processing) return
    setProcessing(true)

    const redirectUri = localStorage.getItem(REDIRECT_KEY)
    if (!redirectUri) {
      appendLog('redirect_uri not found in storage')
      return
    }

    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token

    if (!accessToken) {
      appendLog('access token missing')
      setProcessing(false)
      return
    }

    appendLog('ensure realm initialized')
    await fetch(process.env.NEXT_PUBLIC_REALM_INIT_URL!, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    appendLog('issue realm jwt')
    const res = await fetch(process.env.NEXT_PUBLIC_REALM_ISSUE_URL!, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const json = await res.json()

    if (!json.token) {
      appendLog('realm jwt missing')
      setProcessing(false)
      return
    }

    appendLog('redirecting back to service')
    localStorage.removeItem(REDIRECT_KEY)

    window.location.href = `${redirectUri}?token=${json.token}`
  }

  // 🔹 OAuth / 既存セッションを検知（唯一の入口）
  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      appendLog(`auth event: ${event}`)

      if (session?.access_token) {
        issueRealmJwt()
      }
    })

    return () => {
      sub.data.subscription.unsubscribe()
    }
  }, [])

  return (
    <main style={{ padding: 40 }}>
      <h1>Real-m Login</h1>

      <button onClick={signInWithGoogle}>
        Sign in with Google
      </button>

      <pre
        style={{
          marginTop: 20,
          padding: 10,
          background: '#111',
          color: '#0f0',
          fontSize: 12,
        }}
      >
        {log}
      </pre>
    </main>
  )
}
