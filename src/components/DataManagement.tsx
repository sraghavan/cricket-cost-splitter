import React, { useRef } from 'react';
import { AppData } from '../types';
import { exportData, importData } from '../utils/storage';

interface DataManagementProps {
  appData: AppData;
  onDataImport: (data: AppData) => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ appData, onDataImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.removeItem('cricket-cost-splitter-data');
      window.location.reload();
    }
  };

  return (
    <div className="data-management">
      <h3>Data Management</h3>
      
      <div className="data-actions">
        <button className="btn btn-success" onClick={handleExport}>
          Export Data
        </button>
        
        <button className="btn btn-primary" onClick={triggerImport}>
          Import Data
        </button>
        
        <button className="btn btn-danger" onClick={clearAllData}>
          Clear All Data
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />

      <div className="data-info">
        <p>Total Players: {appData.players.length}</p>
        <p>Total Weekends: {appData.weekends.length}</p>
        <p>Current Weekend: {appData.weekends.find(w => w.id === appData.currentWeekendId)?.startDate || 'N/A'}</p>
      </div>
    </div>
  );
};

export default DataManagement;