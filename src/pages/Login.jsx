import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Loader2, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
  const [form, setForm] = useState({ email: '', password: '', fullName: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password)
      } else if (mode === 'signup') {
        await signUp(form.email, form.password, form.fullName)
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('login')
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setSuccess('Check your email for a password reset link!')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <img src="/logo.png" alt="AgentHire Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">AgentHire</h1>
          <p className="text-white/50 text-sm mt-1">Burtch Team · Century 21 Sunbelt</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Tab toggle — hidden on reset screen */}
          {mode !== 'reset' && (
            <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
              {['login', 'signup'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(''); setSuccess('') }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>
          )}

          {/* Reset mode header */}
          {mode === 'reset' && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Reset Password</h2>
              <p className="text-sm text-gray-500 mt-1">Enter your email and we'll send you a reset link.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="input pl-9"
                    placeholder="Jayson Burtch"
                    value={form.fullName}
                    onChange={set('fullName')}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input pl-9"
                  type="email"
                  placeholder="you@burtchteam.com"
                  value={form.email}
                  onChange={set('email')}
                  required
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="input pl-9"
                    type="password"
                    placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                    value={form.password}
                    onChange={set('password')}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                <CheckCircle size={15} className="shrink-0 mt-0.5" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> {mode === 'reset' ? 'Sending…' : mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                : mode === 'reset' ? 'Send Reset Link' : mode === 'login' ? 'Sign In' : 'Create Account'
              }
            </button>
          </form>

          {/* Footer links */}
          {mode === 'login' && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                onClick={() => { setMode('reset'); setError(''); setSuccess('') }}
                className="text-xs text-gray-400 hover:text-brand-red hover:underline"
              >
                Forgot password?
              </button>
              <p className="text-xs text-gray-400">
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="text-brand-red hover:underline font-medium">
                  Sign up
                </button>
              </p>
            </div>
          )}

          {mode === 'reset' && (
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600 hover:underline"
            >
              ← Back to Sign In
            </button>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          © 2026 Burtch Team. Internal use only.
        </p>
      </div>
    </div>
  )
}
