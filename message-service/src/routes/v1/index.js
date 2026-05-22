import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { conversationRoutes } from './conversationRoute'
import { messageRoutes } from './messageRoute'

const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use.', code: StatusCodes.OK })
})

Router.use('/conversations', conversationRoutes)
Router.use('/messages', messageRoutes)

export const APIs_V1 = Router