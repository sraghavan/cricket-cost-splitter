export interface Player {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  mobile: string;
  balance: number; // positive = owes money, negative = overpaid
  arrears?: number; // outstanding dues from previous periods
  advancePayment?: number; // advance payments made
  regular?: boolean; // true if regular player, false/undefined for additional players
}

export interface Match {
  id: string;
  date: string;
  club: 'MICC' | 'Sadhooz';
  type: 'Saturday' | 'Sunday' | 'Weekday';
  groundCost: number;
  cafeteriaCost: number;
  playerIds: string[];
  payments: Payment[];
}

export interface Payment {
  id: string;
  playerId: string;
  matchId: string;
  amountDue: number;
  amountPaid: number;
  status: 'paid' | 'pending' | 'partial';
  date: string;
}

export interface Weekend {
  id: string;
  startDate: string; // Saturday date
  saturdayMatch?: Match;
  sundayMatch?: Match;
  weekdayMatches: Match[];
}

export interface AppData {
  players: Player[];
  weekends: Weekend[];
  currentWeekendId: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'partial';