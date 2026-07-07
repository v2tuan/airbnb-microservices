import { StatusCodes } from 'http-status-codes'
import { messageService } from '~/services/messageService'
import { env } from '~/config/environment'

const USER_SERVICE_BASE_URL = env.USER_SERVICE_BASE_URL || 'http://user-service:8082/users'

const resolveSenderProfile = async (senderId) => {
  if (!senderId) return { senderName: 'Someone', senderAvatarUrl: '' }

  try {
    const response = await fetch(`${USER_SERVICE_BASE_URL}/public/${encodeURIComponent(senderId)}`, {
      headers: { Accept: 'application/json' }
    })

    if (!response.ok) {
      return { senderName: 'Someone', senderAvatarUrl: '' }
    }

    const profile = await response.json()
    return {
      senderName: profile?.fullName || profile?.userName || 'Someone',
      senderAvatarUrl: profile?.avatarUrl || ''
    }
  } catch {
    return { senderName: 'Someone', senderAvatarUrl: '' }
  }
}

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

    const { senderName, senderAvatarUrl } = await resolveSenderProfile(senderId)

    const { message, conversation } = await messageService.sendMessage({
      conversationId,
      senderId,
      text,
      files,
      io,
      senderName,
      senderAvatarUrl
    })

    res.status(StatusCodes.CREATED).json(message)
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
