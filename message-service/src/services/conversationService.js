import { StatusCodes } from 'http-status-codes'
import conversationModel from '~/models/conversations'
import ApiError from '~/utils/ApiError'
import { env } from '~/config/environment'

const USER_SERVICE_BASE_URL = env.USER_SERVICE_BASE_URL || 'http://user-service:8082/users'

const fetchParticipantProfiles = async (userIds) => {
  const uniqueIds = Array.from(
    new Set((Array.isArray(userIds) ? userIds : []).map((value) => String(value)).filter(Boolean))
  )

  if (uniqueIds.length === 0) {
    return new Map()
  }

  try {
    const response = await fetch(`${USER_SERVICE_BASE_URL}/public/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ keycloakUserIds: uniqueIds })
    })

    if (!response.ok) {
      return new Map()
    }

    const profiles = await response.json()
    return new Map(
      Array.isArray(profiles)
        ? profiles
            .filter((profile) => profile?.keycloakUserId)
            .map((profile) => [
              String(profile.keycloakUserId),
              {
                fullName: profile.fullName || '',
                avatarUrl: profile.avatarUrl || ''
              }
            ])
        : []
    )
  } catch {
    return new Map()
  }
}

const enrichConversation = (conversation, profileMap) => {
  const plainConversation = conversation.toObject ? conversation.toObject() : conversation
  const participants = Array.isArray(plainConversation.participants) ? plainConversation.participants : []

  const participantProfiles = participants.reduce((acc, participant) => {
    const participantId = String(participant)
    const profile = profileMap.get(participantId)
    if (profile) {
      acc[participantId] = profile
    }
    return acc
  }, {})

  const lastMessageSenderId = plainConversation.lastMessage?.senderId ? String(plainConversation.lastMessage.senderId) : ''
  const lastMessageSenderProfile = lastMessageSenderId ? profileMap.get(lastMessageSenderId) || null : null

  return {
    ...plainConversation,
    participantProfiles,
    lastMessage: {
      ...plainConversation.lastMessage,
      senderProfile: lastMessageSenderProfile
    }
  }
}

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
    const conversations = await conversationModel.find({ participants: String(userId) })
      .populate('participants', '_id userName fullName avatar isOnline lastActiveAt')
      .populate('lastMessage.senderId', '_id userName fullName avatar isOnline lastActiveAt')
      .sort({ updatedAt: -1 })

    const partnerIds = conversations.flatMap((conversation) => {
      const participants = Array.isArray(conversation.participants) ? conversation.participants : []
      return participants
        .map((participant) => String(participant))
        .filter((participantId) => participantId && participantId !== String(userId))
    })

    const profileMap = await fetchParticipantProfiles(partnerIds)

    return conversations.map((conversation) => enrichConversation(conversation, profileMap))
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

    const participantIds = Array.isArray(conversation.participants)
      ? conversation.participants
          .map((participant) => String(participant))
          .filter(Boolean)
      : []
    const profileMap = await fetchParticipantProfiles(participantIds)

    return enrichConversation(conversation, profileMap)
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
        messageType: message.messageType || 'text',
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
