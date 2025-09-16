import React from 'react';
import { Weekend, Player, Match } from '../types';
import MatchCard from './MatchCard';
import { addDays, format, parse } from 'date-fns';

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

interface WeekendDashboardProps {
  weekend: Weekend;
  players: Player[];
  onWeekendUpdate: (weekend: Weekend) => void;
  onNextWeekend: () => void;
}

const WeekendDashboard: React.FC<WeekendDashboardProps> = ({ 
  weekend, 
  players, 
  onWeekendUpdate, 
  onNextWeekend 
}) => {
  const handleMatchUpdate = (match: Match) => {
    let updatedWeekend = { ...weekend };
    
    if (match.type === 'Saturday') {
      updatedWeekend.saturdayMatch = match;
    } else if (match.type === 'Sunday') {
      updatedWeekend.sundayMatch = match;
    } else {
      // Weekday match
      const existingIndex = updatedWeekend.weekdayMatches.findIndex(m => m.id === match.id);
      if (existingIndex >= 0) {
        updatedWeekend.weekdayMatches[existingIndex] = match;
      } else {
        updatedWeekend.weekdayMatches.push(match);
      }
    }
    
    onWeekendUpdate(updatedWeekend);
  };

  const addWeekdayMatch = () => {
    const today = new Date();
    const newMatch: Match = {
      id: generateUUID(),
      date: format(today, 'yyyy-MM-dd'),
      club: 'MICC', // Default to MICC
      type: 'Weekday',
      groundCost: 0,
      cafeteriaCost: 0,
      playerIds: [],
      payments: []
    };
    
    const updatedWeekend = {
      ...weekend,
      weekdayMatches: [...weekend.weekdayMatches, newMatch]
    };
    
    onWeekendUpdate(updatedWeekend);
  };

  const removeWeekdayMatch = (matchId: string) => {
    const updatedWeekend = {
      ...weekend,
      weekdayMatches: weekend.weekdayMatches.filter(m => m.id !== matchId)
    };
    onWeekendUpdate(updatedWeekend);
  };

  const getSaturdayDate = () => {
    return weekend.startDate;
  };

  const getSundayDate = () => {
    const saturday = parse(weekend.startDate, 'yyyy-MM-dd', new Date());
    return format(addDays(saturday, 1), 'yyyy-MM-dd');
  };

  const formatWeekendTitle = () => {
    const saturday = parse(weekend.startDate, 'yyyy-MM-dd', new Date());
    const sunday = addDays(saturday, 1);
    return `${format(saturday, 'MMM dd')} - ${format(sunday, 'MMM dd, yyyy')}`;
  };

  return (
    <div className="weekend-dashboard">
      <div className="weekend-header">
        <h2>Weekend: {formatWeekendTitle()}</h2>
        <button className="btn btn-primary" onClick={onNextWeekend}>
          Go to Next Weekend
        </button>
      </div>

      <div className="weekend-matches">
        <div className="main-matches">
          <MatchCard
            match={weekend.saturdayMatch}
            players={players}
            onMatchUpdate={handleMatchUpdate}
            matchDate={getSaturdayDate()}
            matchType="Saturday"
            club="MICC"
          />
          
          <MatchCard
            match={weekend.sundayMatch}
            players={players}
            onMatchUpdate={handleMatchUpdate}
            matchDate={getSundayDate()}
            matchType="Sunday"
            club="Sadhooz"
          />
        </div>

        <div className="weekday-matches">
          <div className="weekday-header">
            <h3>Weekday Matches</h3>
            <button className="btn btn-small" onClick={addWeekdayMatch}>
              Add Weekday Match
            </button>
          </div>
          
          {weekend.weekdayMatches.length === 0 ? (
            <p className="no-matches">No weekday matches added</p>
          ) : (
            <div className="weekday-matches-grid">
              {weekend.weekdayMatches.map(match => (
                <div key={match.id} className="weekday-match-container">
                  <MatchCard
                    match={match}
                    players={players}
                    onMatchUpdate={handleMatchUpdate}
                    matchDate={match.date}
                    matchType="Weekday"
                    club={match.club}
                  />
                  <button 
                    className="btn btn-small btn-danger remove-match"
                    onClick={() => removeWeekdayMatch(match.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeekendDashboard;