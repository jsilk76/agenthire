import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Briefcase, Calendar, Loader2, Star, AlertTriangle, CheckCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ScoreRing from '../components/shared/ScoreRing'
import StatusBadge from '../components/shared/StatusBadge'
import { scoreCandidate } from '../lib/claude'

function ScoreBar({ label, score, notes }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{score}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
        <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      {notes && <p className="text-xs text-gray-500">{notes}</p>}
    </div>
  )
}

function ScheduleInterviewModal({ candidate, job, onClose }) {
  const { addInterview } = useApp()
  const [form, setForm] = useState({ scheduledAt: '', format: 'Video Call', interviewer: 'Jayson Burtch', notes: '' })

  function submit(e) {
    e.preventDefault()
    addInterview({ ...form, candidateId: candidate.id, jobId: candidate.job_id })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Schedule Interview</h2>
          <p className="text-sm text-gray-500">with {candidate.name}</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="label">Date & Time</label>
            <input type="datetime-local" className="input" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Format</label>
            <select className="input" value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
              {['Video Call', 'Phone Call', 'In Person', 'Working Interview'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Interviewer</label>
            <input className="input" value={form.interviewer} onChange={e => setForm(f => ({ ...f, interviewer: e.target.value }))} />
          </div>
          <div>
            <label className="label">Pre-interview Notes</label>
            <textarea className="input h-24 resize-none" placeholder="Topics to cover, questions, context…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Calendar size={15} /> Schedule
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CandidateProfile() {
  const { id } = useParams()
  const { candidates, jobs, updateCandidate } = useApp()
  const [showSchedule, setShowSchedule] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [scoreError, setScoreError] = useState('')

  const candidate = candidates.find(c => c.id === id)
  if (!candidate) return (
    <div className="p-8">
      <p className="text-gray-500">Candidate not found.</p>
      <Link to="/candidates" className="text-brand-red hover:underline text-sm mt-2 block">← Back to candidates</Link>
    </div>
  )

  // Support both snake_case (Supabase) and camelCase (seed data)
  const resumeText    = candidate.resume_text    || candidate.resumeText    || ''
  const scoreBreakdown = candidate.score_breakdown || candidate.aiScore      || null
  const appliedAt     = candidate.created_at      || candidate.appliedAt    || ''
  const jobId         = candidate.job_id          || candidate.jobId        || ''

  const job = jobs.find(j => j.id === jobId)
  const jobTitle = job?.title || job?.role || ''

  async function runScore() {
    if (!resumeText) { setScoreError('No resume text found for this candidate.'); return }
    if (!job?.requirements) { setScoreError('Job requirements are needed to score.'); return }
    setScoring(true)
    setScoreError('')
    try {
      const result = await scoreCandidate({ resumeText, jobRequirements: job.requirements })
      // updateCandidate maps aiScore → ai_score + score_breakdown in Supabase
      updateCandidate(id, { aiScore: result })
    } catch (err) {
      setScoreError('Scoring failed: ' + err.message)
    } finally {
      setScoring(false)
    }
  }

  const statusOptions = ['new', 'review', 'interview', 'offer', 'rejected']

  return (
    <div className="p-8 max-w-4xl">
      <Link to="/candidates" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-red mb-5">
        <ArrowLeft size={14} /> Back to candidates
      </Link>

      {/* Header card */}
      <div className="card mb-6">
        <div className="flex items-start gap-6">
          {scoreBreakdown
            ? <ScoreRing score={scoreBreakdown.overallScore} size={80} />
            : <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xl font-bold">
                {candidate.name.charAt(0)}
              </div>
          }
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{candidate.name}</h1>
              <StatusBadge status={candidate.status} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              {candidate.email && <span className="flex items-center gap-1"><Mail size={13} />{candidate.email}</span>}
              {candidate.phone && <span className="flex items-center gap-1"><Phone size={13} />{candidate.phone}</span>}
              {jobTitle        && <span className="flex items-center gap-1"><Briefcase size={13} />{jobTitle}</span>}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Applied {appliedAt?.slice(0, 10)} · Source: {candidate.source}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <select
              className="input text-sm"
              value={candidate.status}
              onChange={e => updateCandidate(id, { status: e.target.value })}
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button onClick={() => setShowSchedule(true)} className="btn-primary text-sm flex items-center justify-center gap-1.5">
              <Calendar size={13} /> Schedule Interview
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* AI Score Breakdown */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">AI Match Score</h2>
          {scoreBreakdown ? (
            <div className="space-y-4">
              <ScoreBar label="License Status"    score={scoreBreakdown.licenseStatus?.score}    notes={scoreBreakdown.licenseStatus?.notes} />
              <ScoreBar label="Local Market Fit"  score={scoreBreakdown.localMarketFit?.score}   notes={scoreBreakdown.localMarketFit?.notes} />
              <ScoreBar label="Language Skills"   score={scoreBreakdown.languageSkills?.score}   notes={scoreBreakdown.languageSkills?.notes} />
              <ScoreBar label="Production History" score={scoreBreakdown.productionHistory?.score} notes={scoreBreakdown.productionHistory?.notes} />
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-600 italic">{scoreBreakdown.summary}</p>
              </div>
              {scoreBreakdown.strengths?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Strengths</p>
                  {scoreBreakdown.strengths.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-green-700 mb-0.5">
                      <CheckCircle size={12} /> {s}
                    </div>
                  ))}
                </div>
              )}
              {scoreBreakdown.concerns?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Concerns</p>
                  {scoreBreakdown.concerns.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-amber-700 mb-0.5">
                      <AlertTriangle size={12} /> {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Star size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">No AI score yet.</p>
              {scoreError && <p className="text-xs text-amber-600 bg-amber-50 rounded p-2 mb-3">{scoreError}</p>}
              <button onClick={runScore} disabled={scoring} className="btn-primary flex items-center gap-2 mx-auto">
                {scoring ? <><Loader2 size={14} className="animate-spin" /> Scoring…</> : <><Star size={14} /> Score with AI</>}
              </button>
            </div>
          )}
        </div>

        {/* Resume */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Resume</h2>
          {resumeText
            ? <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">{resumeText}</pre>
            : <p className="text-sm text-gray-400">No resume uploaded.</p>
          }
        </div>
      </div>

      {showSchedule && <ScheduleInterviewModal candidate={candidate} job={job} onClose={() => setShowSchedule(false)} />}
    </div>
  )
}
