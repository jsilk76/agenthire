import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

// ── Load .env.local ───────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))

try {
  const envFile = readFileSync(join(__dirname, '.env.local'), 'utf8')
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
} catch {
  console.warn('No .env.local found — using existing environment variables.')
}

// ── Supabase admin client (service role — server only) ────────────────────────
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SECRET_KEY || '',
)

// ── Express ───────────────────────────────────────────────────────────────────
const app = express()
const PORT = 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'] }))
app.use(express.json())

// ── Gmail OAuth helpers ───────────────────────────────────────────────────────
const TOKEN_FILE = join(__dirname, 'gmail-tokens.json')

function googleClientId()     { return process.env.GOOGLE_CLIENT_ID     || process.env.GMAIL_CLIENT_ID     || '' }
function googleClientSecret() { return process.env.GOOGLE_CLIENT_SECRET  || process.env.GMAIL_CLIENT_SECRET  || '' }
function googleRedirectUri()  { return process.env.GOOGLE_REDIRECT_URI   || process.env.GMAIL_REDIRECT_URI   || 'http://localhost:3001/api/gmail/callback' }

function makeOAuthClient() {
  return new google.auth.OAuth2(googleClientId(), googleClientSecret(), googleRedirectUri())
}

function loadTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const raw = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'))
      if (raw?.access_token) return raw
    }
  } catch {}
  return null
}

function saveTokens(tokens) {
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2))
}

// Walk the full MIME tree recursively to find resume attachments.
// Must be called with format:'full' responses — 'metadata' has no parts.
function findAttachments(payload) {
  const found = []

  function walk(parts = []) {
    for (const part of parts) {
      // Recurse into nested multipart containers
      if (part.parts && part.parts.length) walk(part.parts)

      const filename = part.filename || ''
      const attachmentId = part.body?.attachmentId

      // Log every part so we can see what Gmail is returning
      if (filename) {
        console.log(`    MIME part | mimeType: ${part.mimeType} | filename: "${filename}" | attachmentId: ${attachmentId || 'none'}`)
      }

      if (
        filename &&
        attachmentId &&
        /\.(pdf|docx?|doc|txt|rtf)$/i.test(filename)
      ) {
        found.push({
          attachmentId,
          filename,
          mimeType: part.mimeType || '',
          size: part.body?.size || 0,
        })
      }
    }
  }

  // Start from the top-level payload parts
  if (payload?.parts) walk(payload.parts)

  // Some emails have a single attachment at the payload root (no parts array)
  if (payload?.filename && payload?.body?.attachmentId) {
    const filename = payload.filename
    if (/\.(pdf|docx?|doc|txt|rtf)$/i.test(filename)) {
      found.push({
        attachmentId: payload.body.attachmentId,
        filename,
        mimeType: payload.mimeType || '',
        size: payload.body?.size || 0,
      })
    }
  }

  return found
}

function parseFromName(from = '') {
  const m = from.match(/^"?([^"<]+)"?\s*</)
  return m ? m[1].trim() : from.replace(/<[^>]+>/, '').trim() || from
}

function parseFromEmail(from = '') {
  const m = from.match(/<([^>]+)>/)
  return m ? m[1] : from.trim()
}

// ── Resume text extraction ────────────────────────────────────────────────────
async function extractText(buffer, filename) {
  if (/\.pdf$/i.test(filename)) {
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
    const result = await pdfParse(buffer)
    return result.text.trim()
  }
  if (/\.docx?$/i.test(filename)) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }
  return buffer.toString('utf8').trim()
}

