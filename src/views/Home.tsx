import React from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { ButtonsRow } from '@/src/components/ButtonsRow';
import { SquareButton } from '@/src/components/SquareButton';
import SplitModal, { type SplitDraft } from '@/src/components/SplitModal';
import { Typewriter } from 'typewriter4react-native';
import { RollingMoney } from '@/src/components/RollingMoney';
import { DECIMAL_SEPARATOR, THOUSAND_SEPARATOR } from '@/src/config';
import {
  saveRecord,
  updateRecord,
  getRecordById,
  getSplitsByRecord,
  saveSplits,
  getActiveAccountId,
  getAccountById,
  getAccountBalance,
  getAllAccounts,
  setActiveAccountId,
  getAllCategories,
  type Account,
  type Category,
} from '@/src/db';

const CANCEL_LABEL = '✕';
const MAX_DESCRIPTION = 50;

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

export default function HomeScreen({ editRecordId }: { editRecordId?: number }) {
  const isEditMode = editRecordId !== undefined;
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

  const [accounts, setAccounts] = React.useState<Account[]>([]);

  const loadAccount = React.useCallback(async () => {
    setAccounts(await getAllAccounts(db));
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

  const slideY = React.useRef(new Animated.Value(0)).current;
  const slideOpacity = React.useRef(new Animated.Value(1)).current;
  const switching = React.useRef(false);

  const switchAccount = async (step: 1 | -1) => {
    if (accounts.length < 2 || switching.current) {
      return;
    }
    switching.current = true;
    const index = accounts.findIndex((a) => a.id === activeAccount?.id);
    const next = accounts[(index + step + accounts.length) % accounts.length];
    await new Promise<void>((resolve) =>
      Animated.parallel([
        Animated.timing(slideY, { toValue: -step * 10, duration: 90, useNativeDriver: true }),
        Animated.timing(slideOpacity, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]).start(() => resolve())
    );
    await setActiveAccountId(db, next.id);
    await loadAccount();
    slideY.setValue(step * 10);
    Animated.parallel([
      Animated.timing(slideY, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(slideOpacity, { toValue: 1, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      switching.current = false;
    });
  };
  const switchAccountRef = React.useRef(switchAccount);
  switchAccountRef.current = switchAccount;

  const accountSwipe = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !isEditMode && Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy <= -30) {
          switchAccountRef.current(1);
        } else if (g.dy >= 30) {
          switchAccountRef.current(-1);
        }
      },
    })
  ).current;

  const initialSplitsRef = React.useRef('[]');

  React.useEffect(() => {
    if (editRecordId === undefined) {
      return;
    }
    (async () => {
      const accountId = await getActiveAccountId(db);
      if (accountId === null) {
        router.back();
        return;
      }
      const row = await getRecordById(db, accountId, editRecordId);
      if (!row) {
        router.back();
        return;
      }
      const amountText = String(row.amount).replace('.', DECIMAL_SEPARATOR);
      setExpression(row.isIncome ? amountText : `0-${amountText}`);
      setDescription(row.label);
      const cats = await getAllCategories(db);
      setSelectedCategory(cats.find((c) => c.id === row.categoryId) ?? null);
      const drafts = (await getSplitsByRecord(db, row.id)).map((sp) => ({
        personId: sp.personId,
        amount: sp.amount,
      }));
      initialSplitsRef.current = JSON.stringify(drafts);
      setSplitDrafts(drafts);
    })();
  }, [db, editRecordId]);

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
    if (digit === CANCEL_LABEL) {
      router.back();
      return;
    }
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
    if (editRecordId !== undefined) {
      if (finalTotal === 0) {
        return;
      }
      await updateRecord(db, editRecordId, {
        label: description.trim() || `Transacción ${new Date().toLocaleDateString('es-CL')}`,
        amount: Math.abs(finalTotal),
        isIncome: finalTotal > 0,
        categoryId: selectedCategory?.id ?? null,
      });
      if (JSON.stringify(splitDrafts) !== initialSplitsRef.current) {
        await saveSplits(db, editRecordId, splitDrafts);
      }
      router.back();
      return;
    }
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
    setSelectedCategory(null);
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

  const finishDescription = () => {
    Keyboard.dismiss();
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.descriptionEditTitle}>Descripción</Text>
        <TextInput
          style={styles.descriptionEditInput}
          value={description}
          onChangeText={(text) => setDescription(text.replace(/\n/g, ' ').slice(0, MAX_DESCRIPTION))}
          placeholder="Descripción del monto"
          placeholderTextColor="#666"
          autoFocus
          multiline
          numberOfLines={2}
          maxLength={MAX_DESCRIPTION}
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={finishDescription}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <Text style={styles.descriptionCounter}>
          {description.length}/{MAX_DESCRIPTION}
        </Text>
        <Pressable style={styles.descriptionDone} onPress={finishDescription}>
          <Text style={styles.descriptionDoneText}>Listo</Text>
        </Pressable>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.accountSwipe} {...accountSwipe.panHandlers}>
        <Link href="/account" asChild>
          <Pressable
            style={StyleSheet.flatten([styles.accountButton, isEditMode && styles.accountButtonEdit])}
            disabled={isEditMode}
          >
            <Animated.View
              style={[
                styles.accountContent,
                { opacity: slideOpacity, transform: [{ translateY: slideY }] },
              ]}
            >
            <Text style={styles.accountNameText}>
              {activeAccount?.name ?? 'Cuenta'}
            </Text>
            {savedFlash ? (
              <Text style={[styles.accountBalance, styles.income]}>Guardado ✓</Text>
            ) : (
              <RollingMoney
                value={balance}
                text={`${balance >= 0 ? '+' : '-'}${formatMoney(Math.abs(balance))}`}
                textStyle={[
                  styles.accountBalance,
                  balance >= 0 ? styles.income : styles.expense,
                ]}
              />
            )}
            <Text style={styles.accountSubtitle}>
              {isEditMode ? 'Editando transacción' : 'Ver transacciones'}
            </Text>
            </Animated.View>
          </Pressable>
        </Link>
        </View>
        {isEditMode ? null : (
          <Pressable style={styles.infoButton} onPress={() => router.push('/accounts')}>
            <Text style={styles.infoText}>+</Text>
          </Pressable>
        )}
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
        <RollingMoney
          value={total}
          text={`$${formatMoney(total)}`}
          textStyle={[styles.totalText, total >= 0 ? styles.income : styles.expense]}
        />
      </Animated.View>

      <View style={styles.descriptionBox}>
        <Pressable style={styles.descriptionPressable} onPress={() => setIsEditing(true)}>
          <Typewriter
            key={description || 'Descripción del monto'}
            text={description || 'Descripción del monto'}
            speed="fastest"
            typingDelayPerCharVariance={0}
            hideCursorOnFinish={false}
            cursorType="text_simple"
            cursorStyle={{ color: '#7ee2a8', fontSize: 16, fontWeight: '600' }}
            textStyle={styles.descriptionText}
            containerStyle={styles.descriptionTypewriter}
          />
        </Pressable>
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
          labels={[isEditMode ? CANCEL_LABEL : '', '0', DECIMAL_SEPARATOR]}
          onPressLabel={handleDigitPress}
          rightLabels={['⌫']}
          onPressRightLabel={handleRightPress}
          disabledLabels={isEditMode ? [] : ['']}
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
  accountSwipe: {
    flex: 1,
  },
  accountButtonEdit: {
    marginRight: 0,
  },
  accountContent: {
    alignItems: 'center',
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
  descriptionEditTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  descriptionEditInput: {
    width: '100%',
    minHeight: 90,
    maxHeight: 120,
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  descriptionCounter: {
    color: '#666',
    fontSize: 13,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 16,
  },
  descriptionDone: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#2e5c43',
    alignItems: 'center',
    paddingVertical: 14,
  },
  descriptionDoneText: {
    color: '#7ee2a8',
    fontSize: 16,
    fontWeight: '700',
  },
  descriptionTypewriter: {
    width: '100%',
  },
  typewriterPreviewBox: {
    width: '100%',
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  typewriterPreview: {
    color: '#c9c9c9',
    fontSize: 18,
    fontWeight: '600',
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
