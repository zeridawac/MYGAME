const asyncHandler = require('../utils/asyncHandler');
const presentUser = require('../utils/userPresenter');

const getBankDetails = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    bankDetails: req.user.bankDetails || {},
  });
});

const saveBankDetails = asyncHandler(async (req, res) => {
  const bankName = String(req.body.bankName || '').trim();
  const fullName = String(req.body.fullName || '').trim();
  const accountNumber = String(req.body.accountNumber || '').trim();
  const phone = String(req.body.phone || '').trim();

  if (!bankName || !fullName || !accountNumber || !phone) {
    res.status(400);
    throw new Error('جميع معلومات البنك مطلوبة');
  }

  req.user.bankDetails = {
    bankName,
    fullName,
    accountNumber,
    phone,
  };
  await req.user.save();

  res.json({
    success: true,
    message: 'تم حفظ معلومات البنك',
    user: presentUser(req.user),
  });
});

module.exports = {
  getBankDetails,
  saveBankDetails,
};
