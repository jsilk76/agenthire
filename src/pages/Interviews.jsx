import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Video, Phone, MapPin, Users, FileText } from 'lucide-react'
import { useApp } from '../context/AppContext'
import StatusBadge from '../components/shared/StatusBadge'

const formatIcon = { 'Video Call': Video, 'Phone Call': Phone, 'In Person': MapPin, 'Working Interview': Users }

function InterviewCard({ interview }) {
  const { candidates, jobs, updateInterview } = useApp()
  const candidate = candidates.find(c => c.id === (interview.candidate_id || interview.candidateId))
  const job = jobs.find(j => j.id === (interview.job_id || interview.jobId))
  const interviewType = interview.type || interview.format || 'Video Call'
  const dt = new Date(interview.scheduled_at || interview.scheduledAt)
  const Icon = formatIcon[interviewType] || Calendar
  const [notes, setNotes] = useState(interview.notes || '')
  const [editing, setEditing] = useState(false)

  function saveNotes() {
    updateInterview(interview.id, { notes })
    setEditing(false)
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Icon size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              <Link to={`/candidates/${candidate?.id}`} className="hover:text-brand-red">
                {candidate?.name || 'Unknown'}
              </Link>
            </p>
            <p className="text-xs text-gray-500">{job?.title || job?.role} · {interviewType}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-800">
            {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-gray-500">
            {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} with {interview.interviewer}
          </p>
          <div className="mt-1">
            <StatusBadge status={interview.status} />
          </div>
        </div>
      </div>

      {/* Status buttons */}
      <div className="flex gap-2 mb-4">
        {['scheduled', 'completed', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => updateInterview(interview.id, { status: s })}
            className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
              interview.status === s ? 'bg-brand-red text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Notes */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <FileText size={11} /> Notes
          </p>
          {!editing
            ? <button onClick={() => setEditing(true)} className="text-xs text-brand-red hover:underline">Edit</button>
            : <button onClick={saveNotes} className="text-xs text-green-600 hover:underline font-medium">Save</button>
          }
        </div>
        {editing ? (
          <textarea
            className="input h-24 resize-none text-sm"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Interview notes, impressions, follow-up actions…"
            autoFocus
          />
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-wrap min-h-[2rem]">
            {notes || <span className="text-gray-300 italic">No notes yet.</span>}
          </p>
        )}
      </div>
    </div>
  )
}

export default function Interviews() {
  const { interviews } = useApp()
  const [filter, setFilter] = useState('scheduled')

  const filtered = interviews.filter(i => filter === 'all' || i.status === filter)
  const sorted = [...filtered].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
        <p className="text-gray-500 text-sm mt-1">
          {interviews.filter(i => i.status === 'scheduled').length} scheduled · {interviews.length} total
        </p>
      </div>

      <div className="flex gap-2 mb-5">
        {['scheduled', 'completed', 'cancelled', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === s ? 'bg-brand-red text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-red'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {sorted.length === 0
        ? <div className="card text-center py-12">
            <Calendar size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No {filter} interviews. Schedule one from a candidate profile.</p>
          </div>
        : <div className="space-y-4">
            {sorted.map(i => <InterviewCard key={i.id} interview={i} />)}
          </div>
      }
    </div>
  )
}
