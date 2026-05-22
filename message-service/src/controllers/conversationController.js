import { StatusCodes } from 'http-status-codes'
import { conversationService } from '~/services/conversationService'

const createOrGetConversation = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { otherUserId } = req.body

    if (!otherUserId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'otherUserId is required' })
    }

    const conversation = await conversationService.findOrCreateDirectConversation(userId, otherUserId)

    res.status(StatusCodes.OK).json(conversation)
  } catch (error) {
    next(error)
  }
}

const getUserConversations = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const conversations = await conversationService.getUserConversations(userId)

    res.status(StatusCodes.OK).json(conversations)
  } catch (error) {
    next(error)
  }
}

const getConversationById = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { conversationId } = req.params

    const conversation = await conversationService.getConversationById(conversationId, userId)

    res.status(StatusCodes.OK).json(conversation)
  } catch (error) {
    next(error)
  }
}

export const conversationController = {
  createOrGetConversation,
  getUserConversations,
  getConversationById
}