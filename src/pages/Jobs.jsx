import React, { useState } from 'react'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import { Plus, MapPin, Users, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import StatusBadge from '../components/shared/StatusBadge'

function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job.id}`} className="card hover:shadow-md transition-shadow group block">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={job.status} />
            <span className="text-xs text-gray-400">{(job.created_at || job.createdAt || '').slice(0, 10)}</span>
          </div>
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-brand-red mt-1">{job.title || job.role}</h3>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5">
            <MapPin size={12} />
            {job.counties.join(', ')}
          </div>
          {job.cities.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5 pl-4">{job.cities.join(', ')}</p>
          )}
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{job.requirements}</p>
        </div>
        <div className="flex flex-col items-end gap-2 ml-4">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Users size={14} />
            <span className="font-medium">{job.candidateCount}</span>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-red" />
        </div>
      </div>
    </Link>
  )
}

function NewJobForm({ onClose }) {
  const { addJob, COUNTIES } = useApp()
  const [form, setForm] = useState({
    role: '',
    counties: [],
    cities: '',
    requirements: '',
  })

  function toggle(county) {
    setForm(f => ({
      ...f,
      counties: f.counties.includes(county)
        ? f.counties.filter(c => c !== county)
        : [...f.counties, county],
    }))
  }

  function submit(e) {
    e.preventDefault()
    if (!form.role.trim()) return
    addJob({ ...form, cities: form.cities.split(',').map(s => s.trim()).filter(Boolean) })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">New Job Search</h2>
          <p className="text-sm text-gray-500 mt-0.5">Create a new agent hiring search</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="label">Role / Position Title</label>
            <input className="input" placeholder="e.g. Licensed Real Estate Agent" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Target Counties</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COUNTIES.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => toggle(c)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    form.counties.includes(c)
                      ? 'bg-brand-red text-white border-brand-red'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-brand-red'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Target Cities <span className="font-normal text-gray-400">(comma-separated)</span></label>
            <input className="input" placeholder="e.g. Port Charlotte, Fort Myers, Naples" value={form.cities} onChange={e => setForm(f => ({ ...f, cities: e.target.value }))} />
          </div>
          <div>
            <label className="label">Job Requirements</label>
            <textarea
              className="input h-32 resize-none"
              placeholder="List the requirements for this role. This will be used by AI to score candidates."
              value={form.requirements}
              onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Create Job Search</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Jobs() {
  const { jobs } = useApp()
  const [showNew, setShowNew] = useState(false)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Searches</h1>
          <p className="text-gray-500 text-sm mt-1">{jobs.filter(j => j.status === 'active').length} active searches</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Job Search
        </button>
      </div>

      <div className="space-y-4">
        {jobs.map(job => <JobCard key={job.id} job={job} />)}
      </div>

      {showNew && <NewJobForm onClose={() => setShowNew(false)} />}
    </div>
  )
}
