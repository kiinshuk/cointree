/**
 * Balance Calculator Utility
 * Handles balance calculation for expense sharing
 */

/**
 * Calculate balances from expenses
 * @param {Array} expenses - Array of expense objects
 * @param {Array} memberIds - Array of member IDs
 * @returns {Array} - Array of balance objects { uid, balance }
 */
export const calculateGroupBalances = (expenses, memberIds) => {
  const balances = {};
  
  memberIds.forEach(uid => {
    balances[uid] = 0;
  });

  expenses.forEach(expense => {
    if (expense.isSettlement) {
      const paidBy = expense.paidBy;
      const splits = expense.splits || [];
      
      if (paidBy && balances[paidBy] !== undefined) {
        balances[paidBy] += expense.amount;
      }
      
      splits.forEach(split => {
        const uid = split.uid;
        if (balances[uid] !== undefined) {
          balances[uid] -= split.amount;
        }
      });
      return;
    }

    const splits = expense.splits || [];
    const totalAmount = parseFloat(expense.amount) || 0;

    if (expense.splitType === 'equal') {
      const paidBy = expense.paidBy;
      
      if (paidBy && balances[paidBy] !== undefined) {
        balances[paidBy] += totalAmount;
      }

      splits.forEach(split => {
        const uid = split.uid;
        if (balances[uid] !== undefined) {
          balances[uid] -= split.amount;
        }
      });
    } else {
      splits.forEach(split => {
        const uid = split.uid;
        const contributed = parseFloat(split.amount) || 0;
        
        if (balances[uid] !== undefined) {
          balances[uid] += contributed;
        }
      });

      const equalShare = totalAmount / splits.length;
      splits.forEach(split => {
        const uid = split.uid;
        if (balances[uid] !== undefined) {
          balances[uid] -= equalShare;
        }
      });
    }
  });

  return Object.keys(balances).map(uid => ({
    uid,
    balance: Math.round(balances[uid] * 100) / 100
  }));
};

/**
 * Get simplified settle transactions
 * @param {Array} balances - Array of balance objects
 * @returns {Array} - Array of transactions to settle
 */
export const getSettleTransactions = (balances) => {
  const transactions = [];
  const debtors = [];
  const creditors = [];

  balances.forEach(b => {
    if (b.balance < -0.01) {
      debtors.push({ uid: b.uid, amount: Math.abs(b.balance) });
    } else if (b.balance > 0.01) {
      creditors.push({ uid: b.uid, amount: b.balance });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.01) {
      transactions.push({
        from: debtors[i].uid,
        to: creditors[j].uid,
        amount: Math.round(amount * 100) / 100
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return transactions;
};