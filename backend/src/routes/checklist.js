const express = require('express');
const router = express.Router();
const checklist = require('../models/checklist');
const auth = require('../middleware/auth');

router.get('/weekly', auth, async (req, res) => {
  try {
    const weekStart = checklist.getWeekStart();
    const items = await checklist.getWeeklyChecklist(req.user.id, weekStart);
    res.json({ success: true, data: { week_start: weekStart, items, completed_count: items.filter(i=>i.completed).length, total_count: items.length } });
  } catch(e) { res.status(500).json({ success:false, message:'错误' }); }
});

router.post('/complete/:itemId', auth, async (req, res) => {
  try {
    const result = await checklist.completeItem(req.user.id, checklist.getWeekStart(), parseInt(req.params.itemId), req.body.notes||'');
    res.json({ success: true, data: { completed: result.changes > 0 } });
  } catch(e) { res.status(500).json({ success:false, message:'失败' }); }
});

router.get('/history', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const weeks = await checklist.getHistory(req.user.id, limit);
    res.json({ success: true, data: { weeks } });
  } catch(e) { res.status(500).json({ success:false, message:'错误' }); }
});

module.exports = router;
