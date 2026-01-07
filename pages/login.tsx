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
        redirectTo: 'https://real-m-login.vercel.app/auth/callback',
      },
    })
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(ellipse at top, #1a1a1a, #000)',
        color: '#fff',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont',
      }}
    >
      <div
        style={{
          width: 360,
          padding: '48px 40px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(8px)',
          boxShadow:
            '0 20px 40px rgba(0,0,0,0.6)',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            marginBottom: 8,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          Realmログイン
        </h1>

        <p
          style={{
            marginBottom: 32,
            fontSize: 14,
            opacity: 0.7,
          }}
        >
          Playable Realityを手に入れろ
        </p>

        <button
          onClick={signInWithGoogle}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 10,
            border: 'none',
            background:
              'linear-gradient(135deg, #ffffff, #dcdcdc)',
            color: '#000',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Googleアカウントで認証
        </button>

        <pre
          style={{
            marginTop: 24,
            padding: 12,
            background: '#0b0b0b',
            color: '#0f0',
            fontSize: 11,
            textAlign: 'left',
            borderRadius: 8,
            maxHeight: 120,
            overflow: 'auto',
          }}
        >
          {log}
        </pre>
      </div>
    </main>
  )
}
