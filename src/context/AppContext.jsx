import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AppContext = createContext(null)

export const COUNTIES = ['Charlotte', 'Lee', 'Sarasota', 'DeSoto', 'Collier',
  'Hillsborough', 'Pinellas', 'Manatee', 'Polk']

// ── Seed data shown while Supabase loads (or when not configured) ─────────────
const seedJobs = [
  {
    id: '1', title: 'Licensed Real Estate Agent', status: 'active',
    counties: ['Charlotte', 'Lee', 'Sarasota'],
    cities: ['Port Charlotte', 'Fort Myers', 'Sarasota', 'Venice'],
    requirements: 'Active Florida real estate license required. Minimum 2 years experience in residential sales. Bilingual (English/Spanish) preferred. Strong knowledge of Charlotte and Lee County markets. Must have own transportation.',
    created_at: '2026-05-15', candidateCount: 8,
  },
  {
    id: '2', title: "Buyer's Agent — New Construction", status: 'active',
    counties: ['Collier', 'Lee'], cities: ['Naples', 'Bonita Springs', 'Estero', 'Cape Coral'],
    requirements: 'Active Florida real estate license. Experience with new construction sales a plus. Strong follow-up skills and CRM proficiency. Full-time availability required.',
    created_at: '2026-05-28', candidateCount: 3,
  },
  {
    id: '3', title: 'Team Leader / Listing Agent', status: 'paused',
    counties: ['Sarasota', 'Manatee'], cities: ['Sarasota', 'Bradenton', 'Lakewood Ranch'],
    requirements: 'Active Florida real estate license. Minimum 5 years experience. Proven listing track record with 20+ closings per year. Leadership experience preferred.',
    created_at: '2026-04-10', candidateCount: 2,
  },
]

const seedCandidates = [
  {
    id: 'c1', job_id: '1', name: 'Maria Gonzalez', email: 'mgonzalez@email.com', phone: '941-555-0182',
    resume_text: 'Licensed Florida Realtor since 2019. Fluent in English and Spanish. 47 closings in 2025, primarily in Charlotte County. Top producer at previous brokerage.',
    source: 'email', status: 'interview', created_at: '2026-05-20',
    ai_score: 92,
    score_breakdown: {
      overallScore: 92,
      licenseStatus: { score: 100, notes: 'Active FL license confirmed' },
      localMarketFit: { score: 95, notes: 'Deep Charlotte County experience' },
      languageSkills: { score: 100, notes: 'Bilingual English/Spanish' },
      productionHistory: { score: 88, notes: '47 closings in 2025 — strong' },
      summary: 'Excellent fit. Bilingual, locally experienced, and a proven producer in the target market.',
      strengths: ['Bilingual', 'Local market knowledge', 'High production volume'],
      concerns: ['No new construction experience noted'],
    },
  },
  {
    id: 'c2', job_id: '1', name: 'Derek Thompson', email: 'dthompson@email.com', phone: '239-555-0347',
    resume_text: 'Realtor with 3 years experience in Lee County. English only. 22 closings in 2025. Previously worked in property management.',
    source: 'manual', status: 'review', created_at: '2026-05-22',
    ai_score: 68,
    score_breakdown: {
      overallScore: 68,
      licenseStatus: { score: 100, notes: 'Active FL license' },
      localMarketFit: { score: 80, notes: 'Lee County but not Charlotte/Sarasota' },
      languageSkills: { score: 50, notes: 'English only — bilingual preferred' },
      productionHistory: { score: 65, notes: '22 closings — moderate' },
      summary: 'Decent candidate. Lacks bilingual ability and production volume is below top performers.',
      strengths: ['Active license', 'SW Florida market familiarity'],
      concerns: ['English only', 'Below-average production', 'No Charlotte/Sarasota experience'],
    },
  },
  {
    id: 'c3', job_id: '2', name: 'Priya Patel', email: 'ppatel@email.com', phone: '239-555-0891',
    resume_text: 'Licensed agent in Florida for 4 years. Specializes in new construction in Naples and Bonita Springs. Closed 18 new construction deals in 2025. Proficient in Salesforce CRM.',
    source: 'email', status: 'new', created_at: '2026-05-30',
    ai_score: null, score_breakdown: null,
  },
]

const seedInterviews = [
  {
    id: 'i1', candidate_id: 'c1', job_id: '1',
    scheduled_at: '2026-06-05T10:00', type: 'Video Call',
    interviewer: 'Jayson Burtch',
    notes: 'Very impressed with her production numbers. Ask about her buyer pipeline and team collaboration style.',
    status: 'scheduled',
  },
]

