import express from 'express'
import { conversationController } from '~/controllers/conversationController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.use(authMiddleware.isAuthorized)

Router.route('/')
  .post(conversationController.createOrGetConversation)
  .get(conversationController.getUserConversations)

Router.route('/:conversationId')
  .get(conversationController.getConversationById)

export const conversationRoutes = Router