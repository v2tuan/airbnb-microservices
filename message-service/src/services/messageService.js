import { StatusCodes } from 'http-status-codes'
import mongoose from 'mongoose'
import messageModel from '~/models/messages'
import conversationModel from '~/models/conversations'
import ApiError from '~/utils/ApiError'
import { conversationService } from './conversationService'
import { cloudinary } from '~/config/cloudinary'
import { publishNotificationEvent } from './notificationPublisher'

const uploadBufferToCloudinary = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: options.folder,
        public_id: options.public_id
      },
      (error, result) => {
        if (error) return reject(error)
        resolve(result)
      }
    )

    stream.end(file.buffer)
  })
}

const sendMessage = async ({ conversationId, senderId, senderName, senderAvatarUrl, text, files = [], io }) => {
  try {
    const conversation = await conversationModel.findOne({
      _id: conversationId,
      participants: String(senderId)
    })

    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found or you are not a participant')
    }

    const recipientId = conversation.participants.find(
      (participant) => String(participant) !== String(senderId)
    )

    let attachments = []
    if (Array.isArray(files) && files.length > 0) {
      const folder = `message-service/messages/${conversationId}`
      const uploadResults = await Promise.all(
        files.map((file) =>
          uploadBufferToCloudinary(file, {
            folder,
            public_id: `${Date.now()}_${file.originalname}`
          })
        )
      )

      attachments = uploadResults.map((r, idx) => {
        const f = files[idx]
        const mime = f.mimetype || r.resource_type
        let type = 'file'
        if (mime?.startsWith('image/')) type = 'image'
        else if (mime?.startsWith('audio/')) type = 'audio'
        else if (mime?.startsWith('video/')) type = 'video'

        return {
          url: r.secure_url,
          type,
          filename: f.originalname,
          mimetype: mime,
          size: f.size
        }
      })
    }

    const trimmedText = typeof text === 'string' ? text.trim() : ''
    const hasText = !!trimmedText
    const hasAttachments = attachments.length > 0

    const messageType = hasText && hasAttachments
      ? 'mixed'
      : hasAttachments
        ? 'media'
        : 'text'

    const message = await messageModel.create({
      conversationId,
      senderId: String(senderId),
      text: trimmedText || undefined,
      attachments: attachments.length ? attachments : undefined,
      messageType
    })

    await message.populate('senderId', '_id userName fullName avatar')

    await conversationService.updateLastMessage(conversationId, message)

    if (recipientId) {
      try {
        await publishNotificationEvent({
          eventType: 'MESSAGE',
          channel: 'PUSH',
          recipientId: String(recipientId),
          title: senderName ? `${senderName} sent you a message` : 'New message',
          message: trimmedText || (attachments.length > 0 ? 'Sent you an attachment.' : 'Sent a new message.'),
          meta: {
            conversationId,
            messageId: message._id,
            senderId: String(senderId),
            senderName,
            senderAvatarUrl
          },
          payload: {
            conversationId,
            messageId: message._id,
            senderId: String(senderId),
            text: trimmedText
          }
        })
      } catch (notificationError) {
        console.error('Failed to publish message notification', notificationError)
      }
    }

    if (io) {
      io.to(`conversation:${conversationId}`).emit('message:new', {
        conversationId,
        message: message.toObject()
      })
    }

    return { message, conversation }
  } catch (error) {
    throw error
  }
}

const toggleReaction = async ({ messageId, userId, emoji, io }) => {
  const message = await messageModel.findById(messageId)
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Message not found')
  }

  const conversation = await conversationModel.findOne({
    _id: message.conversationId,
    participants: String(userId)
  })
  if (!conversation) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant of this conversation')
  }

  const reactions = message.reactions || []
  const reactionIdx = reactions.findIndex(
    (r) => String(r.userId) === String(userId) && r.emoji === emoji
  )

  if (reactionIdx !== -1) {
    reactions.splice(reactionIdx, 1)
  } else {
    reactions.push({ userId: String(userId), emoji, createdAt: new Date() })
  }

  message.reactions = reactions
  await message.save()

  if (io) {
    io.to(`conversation:${message.conversationId}`).emit('message:reaction', {
      conversationId: message.conversationId,
      messageId: message._id,
      reactions: message.reactions
    })
  }

  return message
}

const getMessages = async ({ conversationId, userId, page = 1, limit = 50 }) => {
  try {
    const conversation = await conversationModel.findOne({
      _id: conversationId,
      participants: String(userId)
    })

    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found or you are not a participant')
    }

    const skip = (page - 1) * limit

    const messages = await messageModel.find({
      conversationId,
      'deletedFor.userId': { $ne: String(userId) }
    })
      .populate('senderId', '_id userName fullName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await messageModel.countDocuments({
      conversationId,
      'deletedFor.userId': { $ne: String(userId) }
    })

    return {
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    throw error
  }
}

const deleteForUser = async ({ messageId, userId }) => {
  const message = await messageModel.findById(messageId)
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Message not found')
  }

  const conversation = await conversationModel.findOne({
    _id: message.conversationId,
    participants: String(userId)
  })
  if (!conversation) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant of this conversation')
  }

  const deletedFor = message.deletedFor || []
  const already = deletedFor.some((d) => String(d.userId) === String(userId))
  if (!already) {
    deletedFor.push({ userId: String(userId), deletedAt: new Date() })
    message.deletedFor = deletedFor
    await message.save()
  }

  return { ok: true }
}

const recallMessage = async ({ messageId, userId, io }) => {
  const message = await messageModel.findById(messageId)
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Message not found')
  }

  if (String(message.senderId) !== String(userId)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only sender can recall this message')
  }

  message.recalled = true
  await message.save()

  if (io) {
    io.to(`conversation:${message.conversationId}`).emit('message:recalled', {
      conversationId: message.conversationId,
      messageId: message._id
    })
  }

  return message
}

const getMedia = async ({ conversationId, userId, type = 'image', page = 1, limit = 12 }) => {
  try {
    const conv = await conversationModel.findOne({ _id: conversationId, participants: String(userId) })
    if (!conv) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found or you are not a participant')
    }

    const matchBase = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
      'deletedFor.userId': { $ne: String(userId) }
    }

    const countAgg = await messageModel.aggregate([
      { $match: matchBase },
      { $unwind: '$attachments' },
      { $match: { 'attachments.type': type } },
      { $count: 'total' }
    ])
    const total = countAgg?.[0]?.total || 0

    const skip = (page - 1) * limit

    const items = await messageModel.aggregate([
      { $match: matchBase },
      { $unwind: '$attachments' },
      { $match: { 'attachments.type': type } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          url: '$attachments.url',
          type: '$attachments.type',
          filename: '$attachments.filename',
          mimetype: '$attachments.mimetype',
          size: '$attachments.size',
          createdAt: '$createdAt',
          messageId: '$_id',
          senderId: '$senderId'
        }
      }
    ])

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    throw error
  }
}

export const messageService = {
  sendMessage,
  getMessages,
  toggleReaction,
  deleteForUser,
  recallMessage,
  getMedia
}
