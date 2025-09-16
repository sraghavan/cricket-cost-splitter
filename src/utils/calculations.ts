import { Player, Match, Payment } from '../types';

export const calculateMatchCostPerPlayer = (match: Match): number => {
  if (match.playerIds.length === 0) return 0;
  const totalCost = match.groundCost + match.cafeteriaCost;
  return totalCost / match.playerIds.length;
};

export const calculatePlayerDue = (match: Match, playerId: string): number => {
  if (!match.playerIds.includes(playerId)) return 0;
  return calculateMatchCostPerPlayer(match);
};

export const getPlayerPayment = (match: Match, playerId: string): Payment | undefined => {
  return match.payments.find(p => p.playerId === playerId);
};

export const calculatePlayerBalance = (player: Player, allMatches: Match[]): number => {
  let balance = player.balance; // Starting balance
  
  allMatches.forEach(match => {
    const payment = getPlayerPayment(match, player.id);
    if (payment) {
      const due = calculatePlayerDue(match, player.id);
      balance += (payment.amountPaid - due);
    } else if (match.playerIds.includes(player.id)) {
      // Player played but no payment record exists
      const due = calculatePlayerDue(match, player.id);
      balance += due; // Add to amount owed
    }
  });
  
  return balance;
};

export const updatePaymentStatus = (payment: Payment): Payment => {
  if (payment.amountPaid === 0) {
    return { ...payment, status: 'pending' };
  } else if (payment.amountPaid >= payment.amountDue) {
    return { ...payment, status: 'paid' };
  } else {
    return { ...payment, status: 'partial' };
  }
};

export const createPayment = (matchId: string, playerId: string, amountDue: number): Payment => {
  return {
    id: generateUUID(),
    matchId,
    playerId,
    amountDue,
    amountPaid: 0,
    status: 'pending',
    date: new Date().toISOString()
  };
};

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const markAsPaid = (payment: Payment): Payment => {
  return {
    ...payment,
    amountPaid: payment.amountDue,
    status: 'paid'
  };
};

export const markAsUnpaid = (payment: Payment): Payment => {
  return {
    ...payment,
    amountPaid: 0,
    status: 'pending'
  };
};

export const setPartialPayment = (payment: Payment, amount: number): Payment => {
  const updatedPayment = {
    ...payment,
    amountPaid: amount
  };
  return updatePaymentStatus(updatedPayment);
};