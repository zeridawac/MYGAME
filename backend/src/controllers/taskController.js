const asyncHandler = require('../utils/asyncHandler');
const Task = require('../models/Task');
const TaskSubmission = require('../models/TaskSubmission');

const listTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ active: true }).sort({ createdAt: -1 });
  const submissions = await TaskSubmission.find({ user: req.user._id })
    .populate('task', 'title')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    tasks,
    submissions,
  });
});

const submitTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, active: true });
  const proofText = String(req.body.proofText || '').trim();
  const proofImage = String(req.body.proofImage || '').trim();

  if (!task) {
    res.status(404);
    throw new Error('المهمة غير موجودة');
  }

  if (!proofText) {
    res.status(400);
    throw new Error('اكتب رسالة إثبات قبل الإرسال');
  }

  if (proofImage && proofImage.length > 1600000) {
    res.status(400);
    throw new Error('حجم صورة الإثبات كبير جدا');
  }

  const existingPending = await TaskSubmission.findOne({
    user: req.user._id,
    task: task._id,
    status: 'pending',
  });

  if (existingPending) {
    res.status(400);
    throw new Error('لديك إرسال قيد المراجعة لهذه المهمة');
  }

  const submission = await TaskSubmission.create({
    user: req.user._id,
    task: task._id,
    proofText,
    proofImage,
    rewardCoins: task.rewardCoins,
    rewardPoints: task.rewardPoints,
  });

  await submission.populate('task', 'title');

  res.status(201).json({
    success: true,
    message: 'تم إرسال المهمة للمراجعة',
    submission,
  });
});

module.exports = {
  listTasks,
  submitTask,
};
