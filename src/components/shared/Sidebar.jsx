import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Users, Calendar, Mail, LogOut } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Job Searches', icon: Briefcase },
  { to: '/candidates', label: 'Candidates', icon: Users },
  { to: '/interviews', label: 'Interviews', icon: Calendar },
  { to: '/inbox', label: 'Hiring Inbox', icon: Mail },
]

export default function Sidebar() {
  const { stats } = useApp()
  const { user, profile, signOut } = useAuth()

  return (
    <aside className="w-64 bg-brand-dark flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="AgentHire Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">AgentHire</p>
            <p className="text-white/50 text-xs">Burtch Team · C21 Sunbelt</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-red text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`
            }
          >
            <Icon size={18} />
            {label}
            {label === 'Job Searches' && stats.openSearches > 0 && (
              <span className="ml-auto bg-brand-gold text-brand-dark text-xs font-bold px-2 py-0.5 rounded-full">
                {stats.openSearches}
              </span>
            )}
            {label === 'Interviews' && stats.interviewsScheduled > 0 && (
              <span className="ml-auto bg-brand-gold text-brand-dark text-xs font-bold px-2 py-0.5 rounded-full">
                {stats.interviewsScheduled}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-white/10 space-y-3">
        {user && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-full bg-brand-red flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white/80 text-xs font-medium truncate">
                {profile?.full_name || user.email}
              </p>
              <p className="text-white/30 text-xs truncate">{profile?.role || 'Recruiter'}</p>
            </div>
          </div>
        )}
        {isSupabaseConfigured && (
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={15} /> Sign Out
          </button>
        )}
        <p className="text-white/20 text-xs text-center">© 2026 Burtch Team</p>
      </div>
    </aside>
  )
}
