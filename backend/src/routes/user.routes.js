import { Router } from 'express';
import { getUsers } from '../controllers/user.controller.js';
import { requireUser } from '../middleware/currentUser.middleware.js';

const router = Router();
router.get('/', requireUser, getUsers);
export default router;
