import { StatusCodes } from 'http-status-codes'
import conversationModel from '~/models/conversations'
import ApiError from '~/utils/ApiError'

const findOrCreateDirectConversation = async (userId1, userId2) => {
  try {
    let conversation = await conversationModel.findOne({
      type: 'direct',
      participants: { $all: [String(userId1), String(userId2)], $size: 2 }
    })
      .populate('participants', '_id userName fullName avatar isOnline lastActiveAt')
      .populate('lastMessage.senderId', '_id userName fullName avatar isOnline lastActiveAt')

    if (conversation) {
      return conversation
    }

    conversation = await conversationModel.create({
      type: 'direct',
      participants: [String(userId1), String(userId2)]
    })

    conversation = await conversation.populate('participants', '_id userName fullName avatar isOnline lastActiveAt')
    return conversation
  } catch (error) {
    throw error
  }
}

const getUserConversations = async (userId) => {
  try {
    return await conversationModel.find({ participants: String(userId) })
      .populate('participants', '_id userName fullName avatar isOnline lastActiveAt')
      .populate('lastMessage.senderId', '_id userName fullName avatar isOnline lastActiveAt')
      .sort({ updatedAt: -1 })
  } catch (error) {
    throw error
  }
}

const getConversationById = async (conversationId, userId) => {
  try {
    const conversation = await conversationModel.findOne({
      _id: conversationId,
      participants: String(userId)
    })
      .populate('participants', '_id userName fullName avatar isOnline lastActiveAt')
      .populate('lastMessage.senderId', '_id userName fullName avatar isOnline lastActiveAt')

    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found')
    }

    return conversation
  } catch (error) {
    throw error
  }
}

const updateLastMessage = async (conversationId, message) => {
  try {
    await conversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: {
        messageId: message._id,
        text: message.text,
        attachments: message.attachments || [],
        senderId: message.senderId,
        createdAt: message.createdAt
      },
      updatedAt: Date.now()
    })
  } catch (error) {
    throw error
  }
}

export const conversationService = {
  findOrCreateDirectConversation,
  getUserConversations,
  getConversationById,
  updateLastMessage
}