import express from 'express'
import http from 'http'
import exitHook from 'async-exit-hook'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import { APIs_V1 } from './routes/v1'
import { env } from './config/environment'
import { corsOptions } from './config/cors'
import { errorHandlingMiddleware } from '~/middlewares/exampleMiddleware'
import { initSocket } from './sockets'

const START_SERVER = () => {
  const app = express()

  app.set('query parser', 'extended')

  const server = http.createServer(app)
  const io = initSocket(server)

  app.use((req, res, next) => {
    req.io = io
    next()
  })

  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  app.use(express.json({ limit: '20mb' }))
  app.use(cors(corsOptions))
  app.use(cookieParser())
  app.use('/V1', APIs_V1)
  app.use(errorHandlingMiddleware)

  if (env.BUILD_MODE === 'production') {
    server.listen(process.env.PORT, () => {
      console.log(`Production: Hello ${env.AUTHOR}, I am running at Port: ${process.env.PORT}/`)
    })
  } else {
    server.listen(env.LOCAL_DEV_APP_PORT, env.LOCAL_DEV_APP_HOST, () => {
      console.log(`LocalDev: Hello ${env.AUTHOR}, I am running at http://${env.LOCAL_DEV_APP_HOST}:${env.LOCAL_DEV_APP_PORT}/`)
      console.log('Socket.IO is ready for realtime chat')
    })
  }

  exitHook(() => {
    console.log('Disconnecting from MongoDB')
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