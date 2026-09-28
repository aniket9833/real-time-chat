import { Router } from 'express';
import {
  getConversation,
  sendMessage,
} from '../controllers/message.controller.js';
import { requireUser } from '../middleware/currentUser.middleware.js';

const router = Router();
router.use(requireUser);
router.post('/', sendMessage);
router.get('/:userId', getConversation);
export default router;
