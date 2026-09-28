import mongoose from 'mongoose';
import { USERNAME_MAX, USERNAME_MIN } from '../utils/validate.js';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: USERNAME_MIN,
    maxlength: USERNAME_MAX,
  },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
