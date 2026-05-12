import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { G, Path } from 'react-native-svg';
import { Box, CalendarCheck, Gift, History, RotateCw, Sparkles, Ticket, X } from 'lucide-react-native';
import AppScreen from '../components/AppScreen';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import GradientButton from '../components/GradientButton';
import Header from '../components/Header';
import LoadingState from '../components/LoadingState';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors } from '../theme/colors';
import { formatDate } from '../utils/format';

const wheelColors = ['#3ee2c5', '#f7c948', '#ff6b8a', '#70a7ff', '#57d68d', '#f5f7fb'];
const wheelLabels = ['عملات', 'نقاط', 'XP', 'حظ', 'ذهب', 'نمو'];

const polar = (cx, cy, r, angle) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const sectorPath = (start, end) => {
  const startPoint = polar(150, 150, 140, end);
  const endPoint = polar(150, 150, 140, start);
  const largeArc = end - start <= 180 ? 0 : 1;
  return `M 150 150 L ${startPoint.x} ${startPoint.y} A 140 140 0 ${largeArc} 0 ${endPoint.x} ${endPoint.y} Z`;
};

const SpinWheel = ({ spinning }) => {
  const rotate = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const size = Math.min(260, Math.max(220, width * 0.72));

  React.useEffect(() => {
    if (!spinning) return;

    rotate.setValue(0);
    Animated.timing(rotate, {
      toValue: 1,
      duration: 1050,
      useNativeDriver: true
    }).start();
  }, [rotate, spinning]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1440deg']
  });

  return (
    <View style={[styles.wheelWrap, { width: size, height: size + 22 }]}>
      <View style={styles.pointer} />
      <Animated.View style={[styles.wheel, { width: size, height: size, transform: [{ rotate: spin }] }]}>
        <Svg width={size} height={size} viewBox="0 0 300 300">
          <G>
            {wheelColors.map((color, index) => (
              <Path key={color} d={sectorPath(index * 60, (index + 1) * 60)} fill={color} />
            ))}
          </G>
        </Svg>
        <View style={styles.wheelCenter} />
      </Animated.View>
      {wheelLabels.map((label, index) => {
        const angle = (index * 60 + 30 - 90) * (Math.PI / 180);
        const radius = size * 0.34;
        return (
          <Text
            key={label}
            style={[
              styles.wheelLabel,
              {
                left: size / 2 + Math.cos(angle) * radius - 28,
                top: size / 2 + Math.sin(angle) * radius - 10
              }
            ]}
          >
            {label}
          </Text>
        );
      })}
    </View>
  );
};

