import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react-native';
import AppScreen from '../components/AppScreen';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import GradientButton from '../components/GradientButton';
import Header from '../components/Header';
import InputField from '../components/InputField';
import LoadingState from '../components/LoadingState';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors } from '../theme/colors';
import { formatNumber } from '../utils/format';

const InvestmentsScreen = () => {
  const [assets, setAssets] = useState([]);
  const [portfolio, setPortfolio] = useState({ positions: [], totalValue: 0 });
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, portfolioRes] = await Promise.all([
        api.get('/investments/assets'),
        api.get('/investments/portfolio')
      ]);
      setAssets(assetsRes.data.assets);
      setPortfolio(portfolioRes.data);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const trade = async (type, assetId) => {
    setBusy(true);
    try {
      const quantity = Number(quantities[assetId] || 1);
      const { data } = await api.post(`/investments/${type}`, { assetId, quantity });
      updateUser(data.user);
      showToast(data.message, 'success');
      await load();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
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
    <AppScreen>
      <Header
        eyebrow="السوق الافتراضي"
        title="الاستثمارات"
        subtitle="شراء وبيع أصول محلية محاكية باستخدام رصيد العملات."
        right={<Pressable style={styles.refresh} onPress={load}><RefreshCw color={colors.text} size={18} /></Pressable>}
      />

      <Card style={styles.totalCard}>
        <Text style={styles.meta}>قيمة المحفظة الحالية</Text>
        <Text style={styles.total}>{formatNumber(portfolio.totalValue)} عملة</Text>
        <Text style={styles.meta}>رصيدك المتاح: {formatNumber(user?.coins)} عملة</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>محفظتي</Text>
        {portfolio.positions?.length ? (
          <View style={styles.list}>
            {portfolio.positions.map((position) => (
              <View key={position.asset._id} style={styles.positionItem}>
                <View style={styles.positionCopy}>
                  <Text style={styles.itemTitle}>{position.asset.nameAr}</Text>
                  <Text style={styles.itemText}>{position.quantity} وحدات - متوسط {position.averageBuyPrice}</Text>
                  <Text style={position.profitLoss >= 0 ? styles.positive : styles.negative}>
                    {position.profitLoss >= 0 ? '+' : ''}{position.profitLoss} عملة
                  </Text>
                </View>
                <View style={styles.tradeBox}>
                  <InputField
                    label="كمية"
                    value={String(quantities[position.asset._id] || 1)}
                    keyboardType="numeric"
                    onChangeText={(value) => setQuantities({ ...quantities, [position.asset._id]: value })}
                  />
                  <GradientButton title="بيع" icon={ArrowDownCircle} variant="danger" disabled={busy} onPress={() => trade('sell', position.asset._id)} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="محفظتك فارغة" text="اشتر أول أصل لتظهر المحفظة هنا." />
        )}
      </Card>

      <View style={styles.assetList}>
        {assets.map((asset) => (
          <Card key={asset._id} style={styles.assetCard}>
            <View style={styles.assetTop}>
              <View style={styles.symbol}>
                <Text style={styles.symbolText}>{asset.symbol}</Text>
              </View>
              <Text style={asset.changePercent >= 0 ? styles.positive : styles.negative}>
                {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent}%
              </Text>
            </View>
            <Text style={styles.itemTitle}>{asset.nameAr}</Text>
            <Text style={styles.itemText}>{asset.description}</Text>
            <Text style={styles.price}>{asset.price} عملة</Text>
            <InputField
              label="كمية الشراء"
              value={String(quantities[asset._id] || 1)}
              keyboardType="numeric"
              onChangeText={(value) => setQuantities({ ...quantities, [asset._id]: value })}
            />
            <GradientButton title="شراء" icon={ArrowUpCircle} disabled={busy} onPress={() => trade('buy', asset._id)} />
          </Card>
        ))}
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  refresh: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.border
  },
  totalCard: {
    gap: 4,
    backgroundColor: '#102019'
  },
  meta: {
    color: colors.muted,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  total: {
    color: colors.green,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'right',
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
    gap: 12
  },
  positionItem: {
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.045)'
  },
  positionCopy: {
    gap: 4
  },
  tradeBox: {
    gap: 10
  },
  assetList: {
    gap: 12
  },
  assetCard: {
    gap: 10
  },
  assetTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  symbol: {
    minWidth: 58,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green
  },
  symbolText: {
    color: colors.black,
    fontWeight: '900'
  },
  itemTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  itemText: {
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  price: {
    color: colors.gold,
    fontWeight: '900',
    fontSize: 18,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  positive: {
    color: colors.green,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  negative: {
    color: colors.danger,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  }
});

export default InvestmentsScreen;
