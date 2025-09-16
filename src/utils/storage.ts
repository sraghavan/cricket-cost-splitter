import { AppData, Player, Weekend } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfWeek, addDays } from 'date-fns';

const STORAGE_KEY = 'cricket-cost-splitter-data';

export const getInitialData = (): AppData => {
  const currentWeekend = getCurrentWeekend();
  return {
    players: getSamplePlayers(),
    weekends: [currentWeekend],
    currentWeekendId: currentWeekend.id
  };
};

export const loadData = (): AppData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
  }
  return getInitialData();
};

export const saveData = (data: AppData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
  }
};

export const exportData = (): string => {
  const data = loadData();
  return JSON.stringify(data, null, 2);
};

export const importData = (jsonString: string): AppData => {
  try {
    const data = JSON.parse(jsonString);
    saveData(data);
    return data;
  } catch (error) {
    console.error('Error importing data:', error);
    throw new Error('Invalid data format');
  }
};

export const getCurrentWeekend = (): Weekend => {
  const now = new Date();
  const saturday = startOfWeek(now, { weekStartsOn: 6 }); // Saturday start
  
  return {
    id: uuidv4(),
    startDate: format(saturday, 'yyyy-MM-dd'),
    weekdayMatches: []
  };
};

export const getNextWeekend = (currentWeekend: Weekend): Weekend => {
  const currentSaturday = new Date(currentWeekend.startDate);
  const nextSaturday = addDays(currentSaturday, 7);
  
  return {
    id: uuidv4(),
    startDate: format(nextSaturday, 'yyyy-MM-dd'),
    weekdayMatches: []
  };
};

export const getSamplePlayers = (): Player[] => [
  { id: uuidv4(), firstName: 'Sai', lastName: 'Ragha', mobile: '9999999999', balance: 0 },
  { id: uuidv4(), firstName: 'Rahul', lastName: 'Sharma', mobile: '8888888888', balance: 0 },
  { id: uuidv4(), firstName: 'Amit', lastName: 'Patel', mobile: '7777777777', balance: 0 },
  { id: uuidv4(), firstName: 'Vikas', lastName: '', mobile: '6666666666', balance: 0 },
  { id: uuidv4(), firstName: 'Rohit', lastName: 'Singh', mobile: '5555555555', balance: 0 }
];