// ── Claude scoring (runs server-side, no CORS issues) ────────────────────────
async function scoreWithClaude(resumeText, jobRequirements, jobTitle) {
  const apiKey = process.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY not set')

  const prompt = `You are an expert real estate recruiter for the Burtch Team at Century 21 Sunbelt in Southwest Florida.

Evaluate this candidate's resume against the job requirements for the role: "${jobTitle}"

Return ONLY a valid JSON object with these exact fields:
{
  "overallScore": <0-100 integer>,
  "licenseStatus": { "score": <0-100>, "notes": "<string>" },
  "localMarketFit": { "score": <0-100>, "notes": "<string>" },
  "languageSkills": { "score": <0-100>, "notes": "<string>" },
  "productionHistory": { "score": <0-100>, "notes": "<string>" },
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<string>"],
  "concerns": ["<string>"]
}

JOB REQUIREMENTS:
${jobRequirements}

RESUME:
${resumeText.slice(0, 4000)}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Claude API error')

  const raw = data.content[0].text
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  return JSON.parse(json)
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    hasClaudeKey:   Boolean(process.env.VITE_ANTHROPIC_API_KEY),
    hasGmailCreds:  Boolean(googleClientId() && googleClientSecret()),
    hasSupabase:    Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_SECRET_KEY),
  })
})

// ── Claude proxy (for browser-side scoring) ───────────────────────────────────
app.post('/api/claude', async (req, res) => {
  const apiKey = process.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'VITE_ANTHROPIC_API_KEY not set' })
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Claude API error' })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Gmail: generate OAuth URL ─────────────────────────────────────────────────
app.get('/api/gmail/auth-url', (req, res) => {
  if (!googleClientId() || !googleClientSecret()) {
    return res.status(400).json({ error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set in .env.local' })
  }
  const url = makeOAuthClient().generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent',
  })
  res.json({ url })
})

// ── Gmail: OAuth callback ─────────────────────────────────────────────────────
app.get('/api/gmail/callback', async (req, res) => {
  const { code, error } = req.query
  if (error) return res.redirect(`http://localhost:5173/inbox?error=${encodeURIComponent(error)}`)
  try {
    const oauth2Client = makeOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)
    saveTokens(tokens)
    console.log('  ✓ Gmail connected — tokens saved.')
    res.redirect('http://localhost:5173/inbox?connected=true')
  } catch (err) {
    console.error('Gmail callback error:', err.message)
    res.redirect(`http://localhost:5173/inbox?error=${encodeURIComponent(err.message)}`)
  }
})

// ── Gmail: connection status ──────────────────────────────────────────────────
app.get('/api/gmail/status', async (req, res) => {
  const tokens = loadTokens()
  if (!tokens) return res.json({ connected: false })
  try {
    const oauth2Client = makeOAuthClient()
    oauth2Client.setCredentials(tokens)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const { data } = await gmail.users.getProfile({ userId: 'me' })
    res.json({ connected: true, email: data.emailAddress })
  } catch (err) {
    res.json({ connected: false, error: err.message })
  }
})

