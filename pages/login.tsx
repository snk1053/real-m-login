import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const REDIRECT_STORAGE_KEY = 'real_m_redirect_uri'

export default function Login() {
  const [redirectUri, setRedirectUri] = useState<string | null>(null)
  const [log, setLog] = useState('')
  const [processing, setProcessing] = useState(false)

  const appendLog = (msg: string) =>
    setLog((prev) => prev + msg + '\n')

  /**
   * redirect_uri の取得と復元
   * - 初回: query から取得して localStorage に保存
   * - OAuth 後: localStorage から復元
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect_uri')

    if (redirect) {
      localStorage.setItem(REDIRECT_STORAGE_KEY, redirect)
      setRedirectUri(redirect)
      appendLog('redirect_uri saved')
    } else {
      const saved = localStorage.getItem(REDIRECT_STORAGE_KEY)
      setRedirectUri(saved)
      appendLog('redirect_uri restored')
    }

    appendLog('login page loaded')
  }, [])

  /**
   * Google ログイン開始
   */
  const signInWithGoogle = async () => {
    appendLog('start google login')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // query / hash を含めないのが重要
        redirectTo: `${window.location.origin}/login`,
      },
    })

    if (error) {
      appendLog('oauth error: ' + error.message)
    }
  }

  /**
   * Re-alm JWT 発行 → 元サービスへリダイレクト
   */
  const issueRealmJwt = async () => {
    if (processing) return
    if (!redirectUri) {
      appendLog('redirect_uri missing, abort')
      return
    }

    setProcessing(true)

    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token

    if (!accessToken) {
      appendLog('missing access token')
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

    if (!res.ok) {
      appendLog('issue realm jwt failed')
      setProcessing(false)
      return
    }

    const json = await res.json()

    if (!json.token) {
      appendLog('token missing in response')
      setProcessing(false)
      return
    }

    appendLog('redirect back to service')

    // 使い終わったら消す（重要）
    localStorage.removeItem(REDIRECT_STORAGE_KEY)

    window.location.href = `${redirectUri}?token=${json.token}`
  }

  /**
   * OAuth コールバック検知
   * (#access_token が付いた状態)
   */
  useEffect(() => {
    const hasAccessToken = window.location.hash.includes('access_token')

    if (hasAccessToken) {
      appendLog('oauth callback detected')

      // Supabase が session を復元するのを待つ
      setTimeout(() => {
        issueRealmJwt()
      }, 300)
    }
  }, [redirectUri])

  /**
   * 既存セッション（SSO）
   */
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
        <p style={{ color: 'red' }}>redirect_uri is missing</p>
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
