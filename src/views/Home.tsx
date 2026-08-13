import React from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { ButtonsRow } from '@/src/components/ButtonsRow';
import { SplitFlapText } from '@/src/components/SplitFlapText';
import { SquareButton } from '@/src/components/SquareButton';
import SplitModal, { type SplitDraft } from '@/src/components/SplitModal';
import { DECIMAL_SEPARATOR, THOUSAND_SEPARATOR } from '@/src/config';
import {
  saveRecord,
  saveSplits,
  getActiveAccountId,
  getAccountById,
  getAccountBalance,
  getAllCategories,
  type Account,
  type Category,
} from '@/src/db';

const formatMoney = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  const [intPart, decPart] = rounded.toFixed(2).split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSAND_SEPARATOR);
  return decPart === '00' ? withThousands : `${withThousands}${DECIMAL_SEPARATOR}${decPart}`;
};

const evaluateExpression = (expr: string): number => {
  const normalized = expr.replace(new RegExp(`\\${DECIMAL_SEPARATOR}`, 'g'), '.');
  const parts = normalized.split(/([+-])/);
  let result = 0;
  let sign = 1;
  for (const part of parts) {
    if (part === '+') {
      sign = 1;
    } else if (part === '-') {
      sign = -1;
    } else if (part !== '') {
      const value = parseFloat(part);
      if (!Number.isNaN(value)) {
        result += sign * value;
      }
    }
  }
  return result;
};

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [expression, setExpression] = React.useState('0');
  const [description, setDescription] = React.useState('');
  const [isEditing, setIsEditing] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [savedFlash, setSavedFlash] = React.useState(false);
  const [activeAccount, setActiveAccount] = React.useState<Account | null>(null);
  const [balance, setBalance] = React.useState(0);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = React.useState(false);
  const [splitModalVisible, setSplitModalVisible] = React.useState(false);
  const [splitDrafts, setSplitDrafts] = React.useState<SplitDraft[]>([]);

  const loadAccount = React.useCallback(async () => {
    const id = await getActiveAccountId(db);
    if (id !== null) {
      const acc = await getAccountById(db, id);
      setActiveAccount(acc);
      if (acc) {
        const bal = await getAccountBalance(db, acc.id);
        setBalance(bal);
      }
    }
  }, [db]);

  const loadCategories = React.useCallback(async () => {
    const cats = await getAllCategories(db);
    setCategories(cats);
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadAccount();
      loadCategories();
    }, [loadAccount, loadCategories])
  );

  const lastSign = Math.max(expression.lastIndexOf('+'), expression.lastIndexOf('-'));
  const amount = lastSign === -1 ? expression : expression.slice(lastSign + 1);
  const total = evaluateExpression(expression);

  const totalReveal = React.useRef(new Animated.Value(0)).current;
  const hasOperation = expression.includes('+') || expression.includes('-');

  React.useEffect(() => {
    Animated.timing(totalReveal, {
      toValue: hasOperation ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [hasOperation, totalReveal]);

  const handleDigitPress = (digit: string) => {
    setExpression((prev) => {
      const lastSign = Math.max(prev.lastIndexOf('+'), prev.lastIndexOf('-'));
      const current = lastSign === -1 ? prev : prev.slice(lastSign + 1);
      let newCurrent: string;
      if (digit === DECIMAL_SEPARATOR) {
        if (current.includes(DECIMAL_SEPARATOR)) {
          return prev;
        }
        newCurrent = current + DECIMAL_SEPARATOR;
      } else if (current === '0') {
        newCurrent = digit;
      } else {
        newCurrent = current + digit;
      }
      return (lastSign === -1 ? '' : prev.slice(0, lastSign + 1)) + newCurrent;
    });
  };

  const handleDelete = () => {
    setExpression((prev) => {
      if (prev.length <= 1) {
        return '0';
      }
      return prev.slice(0, -1);
    });
  };

  const handleReset = () => {
    setExpression('0');
    setDescription('');
  };

  const commitLine = (sign: 1 | -1) => {
    const value = parseFloat(amount.replace(DECIMAL_SEPARATOR, '.'));
    if (Number.isNaN(value) || value <= 0) {
      return;
    }
    setExpression((prev) => prev + (sign === 1 ? '+' : '-'));
  };

  const handleCheck = async () => {
    const finalTotal = evaluateExpression(expression);
    if (Math.abs(finalTotal) > 0 && activeAccount) {
      const label =
        description ||
        `Transacción ${new Date().toLocaleDateString('es-CL')}`;
      const recordId = await saveRecord(
        db,
        activeAccount.id,
        label,
        Math.abs(finalTotal),
        finalTotal > 0,
        selectedCategory?.id ?? null
      );
      if (splitDrafts.length > 0) {
        await saveSplits(db, recordId, splitDrafts);
      }
      await loadAccount();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    }

    setExpression('0');
    setDescription('');
    setIsEditing(false);
    setSplitDrafts([]);
  };

  const handleSplitSave = (splits: SplitDraft[]) => {
    setSplitDrafts(splits);
    setSplitModalVisible(false);
  };

  const handleRightPress = (label: string) => {
    if (label === '+') {
      commitLine(1);
    } else if (label === '-') {
      commitLine(-1);
    } else if (label === '✓') {
      handleCheck();
    } else if (label === '⌫') {
      handleDelete();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Link href="/account" asChild>
          <Pressable style={styles.accountButton}>
            <Text style={styles.accountNameText}>
              {activeAccount?.name ?? 'Cuenta'}
            </Text>
            <Text
              style={[
                styles.accountBalance,
                balance >= 0 ? styles.income : styles.expense,
              ]}
            >
              {savedFlash ? 'Guardado ✓' : `${balance >= 0 ? '+' : '-'}${formatMoney(Math.abs(balance))}`}
            </Text>
            <Text style={styles.accountSubtitle}>Ver transacciones</Text>
          </Pressable>
        </Link>
        <Pressable style={styles.infoButton} onPress={() => router.push('/accounts')}>
          <Text style={styles.infoText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.amountBox}>
        <Text style={styles.amountText}>${expression}</Text>
      </View>

      <Animated.View
        style={[
          styles.totalBox,
          {
            height: totalReveal.interpolate({ inputRange: [0, 1], outputRange: [0, 56] }),
            opacity: totalReveal,
            marginBottom: totalReveal.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }),
          },
        ]}
      >
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={[styles.totalText, total >= 0 ? styles.income : styles.expense]}>
          ${formatMoney(total)}
        </Text>
      </Animated.View>

      <View style={styles.descriptionBox}>
        {isEditing ? (
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Descripción del monto"
            placeholderTextColor="#666"
            autoFocus
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        ) : (
          <Pressable style={styles.descriptionPressable} onPress={() => setIsEditing(true)}>
            <SplitFlapText
              value={description || 'Descripción del monto'}
              textStyle={styles.descriptionText}
            />
          </Pressable>
        )}
      </View>

      <Pressable
        style={styles.categoryButton}
        onPress={() => setCategoryModalVisible(true)}
      >
        <View style={[styles.categoryDot, { backgroundColor: selectedCategory?.color ?? '#666' }]} />
        <Text style={styles.categoryButtonText} numberOfLines={1}>
          {selectedCategory?.name ?? 'Sin categoría'}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.categoryButton, splitDrafts.length > 0 && styles.splitButtonActive]}
        onPress={() => setSplitModalVisible(true)}
      >
        <Text style={styles.splitButtonText}>
          {splitDrafts.length > 0
            ? `Dividir pago (${splitDrafts.length})`
            : 'Dividir pago'}
        </Text>
      </Pressable>

      <View style={styles.keypad}>
        <ButtonsRow
          labels={['7', '8', '9']}
          onPressLabel={handleDigitPress}
          rightLabels={['+']}
          onPressRightLabel={handleRightPress}
        />
        <ButtonsRow
          labels={['4', '5', '6']}
          onPressLabel={handleDigitPress}
          rightLabels={['-']}
          onPressRightLabel={handleRightPress}
        />
        <ButtonsRow
          labels={['1', '2', '3']}
          onPressLabel={handleDigitPress}
          rightLabels={['✓']}
          onPressRightLabel={handleRightPress}
        />
        <ButtonsRow
          labels={['', '0', DECIMAL_SEPARATOR]}
          onPressLabel={handleDigitPress}
          rightLabels={['⌫']}
          onPressRightLabel={handleRightPress}
          disabledLabels={['']}
        />
      </View>

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Categoría</Text>
            <ScrollView style={styles.modalList}>
              <Pressable
                style={[
                  styles.categoryRow,
                  selectedCategory === null && styles.categoryRowSelected,
                ]}
                onPress={() => {
                  setSelectedCategory(null);
                  setCategoryModalVisible(false);
                }}
              >
                <View style={[styles.categoryDot, { backgroundColor: '#666' }]} />
                <Text style={styles.categoryRowText}>Sin categoría</Text>
              </Pressable>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryRow,
                    cat.parentCategoryId ? styles.categoryRowSub : null,
                    selectedCategory?.id === cat.id && styles.categoryRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setCategoryModalVisible(false);
                  }}
                >
                  <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.categoryRowText}>{cat.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setCategoryModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <SplitModal
        visible={splitModalVisible}
        onClose={() => setSplitModalVisible(false)}
        onSave={handleSplitSave}
        initialSplits={splitDrafts}
        totalAmount={Math.abs(total)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  accountButton: {
    flex: 1,
    minHeight: 84,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#151515',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginRight: 12,
  },
  accountNameText: {
    color: '#c9c9c9',
    fontSize: 16,
  },
  accountBalance: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 2,
  },
  accountSubtitle: {
    color: '#c9c9c9',
    fontSize: 16,
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#151515',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  amountBox: {
    width: '100%',
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  amountText: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '700',
  },
  totalBox: {
    width: '100%',
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e5c43',
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  totalLabel: {
    color: '#7ee2a8',
    fontSize: 13,
    fontWeight: '600',
    position: 'absolute',
    top: 6,
    left: 14,
  },
  totalText: {
    fontSize: 28,
    fontWeight: '700',
  },
  income: {
    color: '#7ee2a8',
  },
  expense: {
    color: '#e87e7e',
  },
  descriptionBox: {
    width: '100%',
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#111',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  descriptionPressable: {
    width: '100%',
    justifyContent: 'center',
  },
  descriptionInput: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    padding: 0,
  },
  descriptionText: {
    color: '#c9c9c9',
    fontSize: 18,
    fontWeight: '600',
  },
  categoryButton: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#111',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  categoryButtonText: {
    color: '#c9c9c9',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  splitButtonActive: {
    borderColor: '#2e5c43',
    backgroundColor: '#1d3a2a',
  },
  splitButtonText: {
    color: '#7ee2a8',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#151515',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalList: {
    maxHeight: '80%',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  categoryRowSub: {
    paddingLeft: 34,
  },
  categoryRowSelected: {
    backgroundColor: '#1d3a2a',
  },
  categoryRowText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  cancelButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
  },
  keypad: {
    marginTop: 'auto',
    width: '100%',
  },
});
