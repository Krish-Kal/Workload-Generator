import express from 'express';
import {
  getWorkload,
  getConflicts,
  getSuggestions,
  exportWorkload,
} from '../controllers/workloadController.js';

const router = express.Router();

router.get('/', getWorkload);
router.get('/conflicts', getConflicts);
router.get('/suggestions', getSuggestions);
router.get('/export', exportWorkload);

export default router;

