import { useState } from 'react';
import { useVault } from './VaultContext';
import { encryptVaultItem } from './cryptoService';

export default function VaultDashboard({ userEmail }) {
  const { encryptionKey, lockVault } = useVault();
  const [plaintextSecret, setPlaintextSecret] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const handleSaveSecret = async (e) => {
    e.preventDefault();
    setStatusMsg('Encrypting...');

    try {
      // 1. Encrypt locally. The plaintext never touches the network.
      const { ciphertext, iv, auth_tag } = await encryptVaultItem(plaintextSecret, encryptionKey);

      // 2. Send the encrypted blobs to the server
      const response = await fetch('http://127.0.0.1:5000/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail, // In a real app, use a session token/JWT here
          ciphertext,
          iv,
          auth_tag
        })
      });

      if (!response.ok) throw new Error('Failed to save to database');
      
      setStatusMsg('Secret secured in database.');
      setPlaintextSecret('');
    } catch (error) {
      setStatusMsg(error.message);
    }
  };

  return (
    <div className="vault-dashboard">
      <h2>Active Vault: {userEmail}</h2>
      <button onClick={lockVault} style={{ background: 'red', color: 'white' }}>
        Lock Vault & Purge Memory
      </button>

      <form onSubmit={handleSaveSecret} style={{ marginTop: '20px' }}>
        <div>
          <label>New Secret</label>
          <input 
            type="text" 
            value={plaintextSecret}
            onChange={(e) => setPlaintextSecret(e.target.value)}
            required 
          />
        </div>
        <button type="submit">Encrypt & Save</button>
      </form>
      {statusMsg && <p>{statusMsg}</p>}
    </div>
  );
}