// ── Gmail: list emails with resume attachments ────────────────────────────────
app.get('/api/gmail/emails', async (req, res) => {
  const tokens = loadTokens()
  if (!tokens) return res.status(401).json({ error: 'Gmail not connected' })

  const days       = parseInt(req.query.days  || '30', 10)
  const maxResults = parseInt(req.query.max   || '25', 10)

  try {
    const oauth2Client = makeOAuthClient()
    oauth2Client.setCredentials(tokens)
    oauth2Client.on('tokens', t => saveTokens({ ...tokens, ...t }))

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Use only 'has:attachment' — the filename filter syntax is unreliable across
    // Gmail versions. We filter by extension ourselves after fetching full parts.
    const query = `has:attachment newer_than:${days}d`
    console.log(`\n  [Gmail scan] query: "${query}" | maxResults: ${maxResults}`)

    const listRes = await gmail.users.messages.list({ userId: 'me', q: query, maxResults })
    const messageIds = listRes.data.messages || []
    console.log(`  [Gmail scan] messages returned by list: ${messageIds.length}`)

    if (!messageIds.length) return res.json({ emails: [] })

    const emails = []
    const BATCH = 5
    for (let i = 0; i < messageIds.length; i += BATCH) {
      const results = await Promise.all(
        messageIds.slice(i, i + BATCH).map(({ id }) =>
          // *** CRITICAL FIX: format:'full' is required to get payload.parts ***
          // format:'metadata' only returns headers — parts/attachments are absent
          gmail.users.messages.get({ userId: 'me', id, format: 'full' })
        )
      )

      for (const { data: msg } of results) {
        const headers = {}
        ;(msg.payload?.headers || []).forEach(h => { headers[h.name] = h.value })
        const fromRaw = headers.From || ''
        const subject = headers.Subject || '(no subject)'

        console.log(`\n  [Gmail scan] message ${msg.id} | from: ${fromRaw} | subject: "${subject}"`)

        const attachments = findAttachments(msg.payload)

        console.log(`  [Gmail scan] resume attachments found: ${attachments.length}${attachments.length ? ' → ' + attachments.map(a => a.filename).join(', ') : ''}`)

        if (!attachments.length) continue

        emails.push({
          id:        msg.id,
          threadId:  msg.threadId,
          fromRaw,
          fromName:  parseFromName(fromRaw),
          fromEmail: parseFromEmail(fromRaw),
          subject,
          date:      headers.Date || '',
          snippet:   msg.snippet || '',
          attachments,
        })
      }
    }

    emails.sort((a, b) => new Date(b.date) - new Date(a.date))
    console.log(`\n  [Gmail scan] emails with resume attachments: ${emails.length}\n`)
    res.json({ emails })
  } catch (err) {
    console.error('Gmail list error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Gmail: parse attachment + auto-score against all active jobs ───────────────
// This is the main import endpoint — does everything in one server-side call.
app.post('/api/gmail/auto-import', async (req, res) => {
  const { messageId, attachmentId, filename, fromName, fromEmail } = req.body
  if (!messageId || !attachmentId || !filename) {
    return res.status(400).json({ error: 'messageId, attachmentId, and filename are required' })
  }

  const tokens = loadTokens()
  if (!tokens) return res.status(401).json({ error: 'Gmail not connected' })

  try {
    // Step 1 — download & parse attachment
    const oauth2Client = makeOAuthClient()
    oauth2Client.setCredentials(tokens)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const { data: attachData } = await gmail.users.messages.attachments.get({
      userId: 'me', messageId, id: attachmentId,
    })

    const buffer = Buffer.from(attachData.data, 'base64url')
    const resumeText = await extractText(buffer, filename)

    if (!resumeText || resumeText.length < 50) {
      return res.status(422).json({ error: 'Could not extract readable text from this attachment. Try a text-based PDF or DOCX.' })
    }

    // Step 2 — fetch active jobs from Supabase
    const { data: jobs, error: jobsErr } = await supabase
      .from('jobs')
      .select('id, title, requirements')
      .eq('status', 'active')

    if (jobsErr) throw new Error('Could not fetch jobs: ' + jobsErr.message)
    if (!jobs || jobs.length === 0) {
      // No active jobs — return resume text only, let user assign manually
      return res.json({ resumeText, jobScores: [], bestJobId: null })
    }

    // Step 3 — score against every active job in parallel
    console.log(`  Scoring resume from ${fromEmail} against ${jobs.length} job(s)…`)
    const jobScores = await Promise.all(
      jobs.map(async job => {
        try {
          const score = await scoreWithClaude(resumeText, job.requirements || '', job.title)
          return { job, score }
        } catch (err) {
          console.error(`  Score failed for job "${job.title}":`, err.message)
          return { job, score: null }
        }
      })
    )

    // Step 4 — pick best matching job
    const bestMatch = jobScores
      .filter(j => j.score)
      .sort((a, b) => b.score.overallScore - a.score.overallScore)[0]

    console.log(`  ✓ Best match: "${bestMatch?.job.title}" (${bestMatch?.score.overallScore}/100)`)

    res.json({
      resumeText,
      jobScores,                             // [{ job, score }]
      bestJobId: bestMatch?.job.id || null,
    })
  } catch (err) {
    console.error('auto-import error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Gmail: disconnect ─────────────────────────────────────────────────────────
app.post('/api/gmail/disconnect', async (req, res) => {
  const tokens = loadTokens()
  if (tokens) {
    try {
      const c = makeOAuthClient()
      c.setCredentials(tokens)
      await c.revokeCredentials()
    } catch {}
  }
  writeFileSync(TOKEN_FILE, '{}')
  console.log('  Gmail disconnected.')
  res.json({ ok: true })
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  AgentHire proxy  →  http://localhost:${PORT}`)
  console.log(`  Claude key       →  ${process.env.VITE_ANTHROPIC_API_KEY ? '✓ loaded' : '✗ missing'}`)
  console.log(`  Gmail creds      →  ${googleClientId() ? '✓ loaded' : '✗ missing — add GOOGLE_CLIENT_ID/SECRET to .env.local'}`)
  console.log(`  Supabase         →  ${process.env.VITE_SUPABASE_URL ? '✓ loaded' : '✗ missing'}\n`)
})