// ── Context ──────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [jobs, setJobs]             = useState(seedJobs)
  const [candidates, setCandidates] = useState(seedCandidates)
  const [interviews, setInterviews] = useState(seedInterviews)
  const [dbReady, setDbReady]       = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [jobsRes, candidatesRes, interviewsRes] = await Promise.all([
        supabase.from('jobs').select('*').order('created_at', { ascending: false }),
        supabase.from('candidates').select('*').order('created_at', { ascending: false }),
        supabase.from('interviews').select('*').order('scheduled_at', { ascending: true }),
      ])
      if (jobsRes.error) throw jobsRes.error
      if (candidatesRes.error) throw candidatesRes.error
      if (interviewsRes.error) throw interviewsRes.error
      const countMap = {}
      candidatesRes.data.forEach(c => { countMap[c.job_id] = (countMap[c.job_id] || 0) + 1 })
      setJobs(jobsRes.data.map(j => ({ ...j, candidateCount: countMap[j.id] || 0 })))
      setCandidates(candidatesRes.data)
      setInterviews(interviewsRes.data)
      setDbReady(true)
    } catch (err) {
      console.warn('Supabase load failed, using seed data:', err.message)
    }
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────
  async function addJob(job) {
    const payload = {
      title: job.role || job.title,
      counties: job.counties,
      cities: job.cities,
      requirements: job.requirements,
      status: 'active',
    }
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('jobs').insert(payload).select().single()
      if (error) throw error
      setJobs(prev => [{ ...data, candidateCount: 0 }, ...prev])
      return data
    }
    const newJob = { ...payload, id: Date.now().toString(), created_at: new Date().toISOString(), candidateCount: 0 }
    setJobs(prev => [newJob, ...prev])
    return newJob
  }

  async function updateJob(id, updates) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('jobs').update(updates).eq('id', id)
      if (error) throw error
    }
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j))
  }

  async function deleteJob(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('jobs').delete().eq('id', id)
      if (error) throw error
    }
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  // ── Candidates ────────────────────────────────────────────────────────────
  async function addCandidate(candidate) {
    const payload = {
      name: candidate.name,
      email: candidate.email || '',
      phone: candidate.phone || '',
      resume_text: candidate.resumeText || candidate.resume_text || '',
      status: 'new',
      job_id: candidate.jobId || candidate.job_id,
      source: candidate.source || 'manual',
      ai_score: null,
      score_breakdown: null,
    }
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('candidates').insert(payload).select().single()
      if (error) throw error
      setCandidates(prev => [data, ...prev])
      setJobs(prev => prev.map(j => j.id === data.job_id ? { ...j, candidateCount: j.candidateCount + 1 } : j))
      return data
    }
    const newCandidate = { ...payload, id: Date.now().toString(), created_at: new Date().toISOString() }
    setCandidates(prev => [newCandidate, ...prev])
    setJobs(prev => prev.map(j => j.id === payload.job_id ? { ...j, candidateCount: j.candidateCount + 1 } : j))
    return newCandidate
  }

  async function updateCandidate(id, updates) {
    const dbUpdates = { ...updates }
    if ('resumeText' in dbUpdates) { dbUpdates.resume_text = dbUpdates.resumeText; delete dbUpdates.resumeText }
    if ('jobId'      in dbUpdates) { dbUpdates.job_id      = dbUpdates.jobId;      delete dbUpdates.jobId }
    if ('aiScore'    in dbUpdates) {
      const score = dbUpdates.aiScore
      dbUpdates.ai_score        = score?.overallScore ?? score
      dbUpdates.score_breakdown = score
      delete dbUpdates.aiScore
    }
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('candidates').update(dbUpdates).eq('id', id)
      if (error) console.error('updateCandidate error:', error.message)
    }
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...dbUpdates } : c))
  }

  // ── Interviews ────────────────────────────────────────────────────────────
  async function addInterview(interview) {
    const payload = {
      candidate_id: interview.candidateId || interview.candidate_id,
      job_id:       interview.jobId       || interview.job_id,
      scheduled_at: interview.scheduledAt || interview.scheduled_at,
      type:         interview.format      || interview.type || 'Video Call',
      interviewer:  interview.interviewer || '',
      notes:        interview.notes       || '',
      status:       'scheduled',
    }
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('interviews').insert(payload).select().single()
      if (error) throw error
      setInterviews(prev => [data, ...prev])
      await updateCandidate(payload.candidate_id, { status: 'interview' })
      return data
    }
    const newInterview = { ...payload, id: Date.now().toString() }
    setInterviews(prev => [newInterview, ...prev])
    await updateCandidate(payload.candidate_id, { status: 'interview' })
    return newInterview
  }

  async function updateInterview(id, updates) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('interviews').update(updates).eq('id', id)
      if (error) console.error('updateInterview error:', error.message)
    }
    setInterviews(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    openSearches:        jobs.filter(j => j.status === 'active').length,
    totalCandidates:     candidates.length,
    interviewsScheduled: interviews.filter(i => i.status === 'scheduled').length,
  }

  return (
    <AppContext.Provider value={{
      jobs, candidates, interviews, stats, dbReady,
      COUNTIES,
      addJob, updateJob, deleteJob,
      addCandidate, updateCandidate,
      addInterview, updateInterview,
      reload: loadAll,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
