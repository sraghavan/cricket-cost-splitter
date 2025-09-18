import React, { useRef } from 'react';
import { AppData, Player } from '../types';
import { exportData, importData } from '../utils/storage';

interface DataManagementProps {
  appData: AppData;
  onDataImport: (data: AppData) => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ appData, onDataImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playerFileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataString = exportData();
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `cricket-cost-splitter-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPlayers = () => {
    const playersData = {
      players: appData.players,
      exportDate: new Date().toISOString(),
      exportType: 'players-only'
    };
    const dataString = JSON.stringify(playersData, null, 2);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `cricket-players-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const importedData = importData(jsonString);
        onDataImport(importedData);
        alert('Data imported successfully!');
      } catch (error) {
        alert('Error importing data. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportPlayers = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const importedPlayerData = JSON.parse(jsonString);
        
        let playersToImport: Player[] = [];
        
        // Handle different formats
        if (importedPlayerData.players && Array.isArray(importedPlayerData.players)) {
          // Player-only export format
          playersToImport = importedPlayerData.players;
        } else if (Array.isArray(importedPlayerData)) {
          // Direct array of players
          playersToImport = importedPlayerData;
        } else if (importedPlayerData.players && Array.isArray(importedPlayerData.players)) {
          // Full app data format - extract players
          playersToImport = importedPlayerData.players;
        } else {
          throw new Error('Invalid player data format');
        }

        // Validate player data structure
        const validPlayers = playersToImport.filter(player => 
          player.id && player.firstName && player.mobile
        );

        if (validPlayers.length === 0) {
          throw new Error('No valid players found in the file');
        }

        // Merge with existing players (avoid duplicates by ID)
        const existingPlayerIds = new Set(appData.players.map(p => p.id));
        const newPlayers = validPlayers.filter(player => !existingPlayerIds.has(player.id));
        const updatedPlayers = [...appData.players, ...newPlayers];

        // Update app data with new players
        const updatedAppData: AppData = {
          ...appData,
          players: updatedPlayers
        };

        onDataImport(updatedAppData);
        alert(`Successfully imported ${newPlayers.length} new players! (${validPlayers.length - newPlayers.length} duplicates skipped)`);
      } catch (error) {
        alert('Error importing player data. Please check the file format.');
        console.error('Player import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (playerFileInputRef.current) {
      playerFileInputRef.current.value = '';
    }
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const triggerPlayerImport = () => {
    playerFileInputRef.current?.click();
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.removeItem('cricket-cost-splitter-data');
      window.location.reload();
    }
  };

  const cleanPlayerData = () => {
    if (window.confirm('Are you sure you want to clean player data? This will reset all arrears, advance payments, and balances to 0 but keep player names and matches.')) {
      const cleanedPlayers = appData.players.map(player => ({
        ...player,
        balance: 0,
        arrears: 0,
        advancePayment: 0
      }));
      
      const cleanedData = {
        ...appData,
        players: cleanedPlayers
      };
      
      onDataImport(cleanedData);
      alert('Player data has been cleaned successfully!');
    }
  };

  return (
    <div className="data-management">
      <h3>Data Management</h3>
      
      <div className="data-section">
        <h4>Full Data Backup</h4>
        <div className="data-actions">
          <button className="btn btn-success" onClick={handleExport}>
            📥 Export All Data
          </button>
          
          <button className="btn btn-primary" onClick={triggerImport}>
            📤 Import All Data
          </button>
        </div>
        <p className="help-text">Export/Import complete application data including players, matches, and payments.</p>
      </div>

      <div className="data-section">
        <h4>Players Only</h4>
        <div className="data-actions">
          <button className="btn btn-success" onClick={handleExportPlayers}>
            👥 Export Players
          </button>
          
          <button className="btn btn-primary" onClick={triggerPlayerImport}>
            👥 Import Players
          </button>
        </div>
        <p className="help-text">Export/Import only player data (names, mobile numbers, balances). Perfect for sharing player lists between devices.</p>
      </div>

      <div className="data-section">
        <h4>Danger Zone</h4>
        <div className="data-actions">
          <button className="btn btn-warning" onClick={cleanPlayerData}>
            🧹 Clean Player Data
          </button>
          <button className="btn btn-danger" onClick={clearAllData}>
            🗑️ Clear All Data
          </button>
        </div>
        <p className="help-text">⚠️ Clear All Data will permanently delete everything. Clean Player Data will reset balances/arrears but keep players and matches.</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />

      <input
        ref={playerFileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportPlayers}
      />

      <div className="data-info">
        <h4>Current Data Summary</h4>
        <p>Total Players: <strong>{appData.players.length}</strong></p>
        <p>Regular Players: <strong>{appData.players.filter(p => p.regular).length}</strong></p>
        <p>Additional Players: <strong>{appData.players.filter(p => !p.regular).length}</strong></p>
        <p>Total Weekends: <strong>{appData.weekends.length}</strong></p>
        <p>Current Weekend: <strong>{appData.weekends.find(w => w.id === appData.currentWeekendId)?.startDate || 'N/A'}</strong></p>
      </div>
    </div>
  );
};

export default DataManagement;