import React, { useState } from 'react';
import { Match, Player, Payment } from '../types';
import { calculateMatchCostPerPlayer, getPlayerPayment, createPayment, markAsPaid, markAsUnpaid, setPartialPayment } from '../utils/calculations';
import { v4 as uuidv4 } from 'uuid';
import { format, parse } from 'date-fns';

interface MatchCardProps {
  match: Match | undefined;
  players: Player[];
  onMatchUpdate: (match: Match) => void;
  matchDate: string;
  matchType: 'Saturday' | 'Sunday' | 'Weekday';
  club: 'MICC' | 'Sadhooz';
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  players, 
  onMatchUpdate, 
  matchDate, 
  matchType, 
  club 
}) => {
  const [isEditing, setIsEditing] = useState(!match);
  const [editMatch, setEditMatch] = useState<Match>(match || {
    id: uuidv4(),
    date: matchDate,
    club,
    type: matchType,
    groundCost: 0,
    cafeteriaCost: 0,
    playerIds: [],
    payments: []
  });

  const [partialPaymentAmount, setPartialPaymentAmount] = useState<{[key: string]: string}>({});

  const handleSave = () => {
    if (editMatch.playerIds.length > 0 && (editMatch.groundCost > 0 || editMatch.cafeteriaCost > 0)) {
      const costPerPlayer = calculateMatchCostPerPlayer(editMatch);
      
      // Create or update payments for selected players
      const updatedPayments = editMatch.playerIds.map(playerId => {
        const existingPayment = getPlayerPayment(editMatch, playerId);
        if (existingPayment) {
          return { ...existingPayment, amountDue: costPerPlayer };
        }
        return createPayment(editMatch.id, playerId, costPerPlayer);
      });

      const updatedMatch = {
        ...editMatch,
        payments: updatedPayments
      };

      onMatchUpdate(updatedMatch);
      setIsEditing(false);
    }
  };

  const handlePlayerToggle = (playerId: string) => {
    const isSelected = editMatch.playerIds.includes(playerId);
    const updatedPlayerIds = isSelected
      ? editMatch.playerIds.filter(id => id !== playerId)
      : [...editMatch.playerIds, playerId];
    
    setEditMatch({ ...editMatch, playerIds: updatedPlayerIds });
  };

  const handlePaymentToggle = (payment: Payment) => {
    if (!match) return;
    
    let updatedPayment: Payment;
    
    if (payment.status === 'paid') {
      updatedPayment = markAsUnpaid(payment);
    } else {
      updatedPayment = markAsPaid(payment);
    }

    const updatedPayments = match.payments.map(p => 
      p.id === payment.id ? updatedPayment : p
    );
    
    const updatedMatch = { ...match, payments: updatedPayments };
    onMatchUpdate(updatedMatch);
  };

  const handlePartialPayment = (payment: Payment, amount: string) => {
    if (!match) return;
    
    const numAmount = parseFloat(amount) || 0;
    const updatedPayment = setPartialPayment(payment, numAmount);
    
    const updatedPayments = match.payments.map(p => 
      p.id === payment.id ? updatedPayment : p
    );
    
    const updatedMatch = { ...match, payments: updatedPayments };
    onMatchUpdate(updatedMatch);
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return 'Unknown';
    return player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'partial': return 'status-partial';
      default: return '';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parse(dateString, 'yyyy-MM-dd', new Date());
      return format(date, 'MMM dd');
    } catch {
      return dateString;
    }
  };

  if (!match && !isEditing) {
    return (
      <div className="match-card empty">
        <h3>{matchType} - {club}</h3>
        <p>{formatDate(matchDate)}</p>
        <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
          Create Match
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="match-card editing">
        <h3>{matchType} - {club}</h3>
        <p>{formatDate(matchDate)}</p>
        
        <div className="cost-inputs">
          <div className="input-group">
            <label>Ground Cost (₹)</label>
            <input
              type="number"
              value={editMatch.groundCost}
              onChange={(e) => setEditMatch({...editMatch, groundCost: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div className="input-group">
            <label>Cafeteria Cost (₹)</label>
            <input
              type="number"
              value={editMatch.cafeteriaCost}
              onChange={(e) => setEditMatch({...editMatch, cafeteriaCost: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>

        <div className="player-selection">
          <h4>Select Players</h4>
          <div className="players-grid">
            {players.map(player => (
              <label key={player.id} className="player-checkbox">
                <input
                  type="checkbox"
                  checked={editMatch.playerIds.includes(player.id)}
                  onChange={() => handlePlayerToggle(player.id)}
                />
                {getPlayerName(player.id)}
              </label>
            ))}
          </div>
        </div>

        {editMatch.playerIds.length > 0 && (
          <div className="cost-summary">
            <p>Total Cost: ₹{editMatch.groundCost + editMatch.cafeteriaCost}</p>
            <p>Cost per Player: ₹{calculateMatchCostPerPlayer(editMatch)}</p>
          </div>
        )}

        <div className="form-actions">
          <button className="btn btn-success" onClick={handleSave}>
            Save Match
          </button>
          <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Ensure match exists for the rest of the component
  if (!match) return null;
  
  const validMatch = match; // Create a const to help TypeScript understand it's not undefined

  return (
    <div className="match-card">
      <div className="match-header">
        <h3>{matchType} - {club}</h3>
        <p>{formatDate(matchDate)}</p>
        <button className="btn btn-small" onClick={() => setIsEditing(true)}>
          Edit
        </button>
      </div>

      <div className="match-summary">
        <p>Total Cost: ₹{validMatch.groundCost + validMatch.cafeteriaCost}</p>
        <p>Players: {validMatch.playerIds.length}</p>
        <p>Cost per Player: ₹{calculateMatchCostPerPlayer(validMatch)}</p>
      </div>

      <div className="payments-list">
        <h4>Payments</h4>
        {validMatch.payments.map(payment => (
          <div key={payment.id} className={`payment-row ${getStatusClass(payment.status)}`}>
            <span className="player-name">{getPlayerName(payment.playerId)}</span>
            <span className="amount">₹{payment.amountDue}</span>
            
            {payment.status === 'partial' && (
              <div className="partial-payment">
                <input
                  type="number"
                  placeholder="Amount paid"
                  value={partialPaymentAmount[payment.id] || payment.amountPaid}
                  onChange={(e) => setPartialPaymentAmount({
                    ...partialPaymentAmount,
                    [payment.id]: e.target.value
                  })}
                  onBlur={(e) => handlePartialPayment(payment, e.target.value)}
                />
              </div>
            )}
            
            <button 
              className={`btn btn-small status-btn ${payment.status}`}
              onClick={() => handlePaymentToggle(payment)}
            >
              {payment.status === 'paid' ? 'Paid' : 
               payment.status === 'partial' ? 'Partial' : 'Pending'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchCard;