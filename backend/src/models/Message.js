import mongoose from 'mongoose';
import { MESSAGE_MAX } from '../utils/validate.js';

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: { type: String, required: true, trim: true, maxlength: MESSAGE_MAX },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  createdAt: { type: Date, default: Date.now },
});

// Conversation history (either direction), newest first
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });
// Fast lookup of unread/undelivered messages for a recipient
messageSchema.index({ receiverId: 1, status: 1 });

export default mongoose.model('Message', messageSchema);
