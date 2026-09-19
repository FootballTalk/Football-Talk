import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
import webpush from 'npm:web-push@3.6.7'

const ALLOWED_ORIGINS = new Set([
  'https://footballtalk.uk',
  'https://www.footballtalk.uk',
])
const FINISHED = new Set(['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'])

function allowedOrigin(origin: string) {
  return ALLOWED_ORIGINS.has(origin) || /^https:\/\/football-talk-[a-z0-9-]+\.vercel\.app$/i.test(origin)
}

function cors(origin: string) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(origin) ? origin : 'https://www.footballtalk.uk',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-goal-push-secret',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  }
}

function reply(origin: string, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) })
}

function safeScore(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 && number <= 30 ? number : null
}

function cleanTeam(value: unknown) {
  return String(value || '').trim().slice(0, 100)
}

function validSubscription(value: any) {
  const endpoint = String(value?.endpoint || '')
  const p256dh = String(value?.keys?.p256dh || '')
  const auth = String(value?.keys?.auth || '')
  return endpoint.startsWith('https://') && endpoint.length <= 2048 &&
    p256dh.length >= 20 && p256dh.length <= 512 && auth.length >= 8 && auth.length <= 256
}

function londonDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const map = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${map.year}-${map.month}-${map.day}`
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function activeWindow(row: any, now: number) {
  if (!row.kickoff_at) return true
  const kickoff = new Date(row.kickoff_at).getTime()
  if (!Number.isFinite(kickoff)) return true
  return kickoff - now <= 30 * 60 * 1000 && now - kickoff <= 6 * 60 * 60 * 1000
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
const serviceKey = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function getConfig() {
  const { data, error } = await db.from('goal_push_config')
    .select('vapid_public,vapid_private,cron_secret_hash').eq('id', true).single()
  if (error || !data) throw new Error('Goal push configuration is unavailable')
  return data
}

async function getFixtures() {
  const response = await fetch(`https://www.footballtalk.uk/api/fixtures?date=${londonDate()}&goal_push=1`, {
    headers: { 'User-Agent': 'FootballTalk Goal Alerts/1.0' },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`Fixture feed failed (${response.status})`)
  return (data.leagues || []).flatMap((league: any) => (league.fixtures || []).map((fixture: any) => ({
    id: String(fixture.id || ''),
    status: String(fixture.status || ''),
    elapsed: fixture.elapsed ?? null,
    home: String(fixture.home || ''),
    away: String(fixture.away || ''),
    homeGoals: safeScore(fixture.homeGoals),
    awayGoals: safeScore(fixture.awayGoals),
  })))
}

