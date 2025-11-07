import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import dotenv from 'dotenv'
import http from 'http'
import { readFileSync } from 'fs'
import { join } from 'path'
import cors from 'cors'
import session from 'express-session'
import {
  handleCallConnection,
  handleFrontendConnection,
} from './sessionManager'
import functions from './functionHandlers'
import { requireAuth, optionalAuth, AuthRequest } from './middleware/auth'
import campaignRoutes from './routes/campaigns'
import leadRoutes from './routes/leads'
import authRoutes from './routes/auth'
import queueRoutes from './routes/queue'
import { queueManager } from './services/queueManager'

dotenv.config()

const PORT = parseInt(process.env.PORT || '8081', 10)
const PUBLIC_URL = process.env.PUBLIC_URL || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is required')
  process.exit(1)
}

const app = express()
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000'

app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
)

app.use('/api/auth', authRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/queue', queueRoutes)

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const twimlPath = join(__dirname, 'twiml.xml')
const twimlTemplate = readFileSync(twimlPath, 'utf-8')

app.get('/public-url', optionalAuth, (req, res) => {
  res.json({ publicUrl: PUBLIC_URL })
})

app.all('/twiml', optionalAuth, (req, res) => {
  const wsUrl = new URL(PUBLIC_URL)
  wsUrl.protocol = 'wss:'
  wsUrl.pathname = '/call'

  const twimlContent = twimlTemplate.replace('{{WS_URL}}', wsUrl.toString())
  res.type('text/xml').send(twimlContent)
})

app.get('/tools', requireAuth, (req: AuthRequest, res) => {
  res.json(functions.map((f) => f.schema))
})

let currentCall: WebSocket | null = null
let currentLogs: WebSocket | null = null

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
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
    handleCallConnection(currentCall, OPENAI_API_KEY)
  } else if (type === 'logs') {
    if (currentLogs) currentLogs.close()
    currentLogs = ws
    handleFrontendConnection(currentLogs)
  } else {
    ws.close()
  }
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export { queueManager }
