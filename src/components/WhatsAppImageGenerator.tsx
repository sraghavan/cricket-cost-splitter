import React, { useRef } from 'react';
import { AppData, Player, Match, Weekend } from '../types';
import { getPlayerPayment } from '../utils/calculations';
import { format, parse, addDays } from 'date-fns';
import html2canvas from 'html2canvas';

interface WhatsAppImageGeneratorProps {
  appData: AppData;
}

const WhatsAppImageGenerator: React.FC<WhatsAppImageGeneratorProps> = ({ appData }) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const getCurrentWeekend = (): Weekend | undefined => {
    return appData.weekends.find(w => w.id === appData.currentWeekendId);
  };

  const getAllMatches = (): Match[] => {
    return appData.weekends.flatMap(weekend => [
      weekend.saturdayMatch,
      weekend.sundayMatch,
      ...weekend.weekdayMatches
    ].filter(Boolean) as Match[]);
  };

  const getWeekendMatches = (weekend: Weekend): Match[] => {
    return [
      weekend.saturdayMatch,
      weekend.sundayMatch,
      ...weekend.weekdayMatches
    ].filter(Boolean) as Match[];
  };

  const getPlayersWithPendingPayments = (matches: Match[]): { player: Player; prevBalance: number; satAmount: number; sunAmount: number; totalDue: number; status: string }[] => {
    const currentWeekend = getCurrentWeekend();
    if (!currentWeekend) return [];

    const playerDataMap: {[playerId: string]: any} = {};

    // Get all players who have any payments or previous balances
    appData.players.forEach(player => {
      // Calculate previous balance
      const previousWeekends = appData.weekends.filter(w => w.id !== currentWeekend.id);
      const previousMatches = previousWeekends.flatMap(w => getWeekendMatches(w));
      
      let prevBalance = player.balance;
      previousMatches.forEach(match => {
        const payment = getPlayerPayment(match, player.id);
        if (payment) {
          prevBalance += (payment.amountPaid - payment.amountDue);
        } else if (match.playerIds.includes(player.id)) {
          const costPerPlayer = (match.groundCost + match.cafeteriaCost) / match.playerIds.length;
          prevBalance += costPerPlayer;
        }
      });

      // Get current weekend payments
      const satPayment = currentWeekend.saturdayMatch ? getPlayerPayment(currentWeekend.saturdayMatch, player.id) : undefined;
      const sunPayment = currentWeekend.sundayMatch ? getPlayerPayment(currentWeekend.sundayMatch, player.id) : undefined;
      
      const satAmount = satPayment ? (satPayment.amountDue - satPayment.amountPaid) : 0;
      const sunAmount = sunPayment ? (sunPayment.amountDue - sunPayment.amountPaid) : 0;
      const totalDue = prevBalance + satAmount + sunAmount;

      // Determine status
      let status = 'Paid';
      const currentPayments = [satPayment, sunPayment].filter(Boolean);
      if (currentPayments.length > 0) {
        if (currentPayments.some(p => p!.status === 'pending')) {
          status = 'Pending';
        } else if (currentPayments.some(p => p!.status === 'partial')) {
          status = 'Partial';
        }
      } else if (totalDue > 0) {
        status = 'Pending';
      }

      // Only include if there are any amounts due or previous balance
      if (totalDue > 0 || prevBalance !== 0 || satAmount > 0 || sunAmount > 0) {
        playerDataMap[player.id] = {
          player,
          prevBalance,
          satAmount,
          sunAmount,
          totalDue,
          status
        };
      }
    });

    return Object.values(playerDataMap).filter((data: any) => data.totalDue > 0);
  };


  const generateImage = async () => {
    if (!canvasRef.current) return;

    const pendingPlayers = getPlayersWithPendingPayments(getAllMatches());

    if (pendingPlayers.length === 0) {
      alert('No players with pending payments found!');
      return;
    }

    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true
      });
      
      // Create download link
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `weekend-cost-update-${new Date().toISOString().split('T')[0]}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Error generating image. Please try again.');
    }
  };

  const currentWeekend = getCurrentWeekend();
  const pendingPlayers = getPlayersWithPendingPayments(getAllMatches());

  const getPlayerName = (player: Player) => {
    return player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName;
  };

  const formatMatchDate = (weekend: Weekend, type: 'saturday' | 'sunday') => {
    try {
      const startDate = parse(weekend.startDate, 'yyyy-MM-dd', new Date());
      const targetDate = type === 'saturday' ? startDate : addDays(startDate, 1);
      return format(targetDate, 'MMM dd');
    } catch {
      return type === 'saturday' ? 'Aug 30' : 'Aug 31';
    }
  };

  const getStatusCounts = () => {
    let pending = 0, partial = 0, paid = 0;
    pendingPlayers.forEach(player => {
      switch(player.status) {
        case 'Pending': pending++; break;
        case 'Partial': partial++; break;
        case 'Paid': paid++; break;
      }
    });
    return { pending, partial, paid };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="whatsapp-generator">
      <h3>WhatsApp Image Generator</h3>
      
      <button className="btn btn-success" onClick={generateImage} disabled={pendingPlayers.length === 0}>
        Generate & Download Weekend Update Image
      </button>

      <div className="preview">
        <div ref={canvasRef} className="weekend-update-image">
          {/* Header */}
          <div className="update-header">
            <div className="header-icon">🏏</div>
            <div className="header-text">Weekend Cost Update</div>
          </div>

          {/* Match Dates */}
          <div className="match-dates">
            {currentWeekend && (
              <span>
                Match Dates: Sat, {formatMatchDate(currentWeekend, 'saturday')} & Sun, {formatMatchDate(currentWeekend, 'sunday')}
              </span>
            )}
          </div>

          {/* Table */}
          <div className="update-table">
            <div className="table-header-row">
              <div className="cell player-col">Player</div>
              <div className="cell prev-col">Prev</div>
              <div className="cell match-col">{currentWeekend && formatMatchDate(currentWeekend, 'saturday')}</div>
              <div className="cell match-col">{currentWeekend && formatMatchDate(currentWeekend, 'sunday')}</div>
              <div className="cell paid-col">Paid</div>
              <div className="cell total-col">Total</div>
              <div className="cell status-col">Status</div>
            </div>

            {pendingPlayers.map((player, index) => (
              <div key={player.player.id} className="table-row">
                <div className="cell player-col">{getPlayerName(player.player)}</div>
                <div className="cell prev-col">
                  {player.prevBalance > 0 ? `₹${player.prevBalance}` : ''}
                </div>
                <div className="cell match-col">
                  {player.satAmount > 0 ? `₹${player.satAmount}` : ''}
                </div>
                <div className="cell match-col">
                  {player.sunAmount > 0 ? `₹${player.sunAmount}` : ''}
                </div>
                <div className="cell paid-col"></div>
                <div className={`cell total-col ${player.totalDue > 0 ? 'amount-due' : ''}`}>
                  {player.totalDue > 0 ? `₹${player.totalDue}` : ''}
                </div>
                <div className={`cell status-col status-${player.status.toLowerCase()}`}>
                  {player.status}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="update-summary">
            <span className="summary-item pending">Pending: {statusCounts.pending}</span>
            <span className="summary-item partial">Partial: {statusCounts.partial}</span>
            <span className="summary-item paid">Paid: {statusCounts.paid}</span>
          </div>

          {/* Footer */}
          <div className="update-footer">
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppImageGenerator;