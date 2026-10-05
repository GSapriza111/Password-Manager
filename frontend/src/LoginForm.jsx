import { useState } from 'react';
import { deriveMasterKey, splitKeys, bufferToHex, hexToBuffer } from './cryptoService';
import {useVault} from './VaultContext';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const {unlockVault} = useVault();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      // Step 1: Fetch the user's specific cryptographic salt (or a fake one)
      const saltResponse = await fetch('http://127.0.0.1:5000/api/salt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const saltData = await saltResponse.json();

      if (!saltResponse.ok) {
        throw new Error(saltData.error || 'Network error');
      }

      // Step 2: The Cryptographic Engine (Rebuilding the keys)
      const saltBuffer = hexToBuffer(saltData.salt);
      const masterKey = await deriveMasterKey(password, saltBuffer);
      const { authKey, encryptionKey } = await splitKeys(masterKey);

      const hexAuthKey = bufferToHex(authKey);

      // Step 3: The Authentication Challenge
      const loginResponse = await fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email, 
          auth_verifier: hexAuthKey 
        })
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginData.error || 'Invalid credentials');
      }

      console.log("Success:", loginData.message);
      // NOTE: encryptionKey is now successfully rebuilt!
      // We will move this into a global React Context state next.

      if (!loginResponse.ok){
        throw new Error(loginData.error || 'Invalid credentials');
      }
      console.log("Success", loginData.message);
      unlockVault(encryptionKey)

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      // CRITICAL: Wipe the plaintext password from memory
      setPassword('');
    }
  };

  return (
    <div className="login-container">
      <h2>Unlock Master Vault</h2>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
      
      <form onSubmit={handleLogin} autoComplete="off">
        <div>
          <label>Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>

        <div>
          <label>Master Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required 
          />
        </div>

        <button type="submit">Unlock Vault</button>
      </form>
    </div>
  );
}