const GamesScreen = () => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [busyGame, setBusyGame] = useState(null);
  const [result, setResult] = useState(null);
  const { updateUser } = useAuth();
  const { showToast } = useToast();

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [historyResponse, summaryResponse] = await Promise.all([
        api.get('/games/history'),
        api.get('/games/summary')
      ]);
      setHistory(historyResponse.data.history);
      setSummary(summaryResponse.data.games);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const getRemaining = (key) => summary.find((item) => item.gameKey === key)?.remainingPlays ?? 0;

  const finishPlay = async (data) => {
    setResult(data.reward);
    updateUser(data.user);
    setHistory((current) => [data.history, ...current].slice(0, 30));
    showToast(data.message, 'success');
    const { data: summaryData } = await api.get('/games/summary');
    setSummary(summaryData.games);
  };

  const spin = async () => {
    setSpinning(true);
    setResult(null);
    try {
      const { data } = await api.post('/games/spin');
      setTimeout(async () => {
        try {
          await finishPlay(data);
        } finally {
          setSpinning(false);
        }
      }, 1100);
    } catch (error) {
      setSpinning(false);
      showToast(error.message, 'error');
    }
  };

  const playMiniGame = async (gameKey, endpoint, payload = {}) => {
    setBusyGame(gameKey);
    setResult(null);
    try {
      const { data } = await api.post(endpoint, payload);
      await finishPlay(data);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusyGame(null);
    }
  };

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <LoadingState />
      </AppScreen>
    );
  }

  return (
    <AppScreen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header eyebrow="الألعاب" title="مركز المكافآت اليومية" subtitle="ألعاب أصلية مهيأة لشاشة أندرويد، بدون WebView." />

      <Card style={styles.spinCard}>
        <View style={styles.cardHeading}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>Spin Wheel</Text>
            <Text style={styles.cardTitle}>عجلة الحظ اليومية</Text>
          </View>
          <View style={styles.pill}>
            <Gift color={colors.gold} size={17} />
            <Text style={styles.pillText}>{getRemaining('spin')} متبقية</Text>
          </View>
        </View>

        <View style={styles.wheelZone}>
          <SpinWheel spinning={spinning} />
          <GradientButton title={spinning ? 'تدور...' : 'ابدأ الدوران'} icon={RotateCw} onPress={spin} disabled={spinning} />
        </View>
      </Card>

      <View style={styles.gameGrid}>
        <Card style={[styles.gameCard, styles.scratchCard]}>
          <Ticket color={colors.gold} size={28} />
          <Text style={styles.cardTitle}>بطاقة الحظ</Text>
          <Text style={styles.gameText}>اكشف بطاقة سريعة واربح مكافأة عشوائية.</Text>
          <Text style={styles.remaining}>{getRemaining('scratch')} محاولات</Text>
          <GradientButton
            title={busyGame === 'scratch' ? 'جاري الكشف...' : 'اكشف البطاقة'}
            icon={Sparkles}
            loading={busyGame === 'scratch'}
            onPress={() => playMiniGame('scratch', '/games/scratch')}
          />
        </Card>

        <Card style={styles.gameCard}>
          <Box color={colors.cyan} size={28} />
          <Text style={styles.cardTitle}>صندوق الحظ</Text>
          <Text style={styles.gameText}>اختر صندوقا واحصل على جائزة مخفية.</Text>
          <Text style={styles.remaining}>{getRemaining('luckyBox')} محاولات</Text>
          <View style={styles.boxRow}>
            {[1, 2, 3].map((box) => (
              <Pressable
                key={box}
                style={({ pressed }) => [styles.boxButton, pressed && styles.pressed]}
                disabled={busyGame === 'luckyBox'}
                onPress={() => playMiniGame('luckyBox', '/games/lucky-box', { selectedBox: box })}
              >
                <Box color={colors.text} size={21} />
                <Text style={styles.boxText}>{box}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={[styles.gameCard, styles.dailyCard]}>
          <CalendarCheck color={colors.green} size={28} />
          <Text style={styles.cardTitle}>المكافأة اليومية</Text>
          <Text style={styles.gameText}>استلم هدية يومية ثابتة مرة واحدة كل يوم.</Text>
          <Text style={styles.remaining}>{getRemaining('dailyReward')} متاحة</Text>
          <GradientButton
            title={busyGame === 'dailyReward' ? 'جاري الاستلام...' : 'استلام اليومية'}
            icon={Gift}
            variant="ghost"
            loading={busyGame === 'dailyReward'}
            onPress={() => playMiniGame('dailyReward', '/games/daily-reward')}
          />
        </Card>
      </View>

      <Card>
        <View style={styles.cardHeading}>
          <Text style={styles.cardTitle}>آخر المكافآت</Text>
          <History color={colors.muted} size={20} />
        </View>
        {history.length ? (
          <View style={styles.historyList}>
            {history.map((item) => (
              <View key={item._id} style={styles.historyItem}>
                <View style={styles.historyCopy}>
                  <Text style={styles.itemTitle}>{item.label}</Text>
                  <Text style={styles.itemText}>{item.gameName || 'لعبة'} - {formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.rewardText}>+{item.coins} / +{item.points}</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="لا يوجد سجل بعد" text="ابدأ أول لعبة لتسجيل المكافآت." />
        )}
      </Card>

      <Modal visible={Boolean(result)} transparent animationType="fade" onRequestClose={() => setResult(null)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.resultModal}>
            <Pressable style={styles.closeButton} onPress={() => setResult(null)}>
              <X color={colors.text} size={18} />
            </Pressable>
            <Sparkles color={colors.gold} size={34} />
            <Text style={styles.resultTitle}>{result?.label}</Text>
            <Text style={styles.resultText}>
              +{result?.coins} عملة، +{result?.points} نقطة، +{result?.xp} XP
            </Text>
          </Card>
        </View>
      </Modal>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  spinCard: {
    overflow: 'hidden'
  },
  cardHeading: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  headingCopy: {
    flex: 1
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right'
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  pill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(247,201,72,0.12)'
  },
  pillText: {
    color: colors.gold,
    fontWeight: '900',
    writingDirection: 'rtl'
  },
  wheelZone: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 18
  },
  wheelWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 26,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.gold,
    zIndex: 3,
    marginBottom: -15
  },
  wheel: {
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  wheelCenter: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 7,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  wheelLabel: {
    position: 'absolute',
    color: colors.black,
    fontWeight: '900',
    width: 56,
    textAlign: 'center',
    fontSize: 12
  },
  gameGrid: {
    gap: 12
  },
  gameCard: {
    alignItems: 'stretch',
    gap: 9
  },
  scratchCard: {
    backgroundColor: '#171920'
  },
  dailyCard: {
    backgroundColor: '#101f1a'
  },
  gameText: {
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  remaining: {
    color: colors.gold,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl'
  },
  boxRow: {
    flexDirection: 'row-reverse',
    gap: 9
  },
  boxButton: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.07)'
  },
  boxText: {
    color: colors.text,
    fontWeight: '900'
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }]
  },
  historyList: {
    marginTop: 12,
    gap: 9
  },
  historyItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.045)'
  },
  historyCopy: {
    flex: 1,
    gap: 3
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  itemText: {
    color: colors.muted,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  rewardText: {
    color: colors.green,
    fontWeight: '900'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  resultModal: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  resultTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl'
  },
  resultText: {
    color: colors.muted,
    textAlign: 'center',
    writingDirection: 'rtl'
  }
});

export default GamesScreen;
