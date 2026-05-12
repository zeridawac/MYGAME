import React, { useCallback, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ClipboardCheck, ExternalLink, ImagePlus, SendHorizontal } from 'lucide-react-native';
import AppScreen from '../components/AppScreen';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import GradientButton from '../components/GradientButton';
import Header from '../components/Header';
import InputField from '../components/InputField';
import LoadingState from '../components/LoadingState';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { colors } from '../theme/colors';
import { formatDate } from '../utils/format';

const TasksScreen = () => {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyTask, setBusyTask] = useState(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks');
      setTasks(data.tasks);
      setSubmissions(data.submissions);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setForm = (taskId, patch) => {
    setForms((current) => ({
      ...current,
      [taskId]: {
        proofText: '',
        proofImage: '',
        ...current[taskId],
        ...patch
      }
    }));
  };

  const pickImage = async (taskId) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('يجب السماح باختيار الصورة أولا', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.45,
      base64: true
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      const asset = result.assets[0];
      setForm(taskId, { proofImage: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` });
    }
  };

  const submitTask = async (taskId) => {
    setBusyTask(taskId);
    try {
      const { data } = await api.post(`/tasks/${taskId}/submit`, forms[taskId] || {});
      setSubmissions((current) => [data.submission, ...current]);
      setForm(taskId, { proofText: '', proofImage: '' });
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusyTask(null);
    }
  };

  if (loading) return <AppScreen scroll={false}><LoadingState /></AppScreen>;

  return (
    <AppScreen>
      <Header eyebrow="ربح النقاط عبر المهام" title="المهام" subtitle="أنجز مهمة، أرسل إثباتك، وانتظر مراجعة الإدارة." />

      {tasks.length ? (
        <View style={styles.taskList}>
          {tasks.map((task) => (
            <Card key={task._id} style={styles.taskCard}>
              <ClipboardCheck color={colors.cyan} size={25} />
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskText}>{task.description}</Text>
              <Text style={styles.reward}>+{task.rewardCoins} عملة / +{task.rewardPoints} نقطة</Text>

              {task.link ? (
                <GradientButton title="فتح الرابط" icon={ExternalLink} variant="ghost" onPress={() => Linking.openURL(task.link)} />
              ) : null}

              <InputField
                label="رسالة الإثبات"
                multiline
                value={forms[task._id]?.proofText || ''}
                onChangeText={(proofText) => setForm(task._id, { proofText })}
              />

              {forms[task._id]?.proofImage ? <Image source={{ uri: forms[task._id].proofImage }} style={styles.preview} /> : null}
              <Pressable style={styles.upload} onPress={() => pickImage(task._id)}>
                <ImagePlus color={colors.cyan} size={19} />
                <Text style={styles.uploadText}>{forms[task._id]?.proofImage ? 'تغيير الصورة' : 'صورة اختيارية'}</Text>
              </Pressable>

              <GradientButton
                title="إرسال للمراجعة"
                icon={SendHorizontal}
                loading={busyTask === task._id}
                onPress={() => submitTask(task._id)}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="لا توجد مهام نشطة" text="ستظهر المهام التي ينشرها المدير هنا." />
      )}

      <Card>
        <Text style={styles.sectionTitle}>إرسالاتي</Text>
        {submissions.length ? (
          <View style={styles.list}>
            {submissions.map((item) => (
              <View key={item._id} style={styles.item}>
                <View style={styles.copy}>
                  <Text style={styles.itemTitle}>{item.task?.title || 'مهمة'}</Text>
                  <Text style={styles.itemText}>{formatDate(item.createdAt)}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="لا توجد إرسالات" text="بعد إرسال إثبات مهمة سيظهر هنا." />
        )}
      </Card>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  taskList: {
    gap: 12
  },
  taskCard: {
    gap: 10
  },
  taskTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  taskText: {
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  reward: {
    color: colors.gold,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  upload: {
    minHeight: 46,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(62,226,197,0.32)',
    backgroundColor: 'rgba(62,226,197,0.07)'
  },
  uploadText: {
    color: colors.cyan,
    fontWeight: '900',
    writingDirection: 'rtl'
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12
  },
  list: {
    gap: 10
  },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.045)'
  },
  copy: {
    flex: 1
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  itemText: {
    color: colors.muted,
    textAlign: 'right'
  }
});

export default TasksScreen;
