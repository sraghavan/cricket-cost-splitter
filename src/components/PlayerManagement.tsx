import React, { useState } from 'react';
import { Player } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PlayerManagementProps {
  players: Player[];
  onPlayersUpdate: (players: Player[]) => void;
}

const PlayerManagement: React.FC<PlayerManagementProps> = ({ players, onPlayersUpdate }) => {
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    firstName: '',
    lastName: '',
    mobile: ''
  });

  const handleAddPlayer = () => {
    if (newPlayer.firstName.trim() && newPlayer.mobile.trim()) {
      const player: Player = {
        id: uuidv4(),
        firstName: newPlayer.firstName.trim(),
        lastName: newPlayer.lastName.trim() || undefined,
        mobile: newPlayer.mobile.trim(),
        balance: 0
      };
      
      onPlayersUpdate([...players, player]);
      setNewPlayer({ firstName: '', lastName: '', mobile: '' });
      setShowAddForm(false);
    }
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer({ ...player });
  };

  const handleSaveEdit = () => {
    if (editingPlayer && editingPlayer.firstName.trim() && editingPlayer.mobile.trim()) {
      const updatedPlayers = players.map(p => 
        p.id === editingPlayer.id ? editingPlayer : p
      );
      onPlayersUpdate(updatedPlayers);
      setEditingPlayer(null);
    }
  };

  const handleDeletePlayer = (playerId: string) => {
    if (window.confirm('Are you sure you want to delete this player?')) {
      const updatedPlayers = players.filter(p => p.id !== playerId);
      onPlayersUpdate(updatedPlayers);
    }
  };

  const formatPlayerName = (player: Player) => {
    return player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName;
  };

  const getBalanceClass = (balance: number) => {
    if (balance > 0) return 'text-red-600'; // Owes money
    if (balance < 0) return 'text-green-600'; // Overpaid
    return 'text-gray-600'; // Even
  };

  const formatBalance = (balance: number) => {
    if (balance > 0) return `Owes ₹${balance}`;
    if (balance < 0) return `Overpaid ₹${Math.abs(balance)}`;
    return 'Even';
  };

  return (
    <div className="player-management">
      <div className="header">
        <h2>Player Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Player'}
        </button>
      </div>

      {showAddForm && (
        <div className="add-player-form">
          <h3>Add New Player</h3>
          <div className="form-row">
            <input
              type="text"
              placeholder="First Name *"
              value={newPlayer.firstName}
              onChange={(e) => setNewPlayer({...newPlayer, firstName: e.target.value})}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={newPlayer.lastName}
              onChange={(e) => setNewPlayer({...newPlayer, lastName: e.target.value})}
            />
          </div>
          <input
            type="tel"
            placeholder="Mobile Number *"
            value={newPlayer.mobile}
            onChange={(e) => setNewPlayer({...newPlayer, mobile: e.target.value})}
          />
          <div className="form-actions">
            <button className="btn btn-success" onClick={handleAddPlayer}>
              Add Player
            </button>
            <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="players-list">
        {players.map(player => (
          <div key={player.id} className="player-card">
            {editingPlayer?.id === player.id ? (
              <div className="edit-form">
                <div className="form-row">
                  <input
                    type="text"
                    value={editingPlayer.firstName}
                    onChange={(e) => setEditingPlayer({...editingPlayer, firstName: e.target.value})}
                  />
                  <input
                    type="text"
                    value={editingPlayer.lastName || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, lastName: e.target.value})}
                  />
                </div>
                <input
                  type="tel"
                  value={editingPlayer.mobile}
                  onChange={(e) => setEditingPlayer({...editingPlayer, mobile: e.target.value})}
                />
                <div className="form-actions">
                  <button className="btn btn-success" onClick={handleSaveEdit}>
                    Save
                  </button>
                  <button className="btn btn-secondary" onClick={() => setEditingPlayer(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="player-info">
                <div className="player-details">
                  <h4>{formatPlayerName(player)}</h4>
                  <p>Mobile: {player.mobile}</p>
                  <p className={getBalanceClass(player.balance)}>
                    {formatBalance(player.balance)}
                  </p>
                </div>
                <div className="player-actions">
                  <button className="btn btn-small" onClick={() => handleEditPlayer(player)}>
                    Edit
                  </button>
                  <button className="btn btn-small btn-danger" onClick={() => handleDeletePlayer(player.id)}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerManagement;