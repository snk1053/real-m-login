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
   * redirect_uri の取得・保存・復元
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
        // query / hash を含めない（重要）
        redirectTo: `${window.location.origin}/login`,
      },
    })

    if (error) {
      appendLog('oauth error: ' + error.message)
    }
  }

  /**
   * Re-alm JWT 発行 → redirect_uri に戻す
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

    // 使い終わったら削除（重要）
    localStorage.removeItem(REDIRECT_STORAGE_KEY)

    window.location.href = `${redirectUri}?token=${json.token}`
  }

  /**
   * ✅ OAuth / セッション確立を正しく検知する唯一の方法
   */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && redirectUri) {
        appendLog('SIGNED_IN event detected')
        issueRealmJwt()
      }
    })

    return () => {
      subscription.unsubscribe()
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
