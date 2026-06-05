import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: false,
    trim: true
  },
  attachments: [
    {
      url: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['image', 'file', 'audio', 'video'],
        default: 'file'
      },
      filename: String,
      mimetype: String,
      size: Number
    }
  ],
  messageType: {
    type: String,
    enum: ['text', 'media', 'mixed'],
    default: 'text'
  },
  reactions: [
    {
      userId: {
        type: String,
        required: true
      },
      emoji: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  deletedFor: [
    {
      userId: {
        type: String,
        required: true
      },
      deletedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  recalled: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
})

messageSchema.index({ conversationId: 1, createdAt: -1 })

const messageModel = mongoose.model('Message', messageSchema)
export default messageModel