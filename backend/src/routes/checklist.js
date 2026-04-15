const express = require('express');
const router = express.Router();
const checklist = require('../models/checklist');
const auth = require('../middleware/auth');

router.get('/weekly', auth, async (req, res) => {
  try {
    const weekStart = checklist.getWeekStart();
    const items = await checklist.getWeeklyChecklist(req.user.id, weekStart);
    res.json({ 
      success: true, 
      data: { 
        week_start: weekStart, 
        items, 
        completed_count: items.filter(i => i.completed).length, 
        total_count: items.length 
      } 
    });
  } catch (e) {
    console.error('[Route /weekly] 错误:', e);
    res.status(500).json({ 
      success: false, 
      message: '获取清单失败',
      error: e.message 
    });
  }
});

router.post('/complete/:itemId', auth, async (req, res) => {
  try {
    const result = checklist.completeItem(req.user.id, checklist.getWeekStart(), parseInt(req.params.itemId), req.body.notes || '');
    res.json({ success: true, data: { completed: result.changes > 0 } });
  } catch (e) {
    console.error('[Route /complete] 错误:', e);
    res.status(500).json({ success: false, message: '完成失败', error: e.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const weeks = await checklist.getHistory(req.user.id, limit);
    res.json({ success: true, data: { weeks } });
  } catch (e) {
    console.error('[Route /history] 错误:', e);
    res.status(500).json({ success: false, message: '获取历史失败', error: e.message });
  }
});

module.exports = router;
