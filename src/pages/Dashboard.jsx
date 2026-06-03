import React from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Users, Calendar, TrendingUp, ArrowRight, Star } from 'lucide-react'
import { useApp } from '../context/AppContext'
import StatusBadge from '../components/shared/StatusBadge'
import ScoreRing from '../components/shared/ScoreRing'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { stats, jobs, candidates, interviews } = useApp()

  const recentCandidates = [...candidates]
    .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
    .slice(0, 5)

  const upcomingInterviews = interviews
    .filter(i => i.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_at || a.scheduledAt) - new Date(b.scheduled_at || b.scheduledAt))
    .slice(0, 3)

  const topCandidates = candidates
    .filter(c => c.score_breakdown || c.aiScore)
    .sort((a, b) => {
      const aS = (a.score_breakdown || a.aiScore)?.overallScore || 0
      const bS = (b.score_breakdown || b.aiScore)?.overallScore || 0
      return bS - aS
    })
    .slice(0, 3)

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Burtch Team hiring overview — Southwest Florida</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-5">
        <StatCard icon={Briefcase} label="Open Job Searches" value={stats.openSearches} sub="Active positions" color="bg-brand-red" />
        <StatCard icon={Users} label="Total Candidates" value={stats.totalCandidates} sub="Across all searches" color="bg-blue-500" />
        <StatCard icon={Calendar} label="Interviews Scheduled" value={stats.interviewsScheduled} sub="Upcoming" color="bg-green-500" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Active Job Searches */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Active Job Searches</h2>
            <Link to="/jobs" className="text-brand-red text-sm font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {jobs.filter(j => j.status === 'active').map(job => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-brand-red/30 hover:bg-red-50/30 transition-colors group">
                <div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-brand-red">{job.title || job.role}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{job.counties.slice(0, 3).join(', ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{job.candidateCount} candidates</span>
                  <StatusBadge status={job.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top AI-Scored Candidates */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Star size={16} className="text-brand-gold" /> Top Candidates
            </h2>
            <Link to="/candidates" className="text-brand-red text-sm font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {topCandidates.map(c => {
              const sb = c.score_breakdown || c.aiScore
              return (
                <Link key={c.id} to={`/candidates/${c.id}`} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-brand-red/30 hover:bg-red-50/30 transition-colors group">
                  <ScoreRing score={sb.overallScore} size={52} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-red truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sb.summary?.slice(0, 60)}…</p>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              )
            })}
            {topCandidates.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No AI-scored candidates yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Interviews */}
      {upcomingInterviews.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Upcoming Interviews</h2>
            <Link to="/interviews" className="text-brand-red text-sm font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {upcomingInterviews.map(interview => {
              const candidate = candidates.find(c => c.id === (interview.candidate_id || interview.candidateId))
              const job = jobs.find(j => j.id === (interview.job_id || interview.jobId))
              const dt = new Date(interview.scheduled_at || interview.scheduledAt)
              return (
                <div key={interview.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{candidate?.name}</p>
                    <p className="text-xs text-gray-400">{job?.title || job?.role} · {interview.type || interview.format}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">
                      {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
