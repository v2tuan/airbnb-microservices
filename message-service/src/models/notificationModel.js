import mongoose from 'mongoose'

const { Schema } = mongoose

const NotificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['MESSAGE', 'ADMIN_ACTION', 'PROPERTY', 'NEW_POST', 'TEST'], required: true },
    title: { type: String, default: '' },
    message: { type: String, required: true },
    meta: { type: Object, default: {} },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
)

export const Notification = mongoose.model('Notification', NotificationSchema)