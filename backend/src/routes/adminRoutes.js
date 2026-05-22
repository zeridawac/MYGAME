const express = require('express');
const {
  listUsers,
  listUserActivity,
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
  getPlatformSettingsForAdmin,
  updateCoinConversion,
  updatePlatformSettingsForAdmin,
  getStorePopupSettings,
  updateStorePopupSettings,
  listGameConfigs,
  updateGameConfig,
  listActivity,
} = require('../controllers/adminController');
const {
  deleteAllPortalChatUploads,
  deletePortalChatUpload,
  listPortalChatUploads,
} = require('../controllers/adminUploadController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
const PORTAL_ADMIN_CODE = 'admin';

const normalizePortalCode = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const portalUploadAdminOnly = (req, res, next) => {
  const portalCode = normalizePortalCode(req.get('x-portal-code') || req.body?.code || req.query?.code);

  if (portalCode.toLowerCase() === PORTAL_ADMIN_CODE) {
    return next();
  }

  return protect(req, res, (error) => {
    if (error) {
      return next(error);
    }

    try {
      return adminOnly(req, res, next);
    } catch (adminError) {
      return next(adminError);
    }
  });
};

router.get('/uploads/portal-chat', portalUploadAdminOnly, listPortalChatUploads);
router.delete('/uploads/portal-chat/:filename', portalUploadAdminOnly, deletePortalChatUpload);
router.delete('/uploads/portal-chat', portalUploadAdminOnly, deleteAllPortalChatUploads);

router.use(protect, adminOnly);

router.get('/users', listUsers);
router.get('/user-activity', listUserActivity);
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
router.get('/settings/store-popup', getStorePopupSettings);
router.patch('/settings/store-popup', updateStorePopupSettings);
router.get('/settings/platform', getPlatformSettingsForAdmin);
router.patch('/settings/platform', updatePlatformSettingsForAdmin);

router.get('/game-configs', listGameConfigs);
router.patch('/game-configs/:gameKey', updateGameConfig);

router.get('/activity', listActivity);

module.exports = router;
