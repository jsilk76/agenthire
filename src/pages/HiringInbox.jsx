import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Mail, RefreshCw, FileText, CheckCircle, AlertCircle, Loader2,
  Link2, Link2Off, ExternalLink, ChevronDown, ChevronUp, Star, Sparkles,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

const API = 'http://localhost:3001/api/gmail'

// ── Small helpers ─────────────────────────────────────────────────────────────
function ScoreBar({ label, score }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-6 text-right">{score}</span>
    </div>
  )
}

function ScorePill({ score }) {
  const bg = score >= 80 ? 'bg-green-100 text-green-800' : score >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'
  return <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${bg}`}><Star size={10} />{score}</span>
}

// ── Auto-Import Modal — shows AI scores per job, lets user confirm ─────────────
function AutoImportModal({ email, attachment, data, onClose, onSaved }) {
  const { addCandidate, updateCandidate } = useApp()
  const { resumeText, jobScores, bestJobId } = data

  const [form, setForm] = useState({
    name:      email.fromName  || '',
    emailAddr: email.fromEmail || '',
    phone:     '',
    jobId:     bestJobId || (jobScores[0]?.job.id ?? ''),
  })
  const [saving, setSaving]     = useState(false)
  const [error,  setError]      = useState('')
  const [showResume, setShowResume] = useState(false)

  const selectedScore = jobScores.find(j => j.job.id === form.jobId)

  async function handleSave(e) {
    e.preventDefault()
    if (!form.jobId) { setError('Please select a job search.'); return }
    setSaving(true)
    setError('')
    try {
      // Create the candidate
      const candidate = await addCandidate({
        name:       form.name,
        email:      form.emailAddr,
        phone:      form.phone,
        resumeText,
        jobId:      form.jobId,
        source:     'email',
      })
      // Attach the AI score (updateCandidate maps aiScore → score_breakdown + ai_score in DB)
      if (selectedScore?.score && candidate?.id) {
        await updateCandidate(candidate.id, { aiScore: selectedScore.score })
      }
      onSaved(candidate)
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-brand-gold" />
                <h2 className="text-lg font-bold text-gray-900">AI-Scored Import</h2>
              </div>
              <p className="text-sm text-gray-500">
                {email.fromRaw}
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="text-blue-600">{attachment.filename}</span>
              </p>
            </div>
            {selectedScore?.score && (
              <div className="text-center">
                <div className={`text-2xl font-black ${
                  selectedScore.score.overallScore >= 80 ? 'text-green-600'
                  : selectedScore.score.overallScore >= 60 ? 'text-amber-600'
                  : 'text-red-500'}`}>
                  {selectedScore.score.overallScore}
                </div>
                <div className="text-xs text-gray-400">AI Score</div>
              </div>
            )}
          </div>
        </div>

        {/* Body — scrollable */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Candidate info */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Candidate Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" required />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="941-555-0100" />
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Email</label>
              <input className="input" type="email" value={form.emailAddr} onChange={e => setForm(f => ({ ...f, emailAddr: e.target.value }))} />
            </div>
          </div>

          {/* Job scores */}
          {jobScores.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">AI Match — Select Job to Assign</p>
              <div className="space-y-2">
                {[...jobScores].sort((a, b) => (b.score?.overallScore || 0) - (a.score?.overallScore || 0)).map(({ job, score }) => (
                  <label
                    key={job.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      form.jobId === job.id
                        ? 'border-brand-red bg-red-50/50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="jobId"
                      value={job.id}
                      checked={form.jobId === job.id}
                      onChange={() => setForm(f => ({ ...f, jobId: job.id }))}
                      className="mt-1 accent-red-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900">{job.title}</p>
                        {score
                          ? <ScorePill score={score.overallScore} />
                          : <span className="text-xs text-gray-400">No score</span>}
                      </div>
                      {score && (
                        <div className="space-y-1 mt-2">
                          <ScoreBar label="License Status"    score={score.licenseStatus?.score    || 0} />
                          <ScoreBar label="Local Market Fit"  score={score.localMarketFit?.score   || 0} />
                          <ScoreBar label="Language Skills"   score={score.languageSkills?.score   || 0} />
                          <ScoreBar label="Production History" score={score.productionHistory?.score || 0} />
                          <p className="text-xs text-gray-500 italic mt-1.5 line-clamp-2">{score.summary}</p>
                        </div>
                      )}
                    </div>
                    {job.id === bestJobId && (
                      <span className="shrink-0 text-xs bg-brand-gold/20 text-yellow-800 px-1.5 py-0.5 rounded font-medium">Best match</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* No active jobs fallback */}
          {jobScores.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              No active job searches found. <Link to="/jobs" className="underline" onClick={onClose}>Create one</Link> to enable AI scoring.
            </div>
          )}

          {/* Resume preview toggle */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowResume(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 text-sm text-gray-600 font-medium hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center gap-2"><FileText size={14} /> Parsed Resume Text</span>
              {showResume ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showResume && (
              <pre className="p-4 text-xs text-gray-600 font-sans whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {resumeText || '(empty)'}
              </pre>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            type="submit"
            form="auto-import-form"
            disabled={saving}
            onClick={handleSave}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><CheckCircle size={14} /> Save Candidate{selectedScore?.score ? ` · Score ${selectedScore.score.overallScore}` : ''}</>}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Per-attachment import button ───────────────────────────────────────────────
function AttachmentImportButton({ email, attachment, onSaved }) {
  const [loading,  setLoading]  = useState(false)
  const [imported, setImported] = useState(false)
  const [modal,    setModal]    = useState(null)
  const [error,    setError]    = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/auto-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId:    email.id,
          attachmentId: attachment.attachmentId,
          filename:     attachment.filename,
          fromName:     email.fromName,
          fromEmail:    email.fromEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Import failed')
      setModal(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (imported) {
    return (
      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
        <CheckCircle size={11} /> Imported
      </span>
    )
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleClick}
          disabled={loading}
          className="text-xs btn-primary py-1 px-3 flex items-center gap-1.5"
        >
          {loading
            ? <><Loader2 size={11} className="animate-spin" /> Analyzing…</>
            : <><Sparkles size={11} /> Import & Score</>}
        </button>
        {error && <p className="text-xs text-red-500 max-w-[180px] text-right leading-tight">{error}</p>}
      </div>

      {modal && (
        <AutoImportModal
          email={email}
          attachment={attachment}
          data={modal}
          onClose={() => setModal(null)}
          onSaved={candidate => { setImported(true); onSaved(candidate) }}
        />
      )}
    </>
  )
}

// ── Email card (expand to see attachments) ─────────────────────────────────────
function EmailCard({ email, onSaved }) {
  const [expanded, setExpanded] = useState(false)
  const [importedIds, setImportedIds] = useState(new Set())

  function markImported(attachmentId, candidate) {
    setImportedIds(prev => new Set([...prev, attachmentId]))
    onSaved(candidate)
  }

  const allDone = email.attachments.every(a => importedIds.has(a.attachmentId))

  return (
    <div className={`border rounded-xl transition-all ${allDone ? 'border-gray-100 bg-gray-50/60' : 'border-gray-200 bg-white'}`}>
      <button
        className="w-full flex items-start gap-3 p-4 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${allDone ? 'bg-green-100' : 'bg-blue-50'}`}>
          {allDone
            ? <CheckCircle size={15} className="text-green-600" />
            : <Mail size={15} className="text-blue-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{email.fromName}</p>
            <span className="text-xs text-gray-400 shrink-0">
              {new Date(email.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <p className="text-xs text-gray-600 font-medium truncate mt-0.5">{email.subject}</p>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{email.snippet}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {email.attachments.map(a => (
              <span key={a.attachmentId} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                importedIds.has(a.attachmentId) ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
              }`}>
                <FileText size={10} />
                {a.filename}
                {importedIds.has(a.attachmentId) && ' ✓'}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-gray-300 mt-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-2">
          <p className="text-xs text-gray-400 mb-2">
            From: <span className="text-gray-600">{email.fromEmail}</span>
          </p>
          {email.attachments.map(attachment => (
            <div key={attachment.attachmentId} className="flex items-center justify-between gap-3 py-2 px-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700 truncate">{attachment.filename}</span>
                {attachment.size > 0 && (
                  <span className="text-xs text-gray-400 shrink-0">{Math.round(attachment.size / 1024)} KB</span>
                )}
              </div>
              {importedIds.has(attachment.attachmentId)
                ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={11} /> Imported</span>
                : <AttachmentImportButton
                    email={email}
                    attachment={attachment}
                    onSaved={candidate => markImported(attachment.attachmentId, candidate)}
                  />
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Connect panel (shown when not logged in to Gmail) ─────────────────────────
function ConnectPanel() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function connect() {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`${API}/auth-url`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="card border-brand-gold/30 bg-amber-50/20">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 flex items-center justify-center shrink-0">
          <Mail size={22} className="text-amber-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">Connect Your Gmail Hiring Inbox</h3>
          <p className="text-sm text-gray-600 mt-1">
            AgentHire will scan your inbox for resume attachments (PDF, DOCX), extract the text,
            and automatically score each candidate against your open job searches using Claude AI.
          </p>

          {error && (
            <div className="flex items-start gap-2 mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="flex items-center gap-3 mt-4">
            <button onClick={connect} disabled={loading} className="btn-primary flex items-center gap-2">
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Redirecting to Google…</>
                : <><Link2 size={14} /> Connect Gmail</>}
            </button>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-red hover:underline"
            >
              <ExternalLink size={11} /> Google Cloud console
            </a>
          </div>

          <div className="mt-5 bg-white rounded-xl border border-amber-100 p-4 space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What happens when you click Connect</p>
            {[
              'Google asks you to authorize read-only access to your Gmail',
              'AgentHire scans for emails with PDF or Word attachments',
              'Claude AI extracts text from each resume',
              'Each resume is scored against your active job searches',
              'You review the scores and save candidates with one click',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-brand-red text-white flex items-center justify-center shrink-0 text-[10px] font-bold">{i + 1}</span>
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HiringInbox() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [status,    setStatus]   = useState(null)
  const [emails,    setEmails]   = useState([])
  const [loading,   setLoading]  = useState(true)
  const [scanning,  setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [days,      setDays]     = useState(30)
  const [savedCount, setSavedCount] = useState(0)

  const justConnected = searchParams.get('connected') === 'true'
  const oauthError    = searchParams.get('error')

  useEffect(() => {
    if (justConnected || oauthError) setSearchParams({}, { replace: true })
    checkStatus()
  }, [])

  // Re-scan when days filter changes (only if already connected)
  useEffect(() => {
    if (status?.connected) scan()
  }, [days])

  async function checkStatus() {
    setLoading(true)
    try {
      const s = await fetch(`${API}/status`).then(r => r.json())
      setStatus(s)
      if (s.connected) await scan()
    } catch {
      setStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }

  async function scan() {
    setScanning(true)
    setScanError('')
    try {
      const { emails: list, error } = await fetch(`${API}/emails?days=${days}`).then(r => r.json())
      if (error) throw new Error(error)
      setEmails(list || [])
    } catch (err) {
      setScanError(err.message)
    } finally {
      setScanning(false)
    }
  }

  async function disconnect() {
    if (!confirm('Disconnect Gmail? You can reconnect anytime.')) return
    await fetch(`${API}/disconnect`, { method: 'POST' })
    setStatus({ connected: false })
    setEmails([])
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin text-brand-red mx-auto mb-3" />
          <p className="text-sm text-gray-500">Checking Gmail connection…</p>
        </div>
      </div>
    )
  }

  const unimported = emails.length  // all cards start as unimported

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hiring Inbox</h1>
          <p className="text-gray-500 text-sm mt-1">
            {status?.connected
              ? <>Scanning <span className="font-medium text-gray-700">{status.email}</span> · {emails.length} emails with resumes found{savedCount > 0 && <span className="text-green-600"> · {savedCount} saved this session</span>}</>
              : 'Connect Gmail to scan for resume attachments automatically'}
          </p>
        </div>
        {status?.connected && (
          <div className="flex items-center gap-2">
            <select
              className="input text-sm py-1.5 w-auto"
              value={days}
              onChange={e => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
            </select>
            <button onClick={scan} disabled={scanning} className="btn-primary flex items-center gap-2">
              <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Scanning…' : 'Refresh'}
            </button>
          </div>
        )}
      </div>

      {/* Banners */}
      {justConnected && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-4 mb-5 text-green-800 text-sm font-medium">
          <CheckCircle size={16} /> Gmail connected! Scanning your inbox now…
        </div>
      )}
      {oauthError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-red-700 text-sm">
          <AlertCircle size={16} /> OAuth error: {decodeURIComponent(oauthError)}
        </div>
      )}
      {scanError && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-amber-800 text-sm">
          <AlertCircle size={16} /> {scanError}
        </div>
      )}

      {/* Not connected */}
      {!status?.connected && <ConnectPanel />}

      {/* Connected */}
      {status?.connected && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Connected · {status.email}
            </div>
            <button onClick={disconnect} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors">
              <Link2Off size={13} /> Disconnect
            </button>
          </div>

          {scanning ? (
            <div className="card text-center py-14">
              <Loader2 size={28} className="animate-spin text-brand-red mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Scanning inbox for resume attachments…</p>
              <p className="text-xs text-gray-400 mt-1">This may take a moment</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="card text-center py-14">
              <Mail size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">No emails with resume attachments found</p>
              <p className="text-gray-400 text-xs mt-1">in the last {days} days — try a wider date range</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map(email => (
                <EmailCard
                  key={email.id}
                  email={email}
                  onSaved={() => setSavedCount(c => c + 1)}
                />
              ))}
              <p className="text-xs text-gray-400 text-center pt-2">
                {emails.length} email{emails.length !== 1 ? 's' : ''} found with resume attachments in the last {days} days
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
