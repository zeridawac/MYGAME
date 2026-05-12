const express = require('express');
const {
  listUsers,
  updateUserStats,
  createInviteCode,
  listInviteCodes,
  listAdminAnnouncements,
  createAnnouncement,
  listAssets,
  createAsset,
  updateAsset,
  listWithdrawals,
  updateWithdrawalStatus,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  listTaskSubmissions,
  reviewTaskSubmission,
  getCoinConversion,
  updateCoinConversion,
  listGameConfigs,
  updateGameConfig,
  listActivity,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(protect, adminOnly);

router.get('/users', listUsers);
router.patch('/users/:id', updateUserStats);

router.get('/invite-codes', listInviteCodes);
router.post('/invite-codes', createInviteCode);

router.get('/announcements', listAdminAnnouncements);
router.post('/announcements', createAnnouncement);

router.get('/assets', listAssets);
router.post('/assets', createAsset);
router.patch('/assets/:id', updateAsset);

router.get('/withdrawals', listWithdrawals);
router.patch('/withdrawals/:id', updateWithdrawalStatus);

router.get('/coupons', listCoupons);
router.post('/coupons', createCoupon);
router.patch('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

router.get('/tasks', listTasks);
router.post('/tasks', createTask);
router.patch('/tasks/:id', updateTask);
router.delete('/tasks/:id', deleteTask);

router.get('/task-submissions', listTaskSubmissions);
router.patch('/task-submissions/:id', reviewTaskSubmission);

router.get('/settings/coin-rate', getCoinConversion);
router.patch('/settings/coin-rate', updateCoinConversion);

router.get('/game-configs', listGameConfigs);
router.patch('/game-configs/:gameKey', updateGameConfig);

router.get('/activity', listActivity);

module.exports = router;
