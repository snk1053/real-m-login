import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const REDIRECT_KEY = 're-alm:redirect_uri'

export default function Login() {
  const [log, setLog] = useState('')

  const appendLog = (msg: string) =>
    setLog((prev) => prev + msg + '\n')

  // 🔹 redirect_uri を保存（OAuth 前）
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

  // 🔹 Google OAuth 開始
  const signInWithGoogle = async () => {
    appendLog('start google login')

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 🔑 必ず callback に戻す
        redirectTo: 'https://real-m-login.vercel.app/auth/callback',
      },
    })
  }

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
