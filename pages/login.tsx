import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Supabase client（公開情報のみ）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Login() {
  const [redirectUri, setRedirectUri] = useState<string | null>(null)
  const [log, setLog] = useState<string>('')

  const appendLog = (msg: string) =>
    setLog((prev) => prev + msg + '\n')

  // クエリから redirect_uri を取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect_uri')
    setRedirectUri(redirect)
    appendLog('login page loaded')
  }, [])

  // Googleログイン開始
  const signInWithGoogle = async () => {
    appendLog('start google login')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href, // ログイン後このページに戻す
      },
    })
  }

  // Re-alm Edge Functions を呼び出して JWT を取得
  const issueRealmJwt = async () => {
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token

    if (!accessToken || !redirectUri) {
      appendLog('missing access token or redirect uri')
      return
    }

    appendLog('call ensure-realm-initialized')
    await fetch(process.env.NEXT_PUBLIC_REALM_INIT_URL!, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    appendLog('call issue-realm-jwt')
    const res = await fetch(
      process.env.NEXT_PUBLIC_REALM_ISSUE_URL!,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const json = await res.json()

    appendLog('redirect back to service')
    window.location.href =
      redirectUri + '?token=' + json.token
  }

  // すでにログイン済みなら自動処理
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && redirectUri) {
        appendLog('already logged in')
        issueRealmJwt()
      }
    })
  }, [redirectUri])

  return (
    <main style={{ padding: 40 }}>
      <h1>Real-m Login</h1>

      {!redirectUri && (
        <p style={{ color: 'red' }}>
          redirect_uri is missing
        </p>
      )}

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
