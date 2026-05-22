import express from 'express'
import { messageController } from '~/controllers/messageController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { uploadFiles } from '~/middlewares/uploadMiddleware'

const Router = express.Router()

Router.use(authMiddleware.isAuthorized)

Router.route('/')
  .post(uploadFiles, messageController.sendMessage)

Router.route('/:conversationId')
  .get(messageController.getMessages)

Router.route('/:conversationId/media')
  .get(messageController.getConversationMedia)

Router.route('/:messageId/reactions')
  .post(messageController.toggleReaction)

Router.route('/:messageId')
  .delete(messageController.deleteMessageForMe)

Router.route('/:messageId/recall')
  .post(messageController.recallMessage)

export const messageRoutes = Router