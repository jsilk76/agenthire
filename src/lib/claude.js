// Anthropic Claude API integration
// All calls are proxied through the local Express server (server.js) on port 3001
// to avoid CORS restrictions. In production, replace with a Supabase Edge Function.

export const CLAUDE_MODEL = 'claude-sonnet-4-6'
const PROXY_URL = 'http://localhost:3001/api/claude'

export async function scoreCandidate({ resumeText, jobRequirements }) {
  const prompt = `You are an expert real estate recruiter for the Burtch Team at Century 21 Sunbelt in Southwest Florida.

Evaluate this candidate's resume against the job requirements and return a JSON object with these exact fields:
{
  "overallScore": <0-100 integer>,
  "licenseStatus": { "score": <0-100>, "notes": "<string>" },
  "localMarketFit": { "score": <0-100>, "notes": "<string>" },
  "languageSkills": { "score": <0-100>, "notes": "<string>" },
  "productionHistory": { "score": <0-100>, "notes": "<string>" },
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<string>", ...],
  "concerns": ["<string>", ...]
}

JOB REQUIREMENTS:
${jobRequirements}

RESUME:
${resumeText}

Respond with only valid JSON.`

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Proxy server error')
  }

  const raw = data.content[0].text
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  return JSON.parse(text)
}
