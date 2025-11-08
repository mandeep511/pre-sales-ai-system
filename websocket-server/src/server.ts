import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import dotenv from 'dotenv'
import http from 'http'
import { readFileSync } from 'fs'
import { join } from 'path'
import cors from 'cors'
import session from 'express-session'
import { RedisStore } from 'connect-redis'
import helmet from 'helmet'
import {
  handleCallConnection,
  handleFrontendConnection,
  initiateOutboundCall,
  CallContext,
} from './sessionManager'
import functions from './functionHandlers'
import { requireAuth, optionalAuth, AuthRequest } from './middleware/auth'
import { authRateLimit } from './middleware/rateLimit'
import { validateTwilioSignature } from './middleware/twilio'
import campaignRoutes from './routes/campaigns'
import leadRoutes from './routes/leads'
import authRoutes from './routes/auth'
import queueRoutes from './routes/queue'
import callRoutes from './routes/calls'
import { queueManager } from './services/queueManager'
import { redis } from './lib/redis'
import { prisma } from './lib/prisma'

dotenv.config()

const PORT = parseInt(process.env.PORT || '8081', 10)
const PUBLIC_URL = process.env.PUBLIC_URL || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const SESSION_SECRET = process.env.SESSION_SECRET

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is required')
  process.exit(1)
}

if (!SESSION_SECRET) {
  console.error('SESSION_SECRET environment variable is required')
  process.exit(1)
}

if (process.env.NODE_ENV === 'production' && !PUBLIC_URL) {
  console.warn('WARNING: PUBLIC_URL not set in production. Twilio webhooks may fail.')
}

const app = express()

// Parse CORS_ORIGIN as a comma-separated list, default to localhost
const corsOriginEnv = process.env.CORS_ORIGIN || 'http://localhost:3000'
const allowedOrigins = corsOriginEnv.split(',').map(origin => origin.trim())

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

app.use(helmet())
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin, like mobile apps or curl, and always allow for matching origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(
  session({
    store: new RedisStore({ client: redis, prefix: 'sess:' }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
)

app.use('/api/auth', authRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/queue', queueRoutes)
app.use('/api/calls', callRoutes)

const server = http.createServer(app)
const wss = new WebSocketServer({ server })
const twimlPath = join(__dirname, 'twiml.xml')

app.get('/public-url', optionalAuth, (req, res) => {
  res.json({ publicUrl: PUBLIC_URL })
})

app.get('/twiml', validateTwilioSignature, async (req, res) => {
  const { callSessionId } = req.query as { callSessionId?: string }

  if (!PUBLIC_URL) {
    return res.status(500).send('PUBLIC_URL not configured')
  }

  const wsUrl = `${PUBLIC_URL.replace(/^https?/, (m) => m === 'https' ? 'wss' : 'ws')}/call${
    callSessionId ? `?callSessionId=${callSessionId}` : ''
  }`

  const twimlTemplate = readFileSync(twimlPath, 'utf-8').replace(
    '{{WS_URL}}',
    wsUrl
  )

  res.type('text/xml')
  res.send(twimlTemplate)
})

app.get('/tools', requireAuth, (req: AuthRequest, res) => {
  res.json(functions.map((f) => f.schema))
})

let currentCall: WebSocket | null = null
let currentLogs: WebSocket | null = null

wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const parts = url.pathname.split('/').filter(Boolean)

  if (parts.length < 1) {
    ws.close()
    return
  }

  const type = parts[0]

  if (type === 'call') {
    if (currentCall) currentCall.close()
    currentCall = ws

    const callUrl = new URL(req.url || '', `ws://${req.headers.host}`)
    const callSessionId = callUrl.searchParams.get('callSessionId')

    let callContext: CallContext | undefined

    if (callSessionId) {
      try {
        const cached = await redis.get(`call:context:${callSessionId}`)
        if (cached) {
          callContext = JSON.parse(cached) as CallContext
        }
      } catch (error) {
        console.error('Failed to load call context:', error)
      }
    }

    handleCallConnection(currentCall, OPENAI_API_KEY, callContext)
  } else if (type === 'logs') {
    if (currentLogs) currentLogs.close()
    currentLogs = ws
    handleFrontendConnection(currentLogs)
  } else {
    ws.close()
  }
})

app.post('/api/call-status', validateTwilioSignature, express.json(), async (req, res) => {
  const { CallSid, CallStatus } = req.body

  console.log(`Call ${CallSid} status: ${CallStatus}`)

  try {
    const callSession = await prisma.callSession.findUnique({
      where: { twilioCallSid: CallSid },
    })

    if (!callSession) {
      return res.sendStatus(200)
    }

    const statusMap: Record<string, string> = {
      initiated: 'dialing',
      ringing: 'ringing',
      'in-progress': 'active',
      completed: 'completed',
      busy: 'no_answer',
      failed: 'failed',
      'no-answer': 'no_answer',
    }

    const newStatus = statusMap[CallStatus] || CallStatus

    await prisma.callSession.update({
      where: { id: callSession.id },
      data: { status: newStatus },
    })

    if (['busy', 'failed', 'no-answer'].includes(CallStatus)) {
      await prisma.callSession.update({
        where: { id: callSession.id },
        data: {
          outcome: statusMap[CallStatus],
          endedAt: new Date(),
        },
      })

      await queueManager.handleCallComplete(
        callSession.id,
        statusMap[CallStatus]
      )
    }

    res.sendStatus(200)
  } catch (error) {
    console.error('Error handling call status:', error)
    res.sendStatus(500)
  }
})

queueManager.on('call:ready', async (data: any) => {
  const { callSessionId, leadId, campaignId } = data

  try {
    await initiateOutboundCall(callSessionId, leadId, campaignId)
  } catch (error) {
    console.error('Failed to initiate call from queue:', error)
  }
})

console.log('Queue manager connected to call system')

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export { queueManager }
