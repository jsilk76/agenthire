import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { isSupabaseConfigured } from './lib/supabase'
import Sidebar from './components/shared/Sidebar'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Candidates from './pages/Candidates'
import CandidateProfile from './pages/CandidateProfile'
import Interviews from './pages/Interviews'
import HiringInbox from './pages/HiringInbox'
import Login from './pages/Login'
import { Loader2 } from 'lucide-react'

function ProtectedApp() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="text-white animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading AgentHire…</p>
        </div>
      </div>
    )
  }

  // Supabase configured → require login. Otherwise run in local/demo mode.
  if (isSupabaseConfigured && !user) {
    return <Login />
  }

  return (
    <AppProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/"               element={<Dashboard />} />
            <Route path="/jobs"           element={<Jobs />} />
            <Route path="/candidates"     element={<Candidates />} />
            <Route path="/candidates/:id" element={<CandidateProfile />} />
            <Route path="/interviews"     element={<Interviews />} />
            <Route path="/inbox"          element={<HiringInbox />} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  )
}