async function subscribe(origin: string, req: Request) {
  if (!allowedOrigin(origin)) return reply(origin, { error: 'Origin not allowed' }, 403)
  const body = await req.json().catch(() => ({}))
  const matchId = String(body.matchId || '').trim()
  if (!/^\d{1,20}$/.test(matchId) || !validSubscription(body.subscription)) {
    return reply(origin, { error: 'A valid match and push subscription are required' }, 400)
  }
  const home = cleanTeam(body.home), away = cleanTeam(body.away)
  if (!home || !away) return reply(origin, { error: 'Both teams are required' }, 400)
  const kickoffDate = body.kickoffAt ? new Date(String(body.kickoffAt)) : null
  const kickoffAt = kickoffDate && Number.isFinite(kickoffDate.getTime()) ? kickoffDate.toISOString() : null
  const subscription = body.subscription
  const { error } = await db.from('goal_push_subscriptions').upsert({
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    match_id: matchId,
    home,
    away,
    kickoff_at: kickoffAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint,match_id' })
  if (error) throw error
  const { error: stateError } = await db.from('goal_push_match_state').upsert({
    match_id: matchId,
    home_goals: safeScore(body.homeGoals),
    away_goals: safeScore(body.awayGoals),
    status: String(body.status || 'NS').slice(0, 20),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'match_id', ignoreDuplicates: true })
  if (stateError) throw stateError
  return reply(origin, { ok: true, enabled: true })
}

async function unsubscribe(origin: string, req: Request) {
  if (!allowedOrigin(origin)) return reply(origin, { error: 'Origin not allowed' }, 403)
  const body = await req.json().catch(() => ({}))
  const matchId = String(body.matchId || '').trim()
  const endpoint = String(body.endpoint || '')
  if (!/^\d{1,20}$/.test(matchId) || !endpoint.startsWith('https://') || endpoint.length > 2048) {
    return reply(origin, { error: 'A valid subscription is required' }, 400)
  }
  const { error } = await db.from('goal_push_subscriptions').delete()
    .eq('endpoint', endpoint).eq('match_id', matchId)
  if (error) throw error
  return reply(origin, { ok: true, enabled: false })
}

async function checkGoals(origin: string, req: Request) {
  const config = await getConfig()
  const supplied = req.headers.get('x-goal-push-secret') || ''
  if (!supplied || await sha256(supplied) !== config.cron_secret_hash) {
    return reply(origin, { error: 'Unauthorised' }, 401)
  }
  const { data: subscriptions, error } = await db.from('goal_push_subscriptions')
    .select('id,endpoint,p256dh,auth,match_id,home,away,kickoff_at').limit(10000)
  if (error) throw error
  if (!subscriptions?.length) return reply(origin, { ok: true, checked: 0, sent: 0 })

  const now = Date.now()
  const stale = subscriptions.filter((row: any) => row.kickoff_at && now - new Date(row.kickoff_at).getTime() > 6 * 60 * 60 * 1000)
  if (stale.length) await db.from('goal_push_subscriptions').delete().in('id', stale.map((row: any) => row.id))
  const eligible = subscriptions.filter((row: any) => activeWindow(row, now))
  if (!eligible.length) return reply(origin, { ok: true, checked: 0, sent: 0, cleaned: stale.length })

  const wanted = new Set(eligible.map((row: any) => String(row.match_id)))
  const fixtures = (await getFixtures()).filter((fixture: any) => wanted.has(fixture.id))
  const { data: states, error: stateError } = await db.from('goal_push_match_state')
    .select('match_id,home_goals,away_goals,status').in('match_id', Array.from(wanted))
  if (stateError) throw stateError
  const stateByMatch = new Map((states || []).map((row: any) => [String(row.match_id), row]))
  const subscriptionsByMatch = new Map<string, any[]>()
  for (const row of eligible) {
    const key = String(row.match_id)
    if (!subscriptionsByMatch.has(key)) subscriptionsByMatch.set(key, [])
    subscriptionsByMatch.get(key)!.push(row)
  }

  webpush.setVapidDetails('mailto:Mark@footballtalk.uk', config.vapid_public, config.vapid_private)
  let sent = 0, expired = 0
  for (const fixture of fixtures) {
    const previous: any = stateByMatch.get(fixture.id)
    const previousHome = safeScore(previous?.home_goals), previousAway = safeScore(previous?.away_goals)
    const hasBaseline = previousHome !== null && previousAway !== null
    const homeIncreased = hasBaseline && fixture.homeGoals !== null && fixture.homeGoals > previousHome!
    const awayIncreased = hasBaseline && fixture.awayGoals !== null && fixture.awayGoals > previousAway!
    if (homeIncreased || awayIncreased) {
      const scorer = homeIncreased && !awayIncreased ? fixture.home : awayIncreased && !homeIncreased ? fixture.away : ''
      const payload = JSON.stringify({
        title: scorer ? `GOAL — ${scorer}` : 'SCORE UPDATE',
        body: `${fixture.home} ${fixture.homeGoals}–${fixture.awayGoals} ${fixture.away}${fixture.elapsed != null ? ` · ${fixture.elapsed}′` : ''}`,
        matchId: fixture.id,
        tag: `goal-${fixture.id}-${fixture.homeGoals}-${fixture.awayGoals}`,
      })
      for (const row of subscriptionsByMatch.get(fixture.id) || []) {
        try {
          await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, { TTL: 120, urgency: 'high' })
          sent++
        } catch (pushError: any) {
          const status = Number(pushError?.statusCode || 0)
          if (status === 404 || status === 410) {
            await db.from('goal_push_subscriptions').delete().eq('id', row.id)
            expired++
          } else console.error('Goal push delivery failed', fixture.id, status || String(pushError?.message || pushError))
        }
      }
    }
    const { error: saveError } = await db.from('goal_push_match_state').upsert({
      match_id: fixture.id,
      home_goals: fixture.homeGoals,
      away_goals: fixture.awayGoals,
      status: fixture.status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'match_id' })
    if (saveError) throw saveError
    if (FINISHED.has(fixture.status)) await db.from('goal_push_subscriptions').delete().eq('match_id', fixture.id)
  }
  return reply(origin, { ok: true, checked: fixtures.length, sent, expired, cleaned: stale.length })
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || ''
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) })
  const action = new URL(req.url).pathname.split('/').filter(Boolean).pop() || ''
  try {
    if (action === 'key' && req.method === 'GET') {
      const config = await getConfig()
      return reply(origin, { publicKey: config.vapid_public })
    }
    if (action === 'subscribe' && req.method === 'POST') return await subscribe(origin, req)
    if (action === 'subscribe' && req.method === 'DELETE') return await unsubscribe(origin, req)
    if (action === 'check' && req.method === 'POST') return await checkGoals(origin, req)
    return reply(origin, { error: 'Not found' }, 404)
  } catch (error: any) {
    console.error('Goal push function error', String(error?.message || error))
    return reply(origin, { error: 'Goal alerts are temporarily unavailable' }, 500)
  }
})
