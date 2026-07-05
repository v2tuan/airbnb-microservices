import { StatusCodes } from 'http-status-codes'
import { messageService } from '~/services/messageService'
import { emitNotification, isUserViewingConversation } from '~/sockets'
import userModel from '~/models/users'
import { publishNotificationEvent } from '~/services/notificationPublisher'

const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.jwtDecoded._id
    const { conversationId } = req.body
    const text = req.body.text
    const files = req.files || []
    const io = req.io

    if (!conversationId || (!text && (!files || !files.length))) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'conversationId and at least text or file is required'
      })
    }

    const { message, conversation } = await messageService.sendMessage({
      conversationId,
      senderId,
      text,
      files,
      io
    })

    const recipients = (conversation?.participants || []).filter(
      (id) => String(id) !== String(senderId)
    )

    const sender = await userModel.findOne({ keycloakUserId: senderId }).select('fullName userName').lean()
    const senderName = sender?.fullName || sender?.userName || 'Someone'

    res.status(StatusCodes.CREATED).json(message)

    if (recipients.length > 0) {
      void Promise.allSettled(
        recipients.map((recipientId) => {
          if (!isUserViewingConversation(recipientId, conversationId)) {
            const notificationPayload = {
              eventType: 'MESSAGE',
              recipientId: String(recipientId),
              title: 'New message',
              message: `${senderName} sent you a message`,
              meta: {
                conversationId: message.conversationId,
                messageId: message._id,
                senderId: String(senderId),
                href: `/guest/messages/${conversationId}`
              },
              locale: 'vi'
            }

            emitNotification(String(recipientId), {
              _id: String(message._id),
              type: 'MESSAGE',
              title: notificationPayload.title,
              message: notificationPayload.message,
              meta: notificationPayload.meta,
              read: false,
              createdAt: new Date().toISOString()
            })

            return publishNotificationEvent(notificationPayload)
          }

          return Promise.resolve()
        })
      )
    }
  } catch (error) {
    next(error)
  }
}

const getMessages = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { conversationId } = req.params
    const { page = 1, limit = 50 } = req.query

    const result = await messageService.getMessages({
      conversationId,
      userId,
      page: parseInt(page),
      limit: parseInt(limit)
    })

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const toggleReaction = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { messageId } = req.params
    const { emoji } = req.body
    const io = req.io

    if (!emoji) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'emoji is required' })
    }

    const message = await messageService.toggleReaction({
      messageId,
      userId,
      emoji,
      io
    })

    res.status(StatusCodes.OK).json(message)
  } catch (error) {
    next(error)
  }
}

const deleteMessageForMe = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { messageId } = req.params

    const result = await messageService.deleteForUser({
      messageId,
      userId
    })

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const recallMessage = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { messageId } = req.params
    const io = req.io

    const message = await messageService.recallMessage({
      messageId,
      userId,
      io
    })

    res.status(StatusCodes.OK).json(message)
  } catch (error) {
    next(error)
  }
}

const getConversationMedia = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { conversationId } = req.params
    const { type = 'image', page = 1, limit = 12 } = req.query

    const result = await messageService.getMedia({
      conversationId,
      userId,
      type,
      page: parseInt(page),
      limit: parseInt(limit)
    })

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

export const messageController = {
  sendMessage,
  getMessages,
  toggleReaction,
  deleteMessageForMe,
  recallMessage,
  getConversationMedia
}
