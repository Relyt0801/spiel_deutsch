import express, { type Request, type Response } from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { setupSocketHandlers } from './socket/socketServer'
import { logger } from './utils/logger'

const PORT = process.env.PORT || 3001

// Allow all origins by default (single-service deployment, local tunnel, and the
// dev Vite server on :5173 all "just work"). Lock it down only when CLIENT_ORIGIN
// is explicitly set – e.g. a split Render deployment with separate client + server.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN
const corsOrigin = !CLIENT_ORIGIN || CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
})

app.use(cors({ origin: corsOrigin }))
app.use(express.json())

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

setupSocketHandlers(io)

// ─── Serve the built client (single-service deployment) ──────────────────────
// `npm run build` puts the client at ../../client/dist relative to this file
// (server/dist/index.js). If it exists, we serve the whole game from this one
// server, so there is just ONE link to share with the students.
const clientDist = path.resolve(__dirname, '../../client/dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  // SPA fallback: anything that isn't a real file / API / socket route → index.html.
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
  logger.info(`Serving client from ${clientDist}`)
} else {
  logger.info('No client build found – running in API-only mode (dev).')
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  io.close()
  httpServer.close(() => process.exit(0))
})

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`CORS origin: ${corsOrigin === true ? '(alle)' : corsOrigin}`)
})
