import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { setupSocketHandlers } from './socket/socketServer'
import { logger } from './utils/logger'

const PORT = process.env.PORT || 3001
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
})

app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

setupSocketHandlers(io)

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  io.close()
  httpServer.close(() => process.exit(0))
})

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`CORS origin: ${CLIENT_ORIGIN}`)
})
