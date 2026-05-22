import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct'],
    default: 'direct',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    text: { type: String, default: '' },
    attachments: {
      type: Array,
      default: []
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    createdAt: { type: Date, default: null }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

conversationSchema.index({ participants: 1 })

conversationSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

const conversationModel = mongoose.model('Conversation', conversationSchema)
export default conversationModel