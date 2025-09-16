import React, { useState } from 'react';
import { AppData, Player, Match, Payment, Weekend } from '../types';
import { getPlayerPayment, setPartialPayment, markAsPaid, markAsUnpaid } from '../utils/calculations';
import { format, parse } from 'date-fns';

interface PaymentTableProps {
  appData: AppData;
  onAppDataUpdate: (data: AppData) => void;
}

interface PlayerPaymentRow {
  player: Player;
  prevBalance: number;
  saturdayPayment?: Payment;
  sundayPayment?: Payment;
  weekdayPayments: Payment[];
  amountPaid: number;
  totalDue: number;
  currentBalance: number;
  status: 'paid' | 'pending' | 'partial';
}

const PaymentTable: React.FC<PaymentTableProps> = ({ appData, onAppDataUpdate }) => {
  const [editingCell, setEditingCell] = useState<{playerId: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const getCurrentWeekend = (): Weekend | undefined => {
    return appData.weekends.find(w => w.id === appData.currentWeekendId);
  };

  const getWeekendMatches = (weekend: Weekend): Match[] => {
    const matches: Match[] = [];
    if (weekend.saturdayMatch) matches.push(weekend.saturdayMatch);
    if (weekend.sundayMatch) matches.push(weekend.sundayMatch);
    matches.push(...weekend.weekdayMatches);
    return matches;
  };

  const calculatePlayerPaymentRow = (player: Player): PlayerPaymentRow => {
    const currentWeekend = getCurrentWeekend();
    if (!currentWeekend) {
      return {
        player,
        prevBalance: 0,
        amountPaid: 0,
        totalDue: 0,
        currentBalance: 0,
        status: 'pending',
        weekdayPayments: []
      };
    }

    // Get previous balance (from all weekends except current)
    const previousWeekends = appData.weekends.filter(w => w.id !== currentWeekend.id);
    const previousMatches = previousWeekends.flatMap(w => getWeekendMatches(w));
    
    let prevBalance = player.balance;
    previousMatches.forEach(match => {
      const payment = getPlayerPayment(match, player.id);
      if (payment) {
        // If they paid less than due, they owe more (positive)
        // If they paid more than due, they overpaid (negative)
        prevBalance += (payment.amountDue - payment.amountPaid);
      } else if (match.playerIds.includes(player.id)) {
        // Player played but no payment record - they owe money
        const costPerPlayer = (match.groundCost + match.cafeteriaCost) / match.playerIds.length;
        prevBalance += costPerPlayer;
      }
    });

    // Get current weekend payments
    const saturdayPayment = currentWeekend.saturdayMatch ? 
      getPlayerPayment(currentWeekend.saturdayMatch, player.id) : undefined;
    
    const sundayPayment = currentWeekend.sundayMatch ? 
      getPlayerPayment(currentWeekend.sundayMatch, player.id) : undefined;
    
    const weekdayPayments = currentWeekend.weekdayMatches
      .map(match => getPlayerPayment(match, player.id))
      .filter(Boolean) as Payment[];

    // Calculate totals
    const allCurrentPayments = [saturdayPayment, sundayPayment, ...weekdayPayments].filter(Boolean) as Payment[];
    const amountPaid = allCurrentPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalDue = allCurrentPayments.reduce((sum, p) => sum + p.amountDue, 0);
    const currentBalance = prevBalance + (totalDue - amountPaid); // Fixed: totalDue - amountPaid (positive = owes money)

    // Determine overall status
    let status: 'paid' | 'pending' | 'partial' = 'pending';
    if (allCurrentPayments.length > 0) {
      if (allCurrentPayments.every(p => p.status === 'paid')) {
        status = 'paid';
      } else if (allCurrentPayments.some(p => p.status === 'paid' || p.status === 'partial')) {
        status = 'partial';
      }
    }

    return {
      player,
      prevBalance,
      saturdayPayment,
      sundayPayment,
      weekdayPayments,
      amountPaid,
      totalDue,
      currentBalance,
      status
    };
  };

  const getPlayerRows = (): PlayerPaymentRow[] => {
    return appData.players.map(calculatePlayerPaymentRow);
  };

  const handleCellEdit = (playerId: string, field: string, currentValue: string) => {
    // Prevent editing if already editing this cell
    if (editingCell?.playerId === playerId && editingCell?.field === field) {
      return;
    }
    setEditingCell({ playerId, field });
    setEditValue(currentValue);
  };

  const handleCellSave = (playerId: string, field: string) => {
    const currentWeekend = getCurrentWeekend();
    if (!currentWeekend) return;

    const player = appData.players.find(p => p.id === playerId);
    if (!player) return;

    const numValue = Math.abs(parseFloat(editValue) || 0); // Ensure positive values
    
    // Prevent editing if value is the same
    if (field === 'prevBalance' && numValue === Math.abs(player.balance)) {
      setEditingCell(null);
      return;
    }
    
    let updatedWeekend = { ...currentWeekend };

    // Update the appropriate match based on field
    if (field === 'saturday' && updatedWeekend.saturdayMatch) {
      updatedWeekend.saturdayMatch = updateMatchPayment(updatedWeekend.saturdayMatch, playerId, numValue);
    } else if (field === 'sunday' && updatedWeekend.sundayMatch) {
      updatedWeekend.sundayMatch = updateMatchPayment(updatedWeekend.sundayMatch, playerId, numValue);
    } else if (field === 'prevBalance') {
      // Update player's base balance (this is their starting balance, not calculated)
      // We need to set it to the absolute value since we track amounts owed as positive
      const updatedPlayers = appData.players.map(p => 
        p.id === playerId ? { ...p, balance: numValue } : p
      );
      const updatedAppData = { ...appData, players: updatedPlayers };
      onAppDataUpdate(updatedAppData);
      setEditingCell(null);
      return;
    }

    // Update the app data
    const updatedWeekends = appData.weekends.map(w => 
      w.id === currentWeekend.id ? updatedWeekend : w
    );
    const updatedAppData = { ...appData, weekends: updatedWeekends };
    onAppDataUpdate(updatedAppData);
    setEditingCell(null);
  };

  const updateMatchPayment = (match: Match, playerId: string, paidAmount: number): Match => {
    const existingPayment = getPlayerPayment(match, playerId);
    if (!existingPayment) return match;

    const updatedPayment = setPartialPayment(existingPayment, paidAmount);
    const updatedPayments = match.payments.map(p => 
      p.playerId === playerId ? updatedPayment : p
    );

    return { ...match, payments: updatedPayments };
  };

  const togglePaymentStatus = (playerId: string, field: 'saturday' | 'sunday') => {
    const currentWeekend = getCurrentWeekend();
    if (!currentWeekend) return;

    let match: Match | undefined;
    if (field === 'saturday') match = currentWeekend.saturdayMatch;
    if (field === 'sunday') match = currentWeekend.sundayMatch;
    
    if (!match) return;

    const payment = getPlayerPayment(match, playerId);
    if (!payment) return;

    const updatedPayment = payment.status === 'paid' ? markAsUnpaid(payment) : markAsPaid(payment);
    const updatedPayments = match.payments.map(p => 
      p.playerId === playerId ? updatedPayment : p
    );

    const updatedMatch = { ...match, payments: updatedPayments };
    let updatedWeekend = { ...currentWeekend };
    
    if (field === 'saturday') updatedWeekend.saturdayMatch = updatedMatch;
    if (field === 'sunday') updatedWeekend.sundayMatch = updatedMatch;

    const updatedWeekends = appData.weekends.map(w => 
      w.id === currentWeekend.id ? updatedWeekend : w
    );
    const updatedAppData = { ...appData, weekends: updatedWeekends };
    onAppDataUpdate(updatedAppData);
  };

  const formatCurrency = (amount: number): string => {
    return `₹${Math.abs(amount)}`;
  };

  const getBalanceColor = (balance: number): string => {
    if (balance > 0) return 'text-red-600'; // Owes money
    if (balance < 0) return 'text-green-600'; // Overpaid
    return 'text-gray-600'; // Even
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMatchDate = (match: Match | undefined): string => {
    if (!match) return 'No Match';
    try {
      const date = parse(match.date, 'yyyy-MM-dd', new Date());
      return format(date, 'MMM dd');
    } catch {
      return 'N/A';
    }
  };

  const playerRows = getPlayerRows();
  const currentWeekend = getCurrentWeekend();

  const handleKeyDown = (e: React.KeyboardEvent, onSave: () => void) => {
    if (e.key === 'Enter') {
      onSave();
    } else if (e.key === 'Escape') {
      // Cancel editing without saving
      setEditingCell(null);
      setEditValue('');
    }
  };

  const EditableCell: React.FC<{
    value: string;
    playerId: string;
    field: string;
    isEditing: boolean;
    onEdit: () => void;
    onSave: () => void;
    className?: string;
  }> = ({ value, playerId, field, isEditing, onEdit, onSave, className = '' }) => {
    if (isEditing) {
      return (
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => handleKeyDown(e, onSave)}
          className={`w-full p-1 text-sm border rounded ${className}`}
          autoFocus
        />
      );
    }

    return (
      <span 
        onClick={onEdit}
        className={`cursor-pointer hover:bg-gray-100 p-1 rounded ${className}`}
        title="Click to edit"
      >
        {value || 'Click to set'}
      </span>
    );
  };

  return (
    <div className="payment-table-container">
      <div className="table-header">
        <h2>Payment Overview</h2>
        {currentWeekend && (
          <p className="weekend-info">
            Weekend: {formatMatchDate(currentWeekend.saturdayMatch)} - {formatMatchDate(currentWeekend.sundayMatch)}
          </p>
        )}
      </div>

      <div className="table-scroll">
        <table className="payment-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Prev Balance</th>
              <th>Saturday<br/>{formatMatchDate(currentWeekend?.saturdayMatch)}</th>
              <th>Sunday<br/>{formatMatchDate(currentWeekend?.sundayMatch)}</th>
              <th>Amount Paid</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {playerRows.map(row => (
              <tr key={row.player.id}>
                <td className="player-name">
                  {row.player.lastName ? 
                    `${row.player.firstName} ${row.player.lastName}` : 
                    row.player.firstName
                  }
                </td>
                
                <td className={getBalanceColor(row.prevBalance)}>
                  <EditableCell
                    value={row.prevBalance !== 0 ? formatCurrency(Math.abs(row.prevBalance)) : ''}
                    playerId={row.player.id}
                    field="prevBalance"
                    isEditing={editingCell?.playerId === row.player.id && editingCell?.field === 'prevBalance'}
                    onEdit={() => handleCellEdit(row.player.id, 'prevBalance', Math.abs(row.player.balance).toString())}
                    onSave={() => handleCellSave(row.player.id, 'prevBalance')}
                    className={getBalanceColor(row.prevBalance)}
                  />
                </td>
                
                <td className="match-cell">
                  {row.saturdayPayment ? (
                    <div className="payment-info">
                      <EditableCell
                        value={row.saturdayPayment.amountPaid > 0 ? formatCurrency(row.saturdayPayment.amountPaid) : ''}
                        playerId={row.player.id}
                        field="saturday"
                        isEditing={editingCell?.playerId === row.player.id && editingCell?.field === 'saturday'}
                        onEdit={() => handleCellEdit(row.player.id, 'saturday', row.saturdayPayment?.amountPaid.toString() || '0')}
                        onSave={() => handleCellSave(row.player.id, 'saturday')}
                      />
                      <button
                        className={`status-toggle ${row.saturdayPayment.status}`}
                        onClick={() => togglePaymentStatus(row.player.id, 'saturday')}
                      >
                        {row.saturdayPayment.status === 'paid' ? '✓' : row.saturdayPayment.status === 'partial' ? '◐' : '○'}
                      </button>
                    </div>
                  ) : (
                    <span className="no-match">-</span>
                  )}
                </td>
                
                <td className="match-cell">
                  {row.sundayPayment ? (
                    <div className="payment-info">
                      <EditableCell
                        value={row.sundayPayment.amountPaid > 0 ? formatCurrency(row.sundayPayment.amountPaid) : ''}
                        playerId={row.player.id}
                        field="sunday"
                        isEditing={editingCell?.playerId === row.player.id && editingCell?.field === 'sunday'}
                        onEdit={() => handleCellEdit(row.player.id, 'sunday', row.sundayPayment?.amountPaid.toString() || '0')}
                        onSave={() => handleCellSave(row.player.id, 'sunday')}
                      />
                      <button
                        className={`status-toggle ${row.sundayPayment.status}`}
                        onClick={() => togglePaymentStatus(row.player.id, 'sunday')}
                      >
                        {row.sundayPayment.status === 'paid' ? '✓' : row.sundayPayment.status === 'partial' ? '◐' : '○'}
                      </button>
                    </div>
                  ) : (
                    <span className="no-match">-</span>
                  )}
                </td>
                
                <td className="amount-cell">
                  {row.amountPaid > 0 ? formatCurrency(row.amountPaid) : '-'}
                </td>
                
                <td className={`total-cell ${getBalanceColor(row.currentBalance)}`}>
                  {row.currentBalance > 0 && `₹${row.currentBalance}`}
                  {row.currentBalance < 0 && `-₹${Math.abs(row.currentBalance)}`}
                  {row.currentBalance === 0 && '₹0'}
                </td>
                
                <td>
                  <span className={`status-badge ${getStatusColor(row.status)}`}>
                    {row.status === 'paid' ? 'Paid' : 
                     row.status === 'partial' ? 'Partial' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="table-summary">
        <p className="help-text">
          💡 Click on amounts to edit • Click status buttons to toggle payment status
        </p>
      </div>
    </div>
  );
};

export default PaymentTable;