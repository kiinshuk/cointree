import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  addDoc, 
  doc, 
  updateDoc,
  onSnapshot,
  getDocs 
} from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { calculateGroupBalances } from '../utils/balanceCalculator';

const GroupDetailScreen = ({ route, navigation }) => {
  const { groupId } = route.params;
  const { userProfile } = useContext(AuthContext);
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [balanceDetailVisible, setBalanceDetailVisible] = useState(false);
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [splitType, setSplitType] = useState('equal');
  const [customSplits, setCustomSplits] = useState({});
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const groupUnsubscribe = onSnapshot(doc(db, 'groups', groupId), (docSnap) => {
      if (docSnap.exists()) {
        setGroup({ id: docSnap.id, ...docSnap.data() });
      }
    });

    const q = query(
      collection(db, 'expenses'),
      where('groupId', '==', groupId)
    );
    
    const expensesUnsubscribe = onSnapshot(q, (snapshot) => {
      const expensesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setExpenses(expensesList);
      
      if (group) {
        const calculatedBalances = calculateGroupBalances(expensesList, group.memberIds || []);
        setBalances(calculatedBalances);
      }
      setLoading(false);
    });

    return () => {
      groupUnsubscribe();
      expensesUnsubscribe();
    };
  }, [groupId]);

  useEffect(() => {
    if (group && expenses.length > 0) {
      const calculatedBalances = calculateGroupBalances(expenses, group.memberIds || []);
      setBalances(calculatedBalances);
    } else if (group) {
      setBalances(calculateGroupBalances([], group.memberIds || []));
    }
  }, [group, expenses]);

  const handleAddExpense = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (splitType === 'custom') {
      const totalCustom = Object.values(customSplits).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      if (Math.abs(totalCustom - amountNum) > 0.01) {
        Alert.alert('Error', 'Custom split total must equal the expense amount');
        return;
      }
    }

    setSaving(true);
    try {
      let splits;
      
      if (splitType === 'equal') {
        const splitAmount = amountNum / (group.members?.length || 1);
        splits = (group.members || []).map(m => ({
          uid: m.uid,
          name: m.name,
          amount: splitAmount
        }));
      } else {
        splits = Object.entries(customSplits).map(([uid, amt]) => {
          const member = (group.members || []).find(m => m.uid === uid);
          return {
            uid,
            name: member?.name || 'Unknown',
            amount: parseFloat(amt) || 0
          };
        }).filter(s => s.amount > 0);
      }
      
      const expenseData = {
        groupId,
        description: description.trim(),
        amount: amountNum,
        paidBy: userProfile.uid,
        paidByName: userProfile.name,
        splitType,
        splits,
        createdAt: editingExpense ? editingExpense.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id), expenseData);
      } else {
        await addDoc(collection(db, 'expenses'), expenseData);
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save expense');
    }
    setSaving(false);
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setEditingExpense(null);
    setSplitType('equal');
    setCustomSplits({});
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setSplitType(expense.splitType || 'equal');
    
    if (expense.splitType === 'custom') {
      const splitsObj = {};
      expense.splits?.forEach(s => {
        splitsObj[s.uid] = s.amount.toString();
      });
      setCustomSplits(splitsObj);
    } else {
      setCustomSplits({});
    }
    setModalVisible(true);
  };

  const openAddExpense = () => {
    resetForm();
    setModalVisible(true);
  };

  const searchUserByEmail = async () => {
    if (!searchEmail.trim()) {
      Alert.alert('Error', 'Please enter an email');
      return;
    }

    setSearching(true);
    setSearchResult(null);

    try {
      const q = query(collection(db, 'users'), where('email', '==', searchEmail.trim().toLowerCase()));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        Alert.alert('Not Found', 'No user found with this email');
      } else {
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        
        const isAlreadyMember = group?.members?.some(m => m.uid === userData.uid);
        if (isAlreadyMember) {
          Alert.alert('Already in group', 'This user is already a member');
        } else if (userData.uid === userProfile?.uid) {
          Alert.alert('Error', "You can't add yourself");
        } else {
          setSearchResult(userData);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search user');
    }
    setSearching(false);
  };

  const addMemberToGroup = async () => {
    if (!searchResult) return;

    setSaving(true);
    try {
      const newMember = {
        uid: searchResult.uid,
        name: searchResult.name,
        email: searchResult.email
      };

      const updatedMembers = [...(group.members || []), newMember];
      const updatedMemberIds = [...(group.memberIds || []), searchResult.uid];

      await updateDoc(doc(db, 'groups', groupId), {
        members: updatedMembers,
        memberIds: updatedMemberIds
      });

      Alert.alert('Success', `${searchResult.name} added to the group!`);
      setAddMemberModalVisible(false);
      setSearchEmail('');
      setSearchResult(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to add member');
    }
    setSaving(false);
  };

  const handleSettleUp = async (otherMember, settleAmount) => {
    setSaving(true);
    try {
      await addDoc(collection(db, 'expenses'), {
        groupId,
        description: `Settled with ${otherMember.name}`,
        amount: settleAmount,
        paidBy: userProfile.uid,
        paidByName: userProfile.name,
        splitType: 'settlement',
        splits: [{
          uid: otherMember.uid,
          amount: settleAmount
        }],
        isSettlement: true,
        settledWith: otherMember.uid,
        createdAt: new Date().toISOString()
      });

      setSettleModalVisible(false);
      Alert.alert('Settled!', `You settled ₹${settleAmount.toFixed(0)} with ${otherMember.name}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to record settlement');
    }
    setSaving(false);
  };

  const getSettleOptions = () => {
    const yourBalance = getYourBalance();
    if (yourBalance >= 0) return [];

    const options = [];
    balances.forEach(b => {
      if (b.uid !== userProfile?.uid && b.balance > 0) {
        options.push({
          member: group.members.find(m => m.uid === b.uid),
          amount: Math.min(b.balance, Math.abs(yourBalance))
        });
      }
    });
    return options;
  };

  const getYourBalance = () => {
    const yourBalance = balances.find(b => b.uid === userProfile?.uid);
    if (!yourBalance) return 0;
    return yourBalance.balance;
  };

  const yourBalance = getYourBalance();

  const renderExpense = ({ item }) => (
    <TouchableOpacity 
      style={styles.expenseCard}
      onPress={() => handleEditExpense(item)}
    >
      <View style={styles.expenseLeft}>
        <Text style={styles.expenseDesc}>{item.description}</Text>
        <Text style={styles.expenseMeta}>
          {item.paidByName} • {item.splitType === 'equal' ? 'Equal' : 'Custom'}
        </Text>
      </View>
      <Text style={styles.expenseAmount}>₹{item.amount.toFixed(0)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.groupName}>{group?.name || 'Loading...'}</Text>
          <Text style={styles.memberCount}>{group?.members?.length || 0} members</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={openAddExpense}
          >
            <Text style={styles.iconButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setAddMemberModalVisible(true)}
          >
            <Text style={styles.iconButtonText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.balanceCard}
        onPress={() => setBalanceDetailVisible(true)}
      >
        <Text style={styles.balanceLabel}>Your Balance</Text>
        <Text style={[
          styles.balanceAmount,
          yourBalance >= 0 ? styles.positive : styles.negative
        ]}>
          {yourBalance >= 0 ? `You are owed ₹${Math.abs(yourBalance).toFixed(0)}` : `You owe ₹${Math.abs(yourBalance).toFixed(0)}`}
        </Text>
        {yourBalance === 0 ? (
          <Text style={styles.settledText}>All settled up! 🎉</Text>
        ) : yourBalance < 0 ? (
          <TouchableOpacity
            style={styles.settleButton}
            onPress={() => setSettleModalVisible(true)}
          >
            <Text style={styles.settleButtonText}>Settle Up</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      <View style={styles.expensesSection}>
        <Text style={styles.sectionTitle}>Expenses</Text>
        {expenses.length === 0 ? (
          <View style={styles.emptyExpenses}>
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first expense</Text>
          </View>
        ) : (
          <FlatList
            data={expenses}
            renderItem={renderExpense}
            keyExtractor={item => item.id}
            style={styles.expenseList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView style={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </Text>
              
              <TextInput
                style={styles.input}
                placeholder="What was it for?"
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Total Amount (₹)"
                placeholderTextColor="#999"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />

              <Text style={styles.splitLabel}>Split Type:</Text>
              <View style={styles.splitButtons}>
                <TouchableOpacity
                  style={[styles.splitButton, splitType === 'equal' && styles.splitButtonActive]}
                  onPress={() => setSplitType('equal')}
                >
                  <Text style={[styles.splitButtonText, splitType === 'equal' && styles.splitButtonTextActive]}>
                    Equal
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.splitButton, splitType === 'custom' && styles.splitButtonActive]}
                  onPress={() => setSplitType('custom')}
                >
                  <Text style={[styles.splitButtonText, splitType === 'custom' && styles.splitButtonTextActive]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {splitType === 'custom' && group?.members && (
                <View style={styles.customSplits}>
                  <Text style={styles.customSplitTitle}>Who paid what:</Text>
                  {group.members.map(member => (
                    <View key={member.uid} style={styles.customSplitRow}>
                      <Text style={styles.customSplitName}>{member.name}</Text>
                      <TextInput
                        style={styles.customSplitInput}
                        placeholder="₹0"
                        placeholderTextColor="#999"
                        value={customSplits[member.uid] || ''}
                        onChangeText={(text) => setCustomSplits({...customSplits, [member.uid]: text})}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveDisabled]}
                  onPress={handleAddExpense}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>
                    {saving ? 'Saving...' : editingExpense ? 'Update' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={settleModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settle Up</Text>
            <Text style={styles.settleSubtitle}>Who do you want to pay?</Text>
            
            {getSettleOptions().map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.settleOption}
                onPress={() => handleSettleUp(option.member, option.amount)}
                disabled={saving}
              >
                <View style={styles.settleMemberInfo}>
                  <View style={styles.settleAvatar}>
                    <Text style={styles.settleAvatarText}>
                      {option.member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.settleMemberName}>{option.member.name}</Text>
                </View>
                <Text style={styles.settleAmount}>₹{option.amount.toFixed(0)}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setSettleModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addMemberModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddMemberModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Member</Text>
            <Text style={styles.modalSubtitle}>Search user by email</Text>
            
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Enter email"
                placeholderTextColor="#999"
                value={searchEmail}
                onChangeText={setSearchEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={[styles.searchButton, searching && styles.searchButtonDisabled]}
                onPress={searchUserByEmail}
                disabled={searching}
              >
                <Text style={styles.searchButtonText}>
                  {searching ? '...' : 'Search'}
                </Text>
              </TouchableOpacity>
            </View>

            {searchResult && (
              <View style={styles.searchResult}>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{searchResult.name}</Text>
                  <Text style={styles.resultEmail}>{searchResult.email}</Text>
                </View>
                <TouchableOpacity
                  style={styles.addButtonSmall}
                  onPress={addMemberToGroup}
                  disabled={saving}
                >
                  <Text style={styles.addButtonSmallText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setAddMemberModalVisible(false);
                setSearchEmail('');
                setSearchResult(null);
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={balanceDetailVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBalanceDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Balance Details</Text>
            
            {group?.members?.map(member => {
              const memberBalance = balances.find(b => b.uid === member.uid);
              const balance = memberBalance?.balance || 0;
              const isMe = member.uid === userProfile?.uid;
              
              return (
                <View key={member.uid} style={styles.balanceDetailRow}>
                  <View style={styles.balanceDetailInfo}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.memberName}>
                        {member.name} {isMe ? '(You)' : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={[
                    styles.memberBalance,
                    balance > 0 ? styles.owesPositive : balance < 0 ? styles.owesNegative : styles.owesNeutral
                  ]}>
                    {balance > 0 ? `gets ₹${balance.toFixed(0)}` : 
                     balance < 0 ? `owes ₹${Math.abs(balance).toFixed(0)}` : 
                     'settled'}
                  </Text>
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setBalanceDetailVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 20,
    color: '#333',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  groupName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  memberCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: {
    fontSize: 18,
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#f44336',
  },
  settledText: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 8,
    fontWeight: '500',
  },
  settleButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  settleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  expensesSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  expenseList: {
    flex: 1,
  },
  expenseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  expenseLeft: {
    flex: 1,
  },
  expenseDesc: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  expenseMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  emptyExpenses: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalScroll: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 24,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  splitLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  splitButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  splitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  splitButtonActive: {
    backgroundColor: '#4CAF50',
  },
  splitButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  splitButtonTextActive: {
    color: '#fff',
  },
  customSplits: {
    marginBottom: 16,
  },
  customSplitTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  customSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  customSplitName: {
    fontSize: 16,
    color: '#333',
  },
  customSplitInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    width: 100,
    textAlign: 'right',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  saveDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  settleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settleMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settleAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settleAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settleMemberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  settleAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resultEmail: {
    fontSize: 14,
    color: '#666',
  },
  addButtonSmall: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonSmallText: {
    color: '#fff',
    fontWeight: '600',
  },
  balanceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  balanceDetailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  memberBalance: {
    fontSize: 16,
    fontWeight: '600',
  },
  owesPositive: {
    color: '#4CAF50',
  },
  owesNegative: {
    color: '#f44336',
  },
  owesNeutral: {
    color: '#999',
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GroupDetailScreen;