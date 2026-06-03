import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Upload, FileText, Loader2, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import StatusBadge from '../components/shared/StatusBadge'
import ScoreRing from '../components/shared/ScoreRing'
import { scoreCandidate } from '../lib/claude'

function AddCandidateModal({ onClose }) {
  const { jobs, addCandidate } = useApp()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ jobId: '', name: '', email: '', phone: '', resumeText: '', source: 'manual' })
  const [scoring, setScoring] = useState(false)
  const [error, setError] = useState('')

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, resumeText: ev.target.result }))
    reader.readAsText(file)
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.jobId) return

    const candidate = addCandidate(form)

    if (form.resumeText) {
      const job = jobs.find(j => j.id === form.jobId)
      if (job?.requirements) {
        setScoring(true)
        try {
          const aiScore = await scoreCandidate({ resumeText: form.resumeText, jobRequirements: job.requirements })
          // updateCandidate is called in context — we pass back through closure
          candidate.aiScore = aiScore
        } catch (err) {
          setError('AI scoring skipped: ' + err.message)
        } finally {
          setScoring(false)
        }
      }
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add Candidate</h2>
          <p className="text-sm text-gray-500 mt-0.5">Upload or paste a resume to score against job requirements</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="label">Job Search</label>
            <select className="input" value={form.jobId} onChange={e => setForm(f => ({ ...f, jobId: e.target.value }))} required>
              <option value="">Select a job search…</option>
              {jobs.filter(j => j.status === 'active').map(j => (
                <option key={j.id} value={j.id}>{j.role}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="941-555-0100" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="jane@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>

          {/* Resume Input */}
          <div>
            <label className="label">Resume</label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
              <label className="flex flex-col items-center gap-2 cursor-pointer text-gray-500 hover:text-brand-red transition-colors mb-3">
                <Upload size={20} />
                <span className="text-sm">Upload resume file (.txt, .pdf)</span>
                <input type="file" accept=".txt,.pdf" className="hidden" onChange={handleFile} />
              </label>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs text-gray-400"><span className="bg-white px-2">or paste text</span></div>
              </div>
              <textarea
                className="input mt-3 h-32 resize-none font-mono text-xs"
                placeholder="Paste resume content here…"
                value={form.resumeText}
                onChange={e => setForm(f => ({ ...f, resumeText: e.target.value }))}
              />
            </div>
          </div>

          {error && <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={scoring} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {scoring ? <><Loader2 size={15} className="animate-spin" /> Scoring…</> : <><FileText size={15} /> Add & Score</>}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CandidateRow({ candidate, job }) {
  return (
    <Link to={`/candidates/${candidate.id}`} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl group transition-colors">
      {(() => { const sb = candidate.score_breakdown || candidate.aiScore; return sb
        ? <ScoreRing score={sb.overallScore} size={56} />
        : <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-medium">N/A</div>
      })()}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 group-hover:text-brand-red">{candidate.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{job?.title || job?.role || 'Unknown role'} · Applied {(candidate.created_at || candidate.appliedAt || '').slice(0, 10)}</p>
        {(() => { const sb = candidate.score_breakdown || candidate.aiScore; return sb && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{sb.summary}</p>
        )})()}
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={candidate.status} />
        <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-red" />
      </div>
    </Link>
  )
}

export default function Candidates() {
  const { candidates, jobs } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('all')

  const filtered = candidates.filter(c => filter === 'all' || c.status === filter)
  const sorted = [...filtered].sort((a, b) => {
    const aScore = a.score_breakdown || a.aiScore
    const bScore = b.score_breakdown || b.aiScore
    if (aScore && bScore) return bScore.overallScore - aScore.overallScore
    if (aScore) return -1
    if (bScore) return 1
    return new Date(b.created_at || b.appliedAt) - new Date(a.created_at || a.appliedAt)
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 text-sm mt-1">{candidates.length} total candidates</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Candidate
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {['all', 'new', 'review', 'interview', 'offer', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === s ? 'bg-brand-red text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-red'
            }`}
          >
            {s === 'all' ? `All (${candidates.length})` : s}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-gray-100 p-0 overflow-hidden">
        {sorted.length === 0
          ? <p className="text-sm text-gray-400 text-center py-12">No candidates found.</p>
          : sorted.map(c => (
            <CandidateRow key={c.id} candidate={c} job={jobs.find(j => j.id === c.jobId)} />
          ))
        }
      </div>

      {showAdd && <AddCandidateModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
