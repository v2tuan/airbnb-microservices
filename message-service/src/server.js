import express from 'express'
import http from 'http'
import exitHook from 'async-exit-hook'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import { APIs_V1 } from './routes/v1'
import { env } from './config/environment'
import { errorHandlingMiddleware } from '~/middlewares/exampleMiddleware'
import { initSocket } from './sockets'
import { startNotificationRealtimeConsumer, stopNotificationRealtimeConsumer } from '~/services/notificationRealtimeConsumer'
import { disconnectNotificationPublisher } from '~/services/notificationPublisher'

const START_SERVER = () => {
  const app = express()

  app.set('query parser', 'extended')

  const server = http.createServer(app)
  const io = initSocket(server)
  void startNotificationRealtimeConsumer(io).catch((error) => {
    console.error('Failed to start notification realtime consumer', error)
  })

  app.use((req, res, next) => {
    req.io = io
    next()
  })

  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  app.use(express.json({ limit: '20mb' }))
  app.use(cookieParser())
  app.use('/V1', APIs_V1)
  app.use(errorHandlingMiddleware)

  if (env.BUILD_MODE === 'production') {
    server.listen(process.env.PORT, () => {
      console.log(`Production: Hello ${env.AUTHOR}, I am running at Port: ${process.env.PORT}/`)
    })
  } else {
    // If LOCAL_DEV_APP_HOST is 'localhost', using it as hostname may bind to IPv6 ::1 only on some systems.
    // Passing undefined as hostname causes Node to listen on all interfaces (0.0.0.0), which accepts 127.0.0.1 and ::1.
    const hostToUse = env.LOCAL_DEV_APP_HOST === 'localhost' ? undefined : env.LOCAL_DEV_APP_HOST

    server.listen(env.LOCAL_DEV_APP_PORT, hostToUse, () => {
      const hostLog = hostToUse ?? '0.0.0.0'
      console.log(`LocalDev: Hello ${env.AUTHOR}, I am running at http://${hostLog}:${env.LOCAL_DEV_APP_PORT}/`)
      console.log('Socket.IO is ready for realtime chat')
    })
  }

  exitHook(() => {
    console.log('Disconnecting from MongoDB')
    void stopNotificationRealtimeConsumer()
    void disconnectNotificationPublisher()
    mongoose.connection.close()
    console.log('Disconnected from MongoDB')
  })
}

(async () => {
  try {
    console.log('Connect to MongoDB Atlas (Mongoose)')
    await mongoose.connect(env.MONGODB_URI, { dbName: env.DATABASE_NAME })
    console.log('Connected to MongoDB Atlas (Mongoose)')
    START_SERVER()
  } catch (error) {
    console.error(error)
    process.exit(0)
  }
})()
