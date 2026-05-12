const asyncHandler = require('../utils/asyncHandler');
const presentUser = require('../utils/userPresenter');
const Withdrawal = require('../models/Withdrawal');

const hasCompleteBankDetails = (bankDetails = {}) => {
  return Boolean(
    bankDetails.bankName &&
      bankDetails.fullName &&
      bankDetails.accountNumber &&
      bankDetails.phone
  );
};

const listMyWithdrawals = asyncHandler(async (req, res) => {
  const withdrawals = await Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 });

  res.json({
    success: true,
    withdrawals,
  });
});

const createWithdrawal = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);
  const note = String(req.body.note || '').trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400);
    throw new Error('أدخل مبلغ سحب صحيح');
  }

  if (!hasCompleteBankDetails(req.user.bankDetails)) {
    res.status(400);
    throw new Error('يجب حفظ معلومات البنك قبل طلب السحب');
  }

  if (req.user.coins < amount) {
    res.status(400);
    throw new Error('رصيد العملات غير كاف لطلب السحب');
  }

  req.user.coins -= amount;
  await req.user.save();

  const withdrawal = await Withdrawal.create({
    user: req.user._id,
    amount,
    note,
    bankSnapshot: req.user.bankDetails,
  });

  res.status(201).json({
    success: true,
    message: 'تم إرسال طلب السحب',
    withdrawal,
    user: presentUser(req.user),
  });
});

module.exports = {
  listMyWithdrawals,
  createWithdrawal,
};
