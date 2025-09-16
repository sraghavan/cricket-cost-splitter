import React, { useState, useEffect } from 'react';
import { AppData } from './types';
import { loadData, saveData } from './utils/storage';
import ConsolidatedDashboard from './components/ConsolidatedDashboard';
import './App.css';

function App() {
  const [appData, setAppData] = useState<AppData>(() => loadData());

  useEffect(() => {
    saveData(appData);
  }, [appData]);

  return (
    <div className="App">
      <ConsolidatedDashboard 
        appData={appData}
        onAppDataUpdate={setAppData}
      />
    </div>
  );
}

export default App;
