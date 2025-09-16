import React, { useState } from 'react';
import { AppData, Weekend, Player, Match, Payment } from '../types';
import { getPlayerPayment, calculateMatchCostPerPlayer, createPayment } from '../utils/calculations';
import { format, parse, addDays } from 'date-fns';
import { exportData, getNextWeekend } from '../utils/storage';
import { v4 as uuidv4 } from 'uuid';

interface ConsolidatedDashboardProps {
  appData: AppData;
  onAppDataUpdate: (data: AppData) => void;
}

interface PlayerPaymentRow {
  player: Player;
  prevBalance: number;
  saturdayPayment?: Payment;
  sundayPayment?: Payment;
  amountPaid: number;
  totalDue: number;
  currentBalance: number;
  status: 'paid' | 'pending' | 'partial';
}

const ConsolidatedDashboard: React.FC<ConsolidatedDashboardProps> = ({ appData, onAppDataUpdate }) => {
  const [showPlayerManagement, setShowPlayerManagement] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<{playerId: string, field: string} | null>(null);
  const [editingCell, setEditingCell] = useState<{playerId: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [newPlayerData, setNewPlayerData] = useState<{firstName: string, lastName: string, nickname: string, mobile: string, regular: boolean}>({
    firstName: '', lastName: '', nickname: '', mobile: '', regular: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showMatchForm, setShowMatchForm] = useState<'saturday' | 'sunday' | null>(null);
  const [matchForm, setMatchForm] = useState({
    groundCost: '',
    cafeteriaCost: '',
    selectedPlayers: [] as string[],
    club: 'MICC' as 'MICC' | 'Sadhooz'
  });

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
        status: 'pending'
      };
    }

    // Calculate previous balance
    const previousWeekends = appData.weekends.filter(w => w.id !== currentWeekend.id);
    const previousMatches = previousWeekends.flatMap(w => getWeekendMatches(w));
    
    let prevBalance = player.balance;
    previousMatches.forEach(match => {
      const payment = getPlayerPayment(match, player.id);
      if (payment) {
        prevBalance += (payment.amountDue - payment.amountPaid);
      } else if (match.playerIds.includes(player.id)) {
        const costPerPlayer = (match.groundCost + match.cafeteriaCost) / match.playerIds.length;
        prevBalance += costPerPlayer;
      }
    });

    // Get current weekend payments
    const saturdayPayment = currentWeekend.saturdayMatch ? 
      getPlayerPayment(currentWeekend.saturdayMatch, player.id) : undefined;
    const sundayPayment = currentWeekend.sundayMatch ? 
      getPlayerPayment(currentWeekend.sundayMatch, player.id) : undefined;

    const allCurrentPayments = [saturdayPayment, sundayPayment].filter(Boolean) as Payment[];
    const amountPaid = allCurrentPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalDue = allCurrentPayments.reduce((sum, p) => sum + p.amountDue, 0);
    const currentBalance = prevBalance + (totalDue - amountPaid);

    // Determine status based on total balance instead of individual payments
    let status: 'paid' | 'pending' | 'partial' = 'pending';
    if (currentBalance <= 0) {
      status = 'paid'; // If negative balance (overpaid) or zero, mark as paid
    } else if (amountPaid > 0) {
      status = 'partial'; // If some payment made but still owes money
    }

    return {
      player,
      prevBalance,
      saturdayPayment,
      sundayPayment,
      amountPaid,
      totalDue,
      currentBalance,
      status
    };
  };

  const getPlayerRows = (): PlayerPaymentRow[] => {
    return appData.players.map(calculatePlayerPaymentRow);
  };

  const getPlayerDisplayName = (player: Player): string => {
    if (player.nickname && player.nickname.trim()) {
      return player.nickname.trim();
    }
    return player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName;
  };

  const formatDate = (dateString: string, type: 'saturday' | 'sunday' = 'saturday') => {
    try {
      const startDate = parse(dateString, 'yyyy-MM-dd', new Date());
      const targetDate = type === 'saturday' ? startDate : addDays(startDate, 1);
      return format(targetDate, 'MMM dd');
    } catch {
      return type === 'saturday' ? 'Aug 30' : 'Aug 31';
    }
  };

  const handleNextWeekend = () => {
    const currentWeekend = getCurrentWeekend();
    if (!currentWeekend) return;

    const nextWeekend = getNextWeekend(currentWeekend);
    const updatedData = {
      ...appData,
      weekends: [...appData.weekends, nextWeekend],
      currentWeekendId: nextWeekend.id
    };
    onAppDataUpdate(updatedData);
  };

  const handleEditMatch = (type: 'saturday' | 'sunday') => {
    const currentWeekend = getCurrentWeekend();
    if (!currentWeekend) return;
    
    const match = type === 'saturday' ? currentWeekend.saturdayMatch : currentWeekend.sundayMatch;
    if (!match) return;
    
    // Pre-fill the form with existing match data
    setMatchForm({
      groundCost: match.groundCost.toString(),
      cafeteriaCost: match.cafeteriaCost.toString(),
      selectedPlayers: match.playerIds,
      club: match.club
    });
    setShowMatchForm(type);
  };

  const handleDeleteMatch = (type: 'saturday' | 'sunday') => {
    const currentWeekend = getCurrentWeekend();
    if (!currentWeekend) return;
    
    if (window.confirm(`Are you sure you want to delete the ${type} match? This will remove all payment records for this match.`)) {
      let updatedWeekend = { ...currentWeekend };
      if (type === 'saturday') {
        updatedWeekend.saturdayMatch = undefined;
      } else {
        updatedWeekend.sundayMatch = undefined;
      }
      
      const updatedWeekends = appData.weekends.map(w => 
        w.id === currentWeekend.id ? updatedWeekend : w
      );
      onAppDataUpdate({ ...appData, weekends: updatedWeekends });
    }
  };

  const handleCreateMatch = (type: 'saturday' | 'sunday') => {
    const groundCost = parseFloat(matchForm.groundCost) || 0;
    const cafeteriaCost = parseFloat(matchForm.cafeteriaCost) || 0;
    const playerIds = matchForm.selectedPlayers;
    const currentWeekend = getCurrentWeekend();
    if (!currentWeekend || playerIds.length === 0) return;

    const existingMatch = type === 'saturday' ? currentWeekend.saturdayMatch : currentWeekend.sundayMatch;
    const costPerPlayer = (groundCost + cafeteriaCost) / playerIds.length;
    
    let match: Match;
    
    if (existingMatch) {
      // Update existing match
      match = {
        ...existingMatch,
        club: matchForm.club,
        groundCost,
        cafeteriaCost,
        playerIds,
        payments: playerIds.map(playerId => {
          // Keep existing payment if player was already in match, otherwise create new
          const existingPayment = existingMatch.payments.find(p => p.playerId === playerId);
          return existingPayment ? { ...existingPayment, amountDue: costPerPlayer } : createPayment(uuidv4(), playerId, costPerPlayer);
        })
      };
    } else {
      // Create new match
      match = {
        id: uuidv4(),
        date: type === 'saturday' ? currentWeekend.startDate : format(addDays(parse(currentWeekend.startDate, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd'),
        club: matchForm.club,
        type: type === 'saturday' ? 'Saturday' : 'Sunday',
        groundCost,
        cafeteriaCost,
        playerIds,
        payments: playerIds.map(playerId => createPayment(uuidv4(), playerId, costPerPlayer))
      };
    }

    let updatedWeekend = { ...currentWeekend };
    if (type === 'saturday') {
      updatedWeekend.saturdayMatch = match;
    } else {
      updatedWeekend.sundayMatch = match;
    }

    const updatedWeekends = appData.weekends.map(w => 
      w.id === currentWeekend.id ? updatedWeekend : w
    );
    onAppDataUpdate({ ...appData, weekends: updatedWeekends });
    
    // Reset form
    setMatchForm({ groundCost: '', cafeteriaCost: '', selectedPlayers: [], club: 'MICC' });
    setShowMatchForm(null);
  };

  const handleOverallPaymentToggle = (playerId: string) => {
    console.log('Status button clicked for player:', playerId);
    const currentWeekend = getCurrentWeekend();
    if (!currentWeekend) {
      console.log('No current weekend found');
      return;
    }

    const player = appData.players.find(p => p.id === playerId)!;
    const playerRow = calculatePlayerPaymentRow(player);
    const isCurrentlyPaid = playerRow.status === 'paid';
    console.log('Player status:', playerRow.status, 'isCurrentlyPaid:', isCurrentlyPaid);
    console.log('Current balance:', playerRow.currentBalance);
    
    let updatedWeekend = { ...currentWeekend };
    let updatedPlayers = [...appData.players];
    
    // Get all current payments for this player directly from the matches
    const saturdayPayment = currentWeekend.saturdayMatch ? 
      getPlayerPayment(currentWeekend.saturdayMatch, playerId) : undefined;
    const sundayPayment = currentWeekend.sundayMatch ? 
      getPlayerPayment(currentWeekend.sundayMatch, playerId) : undefined;
      
    const allCurrentPayments = [saturdayPayment, sundayPayment].filter(Boolean) as Payment[];
    console.log('Found payments:', allCurrentPayments.length, allCurrentPayments);
    
    if (isCurrentlyPaid) {
      // If currently paid, mark as unpaid (set amountPaid to 0 for all matches and reset player balance)
      console.log('Marking as unpaid - setting payments to 0');
      
      // Reset all current weekend payments to 0
      allCurrentPayments.forEach(payment => {
        const paymentStatus: Payment['status'] = 'pending';
        const updatedPayment: Payment = { 
          ...payment, 
          amountPaid: 0, 
          status: paymentStatus
        };

        // Update Saturday match payment
        if (updatedWeekend.saturdayMatch && payment.playerId === playerId) {
          const satPayment = updatedWeekend.saturdayMatch.payments.find(p => p.playerId === playerId);
          if (satPayment && satPayment.id === payment.id) {
            updatedWeekend.saturdayMatch.payments = updatedWeekend.saturdayMatch.payments.map(p => 
              p.playerId === playerId ? updatedPayment : p
            );
          }
        }
        
        // Update Sunday match payment
        if (updatedWeekend.sundayMatch && payment.playerId === playerId) {
          const sunPayment = updatedWeekend.sundayMatch.payments.find(p => p.playerId === playerId);
          if (sunPayment && sunPayment.id === payment.id) {
            updatedWeekend.sundayMatch.payments = updatedWeekend.sundayMatch.payments.map(p => 
              p.playerId === playerId ? updatedPayment : p
            );
          }
        }
      });
      
      // Reset player's previous balance to what it should be (original balance)
      updatedPlayers = updatedPlayers.map(p => 
        p.id === playerId ? { ...p, balance: playerRow.currentBalance } : p
      );
      
    } else {
      // If currently unpaid, mark as FULLY paid (clear ALL dues including previous balance)
      console.log('Marking as fully paid - clearing all dues');
      
      // Set all current weekend payments to fully paid
      allCurrentPayments.forEach(payment => {
        const paymentStatus: Payment['status'] = 'paid';
        const updatedPayment: Payment = { 
          ...payment, 
          amountPaid: payment.amountDue, 
          status: paymentStatus
        };

        // Update Saturday match payment
        if (updatedWeekend.saturdayMatch && payment.playerId === playerId) {
          const satPayment = updatedWeekend.saturdayMatch.payments.find(p => p.playerId === playerId);
          if (satPayment && satPayment.id === payment.id) {
            updatedWeekend.saturdayMatch.payments = updatedWeekend.saturdayMatch.payments.map(p => 
              p.playerId === playerId ? updatedPayment : p
            );
          }
        }
        
        // Update Sunday match payment
        if (updatedWeekend.sundayMatch && payment.playerId === playerId) {
          const sunPayment = updatedWeekend.sundayMatch.payments.find(p => p.playerId === playerId);
          if (sunPayment && sunPayment.id === payment.id) {
            updatedWeekend.sundayMatch.payments = updatedWeekend.sundayMatch.payments.map(p => 
              p.playerId === playerId ? updatedPayment : p
            );
          }
        }
      });
      
      // Clear player's previous balance to 0 (they've paid everything)
      updatedPlayers = updatedPlayers.map(p => 
        p.id === playerId ? { ...p, balance: 0 } : p
      );
    }

    const updatedWeekends = appData.weekends.map(w => 
      w.id === currentWeekend.id ? updatedWeekend : w
    );
    
    console.log('Updating app data...');
    onAppDataUpdate({ ...appData, weekends: updatedWeekends, players: updatedPlayers });
    console.log('Status toggle completed');
  };


  const handleAddNewPlayer = () => {
    const player: Player = {
      id: uuidv4(),
      firstName: 'New Player',
      lastName: '',
      mobile: '',
      balance: 0
    };
    
    onAppDataUpdate({ ...appData, players: [...appData.players, player] });
    // Auto-edit the first name of the new player
    setEditingPlayer({ playerId: player.id, field: 'firstName' });
    setEditValue('New Player');
  };

  const handleDeletePlayer = (playerId: string) => {
    if (window.confirm('Are you sure you want to delete this player? This will remove them from all matches and payment records.')) {
      // Remove player from players list
      const updatedPlayers = appData.players.filter(p => p.id !== playerId);
      
      // Remove player from all matches across all weekends
      const updatedWeekends = appData.weekends.map(weekend => {
        const updatedWeekend = { ...weekend };
        
        // Update Saturday match
        if (updatedWeekend.saturdayMatch) {
          updatedWeekend.saturdayMatch = {
            ...updatedWeekend.saturdayMatch,
            playerIds: updatedWeekend.saturdayMatch.playerIds.filter(id => id !== playerId),
            payments: updatedWeekend.saturdayMatch.payments.filter(p => p.playerId !== playerId)
          };
        }
        
        // Update Sunday match
        if (updatedWeekend.sundayMatch) {
          updatedWeekend.sundayMatch = {
            ...updatedWeekend.sundayMatch,
            playerIds: updatedWeekend.sundayMatch.playerIds.filter(id => id !== playerId),
            payments: updatedWeekend.sundayMatch.payments.filter(p => p.playerId !== playerId)
          };
        }
        
        // Update weekday matches
        updatedWeekend.weekdayMatches = updatedWeekend.weekdayMatches.map(match => ({
          ...match,
          playerIds: match.playerIds.filter(id => id !== playerId),
          payments: match.payments.filter(p => p.playerId !== playerId)
        }));
        
        return updatedWeekend;
      });
      
      onAppDataUpdate({ ...appData, players: updatedPlayers, weekends: updatedWeekends });
    }
  };

  const handlePlayerEdit = (playerId: string, field: string, currentValue: string) => {
    setEditingPlayer({ playerId, field });
    setEditValue(currentValue);
  };

  const handleNewPlayerSave = () => {
    if (!newPlayerData.firstName.trim()) {
      alert('First name is required');
      return;
    }
    
    const newPlayer: Player = {
      id: uuidv4(),
      firstName: newPlayerData.firstName.trim(),
      lastName: newPlayerData.lastName.trim() || undefined,
      nickname: newPlayerData.nickname.trim() || undefined,
      mobile: newPlayerData.mobile.trim() || '',
      balance: 0,
      regular: newPlayerData.regular
    };
    
    const updatedPlayers = [...appData.players, newPlayer];
    onAppDataUpdate({ ...appData, players: updatedPlayers });
    
    // Reset form
    setNewPlayerData({ firstName: '', lastName: '', nickname: '', mobile: '', regular: false });
    setEditingPlayer(null);
  };

  const isNewPlayerDataChanged = () => {
    return newPlayerData.firstName.trim() || 
           newPlayerData.lastName.trim() || 
           newPlayerData.nickname.trim() || 
           newPlayerData.mobile.trim();
  };

  const handlePlayerTabToNext = (currentPlayerId: string, currentField: string, nextField: string, nextPlayerId?: string) => {
    if (!editingPlayer) return;
    
    // Save current field value first
    const { playerId, field } = editingPlayer;
    
    if (playerId !== 'new') {
      // Update existing player
      const updatedPlayers = appData.players.map(player => {
        if (player.id === playerId) {
          return { ...player, [field]: editValue.trim() };
        }
        return player;
      });
      
      onAppDataUpdate({ ...appData, players: updatedPlayers });
    }
    
    // Move to next field
    const targetPlayerId = nextPlayerId || currentPlayerId;
    const player = appData.players.find(p => p.id === targetPlayerId);
    if (player) {
      setEditingPlayer({playerId: targetPlayerId, field: nextField});
      setEditValue(player[nextField as keyof Player]?.toString() || '');
    }
  };

  const handlePlayerSave = () => {
    if (!editingPlayer || editingPlayer.playerId === 'new') return;
    
    const { playerId, field } = editingPlayer;
    
    // Updating existing player only
    const updatedPlayers = appData.players.map(player => {
      if (player.id === playerId) {
        if (field === 'balance') {
          return { ...player, [field]: parseFloat(editValue) || 0 };
        }
        return { ...player, [field]: editValue.trim() };
      }
      return player;
    });
    
    onAppDataUpdate({ ...appData, players: updatedPlayers });
    setEditingPlayer(null);
    setEditValue('');
  };

  const filteredPlayers = appData.players.filter(player => 
    `${player.firstName} ${player.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (player.nickname && player.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    player.mobile.includes(searchTerm)
  );

  const handleTotalDueEdit = (playerId: string) => {
    const playerRow = calculatePlayerPaymentRow(appData.players.find(p => p.id === playerId)!);
    setEditingCell({ playerId, field: 'totalDue' });
    setEditValue(Math.max(0, playerRow.currentBalance).toString());
  };

  const handleTotalDueSave = (playerId: string) => {
    const currentWeekend = getCurrentWeekend();
    if (!currentWeekend) return;

    const newTotalDue = parseFloat(editValue) || 0;
    const playerRow = calculatePlayerPaymentRow(appData.players.find(p => p.id === playerId)!);
    
    // Calculate how much the player should have paid to reach the new total due
    const targetTotalPaid = playerRow.totalDue - newTotalDue;
    
    let updatedWeekend = { ...currentWeekend };
    
    // Distribute the payment across available matches proportionally
    const allCurrentPayments = [playerRow.saturdayPayment, playerRow.sundayPayment].filter(Boolean) as Payment[];
    const totalOwed = allCurrentPayments.reduce((sum, p) => sum + p.amountDue, 0);
    
    if (totalOwed > 0) {
      allCurrentPayments.forEach(payment => {
        const proportion = payment.amountDue / totalOwed;
        const newAmountPaid = Math.max(0, Math.min(payment.amountDue, targetTotalPaid * proportion));
        
        // Update Saturday match payment
        if (updatedWeekend.saturdayMatch && payment.playerId === playerId) {
          const satPayment = updatedWeekend.saturdayMatch.payments.find(p => p.playerId === playerId);
          if (satPayment && satPayment.id === payment.id) {
            const paymentStatus: Payment['status'] = newAmountPaid >= satPayment.amountDue ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending';
            const updatedPayment: Payment = { 
              ...satPayment, 
              amountPaid: newAmountPaid, 
              status: paymentStatus
            };
            updatedWeekend.saturdayMatch.payments = updatedWeekend.saturdayMatch.payments.map(p => 
              p.playerId === playerId ? updatedPayment : p
            );
          }
        }
        
        // Update Sunday match payment
        if (updatedWeekend.sundayMatch && payment.playerId === playerId) {
          const sunPayment = updatedWeekend.sundayMatch.payments.find(p => p.playerId === playerId);
          if (sunPayment && sunPayment.id === payment.id) {
            const paymentStatus: Payment['status'] = newAmountPaid >= sunPayment.amountDue ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending';
            const updatedPayment: Payment = { 
              ...sunPayment, 
              amountPaid: newAmountPaid, 
              status: paymentStatus
            };
            updatedWeekend.sundayMatch.payments = updatedWeekend.sundayMatch.payments.map(p => 
              p.playerId === playerId ? updatedPayment : p
            );
          }
        }
      });
    }

    const updatedWeekends = appData.weekends.map(w => 
      w.id === currentWeekend.id ? updatedWeekend : w
    );
    onAppDataUpdate({ ...appData, weekends: updatedWeekends });
    setEditingCell(null);
  };

  const generateWhatsAppText = () => {
    const currentWeekend = getCurrentWeekend();
    if (!currentWeekend) return;

    const playerRows = getPlayerRows();
    const pendingPlayers = playerRows.filter(row => row.currentBalance > 0);
    
    if (pendingPlayers.length === 0) {
      alert('No pending payments to share!');
      return;
    }

    const satDate = formatDate(currentWeekend.startDate, 'saturday');
    const sunDate = formatDate(currentWeekend.startDate, 'sunday');
    
    let message = `🏏 *Weekend Cricket Cost Update*\n`;
    message += `📅 ${satDate} & ${sunDate}\n\n`;
    message += `*Pending Payments:*\n`;
    
    pendingPlayers.forEach(row => {
      const name = `${row.player.firstName} ${row.player.lastName}`.trim();
      message += `• ${name}: ₹${row.currentBalance}\n`;
    });
    
    message += `\n💰 Total Pending: ₹${pendingPlayers.reduce((sum, row) => sum + row.currentBalance, 0)}\n`;
    message += `👥 Players: ${pendingPlayers.length}/${playerRows.length}\n\n`;
    message += `Please clear your dues soon. Thanks! 🙏`;

    // Copy to clipboard
    navigator.clipboard.writeText(message).then(() => {
      alert('Message copied to clipboard! You can now paste it in WhatsApp.');
    }).catch(() => {
      // Fallback: show message in a popup for manual copy
      const popup = window.open('', '_blank', 'width=400,height=600');
      if (popup) {
        popup.document.write(`
          <html>
            <head><title>WhatsApp Message</title></head>
            <body style="font-family: Arial; padding: 20px;">
              <h3>Copy this message for WhatsApp:</h3>
              <textarea style="width: 100%; height: 400px; font-size: 14px;" readonly>${message}</textarea>
              <br><br>
              <button onclick="navigator.clipboard.writeText(document.querySelector('textarea').value).then(() => alert('Copied!')).catch(() => alert('Please copy manually'))">Copy to Clipboard</button>
            </body>
          </html>
        `);
      }
    });
  };

  const handleExportData = () => {
    const dataString = exportData();
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `cricket-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentWeekend = getCurrentWeekend();
  const playerRows = getPlayerRows();
  const pendingCount = playerRows.filter(row => row.status === 'pending').length;
  const paidCount = playerRows.filter(row => row.status === 'paid').length;
  const partialCount = playerRows.filter(row => row.status === 'partial').length;

  return (
    <div className="consolidated-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="weekend-info">
          <h1>🏏 Cricket Cost Splitter</h1>
          {currentWeekend && (
            <p className="weekend-dates">
              Weekend: {formatDate(currentWeekend.startDate, 'saturday')} - {formatDate(currentWeekend.startDate, 'sunday')}, 2025
            </p>
          )}
        </div>
        
        <div className="header-actions">
          <button className="action-btn primary" onClick={handleNextWeekend}>
            Next Weekend →
          </button>
          <button className="action-btn secondary" onClick={generateWhatsAppText}>
            WhatsApp Message
          </button>
          <button className="action-btn secondary" onClick={() => setShowPlayerManagement(true)}>
            Manage Players ({appData.players.length})
          </button>
          <button className="action-btn secondary" onClick={handleExportData}>
            Export Data
          </button>
        </div>
      </div>

      {/* Player Management Table */}
      {showPlayerManagement && (
        <div className="modal-overlay" onClick={() => setShowPlayerManagement(false)}>
          <div className="modal extra-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Player Management ({filteredPlayers.length} of {appData.players.length})</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowPlayerManagement(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="table-controls">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search players by name or mobile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <button className="btn primary" onClick={handleAddNewPlayer}>
                  Add New Player
                </button>
              </div>
              
              {filteredPlayers.length === 0 ? (
                <div className="no-players">
                  <p>No players found. {searchTerm ? 'Try adjusting your search.' : 'Add your first player to get started.'}</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="player-table">
                    <thead>
                      <tr>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Nickname</th>
                        <th>Mobile</th>
                        <th>Regular</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Empty row for adding new player */}
                      <tr className="new-player-row">
                        <td>
                          <input
                            type="text"
                            placeholder="First name"
                            value={newPlayerData.firstName}
                            onChange={(e) => setNewPlayerData(prev => ({...prev, firstName: e.target.value}))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddNewPlayer();
                            }}
                            className="inline-edit new-player-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Last name"
                            value={newPlayerData.lastName}
                            onChange={(e) => setNewPlayerData(prev => ({...prev, lastName: e.target.value}))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddNewPlayer();
                            }}
                            className="inline-edit new-player-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Nickname"
                            value={newPlayerData.nickname}
                            onChange={(e) => setNewPlayerData(prev => ({...prev, nickname: e.target.value}))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddNewPlayer();
                            }}
                            className="inline-edit new-player-input"
                          />
                        </td>
                        <td>
                          <input
                            type="tel"
                            placeholder="Mobile number"
                            value={newPlayerData.mobile}
                            onChange={(e) => setNewPlayerData(prev => ({...prev, mobile: e.target.value}))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddNewPlayer();
                            }}
                            className="inline-edit new-player-input"
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={newPlayerData.regular}
                            onChange={(e) => setNewPlayerData(prev => ({...prev, regular: e.target.checked}))}
                            className="regular-checkbox"
                          />
                        </td>
                        <td>
                          <button 
                            className="btn primary small" 
                            onClick={handleNewPlayerSave}
                            disabled={!isNewPlayerDataChanged()}
                          >
                            Save Player
                          </button>
                        </td>
                      </tr>
                      {filteredPlayers.map(player => (
                        <tr key={player.id}>
                          <td>
                            {editingPlayer?.playerId === player.id && editingPlayer?.field === 'firstName' ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handlePlayerSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePlayerSave();
                                  if (e.key === 'Escape') setEditingPlayer(null);
                                  if (e.key === 'Tab') {
                                    e.preventDefault();
                                    handlePlayerTabToNext(player.id, 'firstName', 'lastName');
                                  }
                                }}
                                className="inline-edit"
                                autoFocus
                              />
                            ) : (
                              <span 
                                className="editable-cell"
                                onClick={() => handlePlayerEdit(player.id, 'firstName', player.firstName)}
                              >
                                {player.firstName}
                              </span>
                            )}
                          </td>
                          <td>
                            {editingPlayer?.playerId === player.id && editingPlayer?.field === 'lastName' ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handlePlayerSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePlayerSave();
                                  if (e.key === 'Escape') setEditingPlayer(null);
                                  if (e.key === 'Tab') {
                                    e.preventDefault();
                                    handlePlayerTabToNext(player.id, 'lastName', 'nickname');
                                  }
                                }}
                                className="inline-edit"
                                autoFocus
                              />
                            ) : (
                              <span 
                                className="editable-cell"
                                onClick={() => handlePlayerEdit(player.id, 'lastName', player.lastName || '')}
                              >
                                {player.lastName || <span className="placeholder">Add last name</span>}
                              </span>
                            )}
                          </td>
                          <td>
                            {editingPlayer?.playerId === player.id && editingPlayer?.field === 'nickname' ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handlePlayerSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePlayerSave();
                                  if (e.key === 'Escape') setEditingPlayer(null);
                                  if (e.key === 'Tab') {
                                    e.preventDefault();
                                    handlePlayerTabToNext(player.id, 'nickname', 'mobile');
                                  }
                                }}
                                className="inline-edit"
                                autoFocus
                              />
                            ) : (
                              <span 
                                className="editable-cell"
                                onClick={() => handlePlayerEdit(player.id, 'nickname', player.nickname || '')}
                              >
                                {player.nickname || <span className="placeholder">Add nickname</span>}
                              </span>
                            )}
                          </td>
                          <td>
                            {editingPlayer?.playerId === player.id && editingPlayer?.field === 'mobile' ? (
                              <input
                                type="tel"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handlePlayerSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePlayerSave();
                                  if (e.key === 'Escape') setEditingPlayer(null);
                                  if (e.key === 'Tab') {
                                    e.preventDefault();
                                    // Move to next row's firstName or end editing
                                    const playerIndex = appData.players.findIndex(p => p.id === player.id);
                                    if (playerIndex < appData.players.length - 1) {
                                      const nextPlayer = appData.players[playerIndex + 1];
                                      handlePlayerTabToNext(player.id, 'mobile', 'firstName', nextPlayer.id);
                                    } else {
                                      handlePlayerSave();
                                      setEditingPlayer(null);
                                    }
                                  }
                                }}
                                className="inline-edit"
                                autoFocus
                              />
                            ) : (
                              <span 
                                className="editable-cell"
                                onClick={() => handlePlayerEdit(player.id, 'mobile', player.mobile)}
                              >
                                {player.mobile || <span className="placeholder">Add mobile</span>}
                              </span>
                            )}
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={player.regular || false}
                              onChange={(e) => {
                                const updatedPlayers = appData.players.map(p => 
                                  p.id === player.id ? { ...p, regular: e.target.checked } : p
                                );
                                onAppDataUpdate({ ...appData, players: updatedPlayers });
                              }}
                              className="regular-checkbox"
                            />
                          </td>
                          <td>
                            <button 
                              className="btn danger small" 
                              onClick={() => handleDeletePlayer(player.id)}
                              aria-label={`Delete ${player.firstName} ${player.lastName}`}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn secondary" 
                onClick={() => setShowPlayerManagement(false)}
              >
                Close
              </button>
              <span className="footer-text">Click any cell to edit • All changes are saved automatically</span>
            </div>
          </div>
        </div>
      )}

      {/* Match Creation Form */}
      {showMatchForm && (
        <div className="quick-form">
          <h3>Create {showMatchForm === 'saturday' ? 'Saturday' : 'Sunday'} Match</h3>
          
          {/* Club and Cost Row */}
          <div className="form-row match-form-row">
            <div className="cost-input-group">
              <label>Club</label>
              <select
                value={matchForm.club}
                onChange={(e) => setMatchForm({...matchForm, club: e.target.value as 'MICC' | 'Sadhooz'})}
                className="club-select"
              >
                <option value="MICC">MICC</option>
                <option value="Sadhooz">Sadhooz</option>
              </select>
            </div>
            <div className="cost-input-group">
              <label>Ground Cost</label>
              <input
                type="number"
                placeholder="Ground Cost"
                value={matchForm.groundCost}
                onChange={(e) => setMatchForm({...matchForm, groundCost: e.target.value})}
              />
            </div>
            <div className="cost-input-group">
              <label>Cafeteria Cost</label>
              <input
                type="number"
                placeholder="Cafeteria Cost"
                value={matchForm.cafeteriaCost}
                onChange={(e) => setMatchForm({...matchForm, cafeteriaCost: e.target.value})}
              />
            </div>
          </div>

          {/* Player Selection */}
          <div className="player-selection-section">
            <h4 className="selection-title">Select Players:</h4>
            
            <div className="player-groups-container-aligned">
              {/* Regular Players */}
              {(() => {
                const regularPlayers = appData.players.filter(p => p.regular);
                return regularPlayers.length > 0 ? (
                  <div className="player-group-aligned">
                    <div className="group-header">
                      <h5>Regular Players</h5>
                      <div className="group-actions">
                        <button 
                          className="btn-compact" 
                          onClick={() => {
                            const regularPlayerIds = regularPlayers.map(p => p.id);
                            const uniqueIds = Array.from(new Set([...matchForm.selectedPlayers, ...regularPlayerIds]));
                            setMatchForm({...matchForm, selectedPlayers: uniqueIds});
                          }}
                        >
                          Select All
                        </button>
                        <button 
                          className="btn-compact" 
                          onClick={() => {
                            const regularPlayerIds = regularPlayers.map(p => p.id);
                            setMatchForm({...matchForm, selectedPlayers: matchForm.selectedPlayers.filter(id => !regularPlayerIds.includes(id))});
                          }}
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                    <div className="player-list">
                      {regularPlayers.map(player => (
                        <label key={player.id} className="player-item">
                          <input
                            type="checkbox"
                            checked={matchForm.selectedPlayers.includes(player.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMatchForm({...matchForm, selectedPlayers: [...matchForm.selectedPlayers, player.id]});
                              } else {
                                setMatchForm({...matchForm, selectedPlayers: matchForm.selectedPlayers.filter(id => id !== player.id)});
                              }
                            }}
                          />
                          <span className="player-name">{getPlayerDisplayName(player)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Additional Players */}
              {(() => {
                const additionalPlayers = appData.players.filter(p => !p.regular);
                return additionalPlayers.length > 0 ? (
                  <div className="player-group-aligned">
                    <div className="group-header">
                      <h5>Other Players</h5>
                      <div className="group-actions">
                        <button 
                          className="btn-compact" 
                          onClick={() => {
                            const additionalPlayerIds = additionalPlayers.map(p => p.id);
                            const uniqueIds = Array.from(new Set([...matchForm.selectedPlayers, ...additionalPlayerIds]));
                            setMatchForm({...matchForm, selectedPlayers: uniqueIds});
                          }}
                        >
                          Select All
                        </button>
                        <button 
                          className="btn-compact" 
                          onClick={() => {
                            const additionalPlayerIds = additionalPlayers.map(p => p.id);
                            setMatchForm({...matchForm, selectedPlayers: matchForm.selectedPlayers.filter(id => !additionalPlayerIds.includes(id))});
                          }}
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                    <div className="player-list">
                      {additionalPlayers.map(player => (
                        <label key={player.id} className="player-item">
                          <input
                            type="checkbox"
                            checked={matchForm.selectedPlayers.includes(player.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMatchForm({...matchForm, selectedPlayers: [...matchForm.selectedPlayers, player.id]});
                              } else {
                                setMatchForm({...matchForm, selectedPlayers: matchForm.selectedPlayers.filter(id => id !== player.id)});
                              }
                            }}
                          />
                          <span className="player-name">{getPlayerDisplayName(player)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="selection-summary-compact">
              Selected: {matchForm.selectedPlayers.length} players
            </div>
          </div>

          <div className="form-row">
            <button 
              className="btn-small primary" 
              onClick={() => handleCreateMatch(showMatchForm)}
              disabled={matchForm.selectedPlayers.length === 0}
            >
              Create Match
            </button>
            <button className="btn-small secondary" onClick={() => setShowMatchForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Match Setup Cards */}
      <div className="match-setup-section">
        <div className="match-cards">
          {/* Saturday Match */}
          <div className="match-card compact">
            <div className="match-header">
              <h3>Saturday - MICC</h3>
              <span className="match-date">{currentWeekend && formatDate(currentWeekend.startDate, 'saturday')}</span>
            </div>
            {currentWeekend?.saturdayMatch ? (
              <div className="match-summary">
                <p>Players: {currentWeekend.saturdayMatch.playerIds.length}</p>
                <p>Cost: ₹{currentWeekend.saturdayMatch.groundCost + currentWeekend.saturdayMatch.cafeteriaCost}</p>
                <p>Per Player: ₹{calculateMatchCostPerPlayer(currentWeekend.saturdayMatch)}</p>
                <div className="match-actions">
                  <button 
                    className="btn-small secondary"
                    onClick={() => handleEditMatch('saturday')}
                  >
                    Edit Match
                  </button>
                  <button 
                    className="btn-small danger"
                    onClick={() => handleDeleteMatch('saturday')}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-match">
                <p>No match created</p>
                <button 
                  className="btn-small primary"
                  onClick={() => setShowMatchForm('saturday')}
                >
                  Create Saturday Match
                </button>
              </div>
            )}
          </div>

          {/* Sunday Match */}
          <div className="match-card compact">
            <div className="match-header">
              <h3>Sunday - Sadhooz</h3>
              <span className="match-date">{currentWeekend && formatDate(currentWeekend.startDate, 'sunday')}</span>
            </div>
            {currentWeekend?.sundayMatch ? (
              <div className="match-summary">
                <p>Players: {currentWeekend.sundayMatch.playerIds.length}</p>
                <p>Cost: ₹{currentWeekend.sundayMatch.groundCost + currentWeekend.sundayMatch.cafeteriaCost}</p>
                <p>Per Player: ₹{calculateMatchCostPerPlayer(currentWeekend.sundayMatch)}</p>
                <div className="match-actions">
                  <button 
                    className="btn-small secondary"
                    onClick={() => handleEditMatch('sunday')}
                  >
                    Edit Match
                  </button>
                  <button 
                    className="btn-small danger"
                    onClick={() => handleDeleteMatch('sunday')}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-match">
                <p>No match created</p>
                <button 
                  className="btn-small primary"
                  onClick={() => setShowMatchForm('sunday')}
                >
                  Create Sunday Match
                </button>
              </div>
            )}
          </div>

          {/* Payment Status Summary */}
          <div className="status-summary-card">
            <h3>Payment Status</h3>
            <div className="status-grid">
              <div className="status-item pending">
                <span className="count">{pendingCount}</span>
                <span className="label">Pending</span>
              </div>
              <div className="status-item partial">
                <span className="count">{partialCount}</span>
                <span className="label">Partial</span>
              </div>
              <div className="status-item paid">
                <span className="count">{paidCount}</span>
                <span className="label">Paid</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Payment Table */}
      <div className="payment-section">
        <div className="section-header">
          <h2>Payment Overview</h2>
          <p className="help-text">Click Total Due amount to edit • Click status button to toggle payment status • Overpayments show negative balance with Paid status</p>
        </div>

        <div className="payment-table-wrapper">
          <table className="payment-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Prev Balance</th>
                <th>Weekend Due<br/><small>{currentWeekend && formatDate(currentWeekend.startDate, 'saturday')} - {currentWeekend && formatDate(currentWeekend.startDate, 'sunday')}</small></th>
                <th>Total Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {playerRows.map(row => (
                <tr key={row.player.id} className={`player-row status-${row.status}`}>
                  <td className="player-name">
                    <strong>{getPlayerDisplayName(row.player)}</strong>
                  </td>
                  <td className={`amount ${row.prevBalance > 0 ? 'due' : row.prevBalance < 0 ? 'overpaid' : ''}`}>
                    {row.prevBalance !== 0 && `₹${Math.abs(row.prevBalance)}`}
                  </td>
                  <td className="weekend-due">
                    {row.totalDue > 0 ? `₹${row.totalDue}` : '-'}
                  </td>
                  <td className={`total ${row.currentBalance > 0 ? 'due' : row.currentBalance < 0 ? 'overpaid' : ''}`}>
                    <div className="total-payment">
                      {editingCell?.playerId === row.player.id && editingCell?.field === 'totalDue' ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleTotalDueSave(row.player.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTotalDueSave(row.player.id);
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className="payment-input"
                          autoFocus
                        />
                      ) : (
                        <strong
                          className="amount editable"
                          onClick={() => handleTotalDueEdit(row.player.id)}
                          title="Click to edit total due amount"
                        >
                          {row.currentBalance > 0 && `₹${row.currentBalance}`}
                          {row.currentBalance < 0 && `-₹${Math.abs(row.currentBalance)}`}
                          {row.currentBalance === 0 && '₹0'}
                        </strong>
                      )}
                      <button 
                        className={`status-btn ${row.status}`}
                        onClick={() => handleOverallPaymentToggle(row.player.id)}
                        title="Mark all payments as paid/unpaid"
                      >
                        {row.status === 'paid' ? '✓' : 
                         row.status === 'partial' ? '◐' : '○'}
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${row.status}`}>
                      {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ConsolidatedDashboard;