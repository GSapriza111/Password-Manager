import { useState } from 'react';
import { generateSalt, deriveMasterKey, splitKeys, bufferToHex } from './cryptoService';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setConfirmation] = useState('');
  const [errorMSG, setErrorMsg] = useState('');

 const handleSubmit = async (e) => {
    e.preventDefault(); 
    setErrorMsg('');
    
    try {
      // 1. Validate before doing anything else
      if (password !== passwordConfirmation) {
        setErrorMsg('Passwords do not match.');
        throw new Error('Passwords do not match');
      }

      console.log("Form submitted securely. Commencing cryptography...");
      
      // 2. The Cryptographic Engine (Browser-Side)
      const salt = generateSalt();
      const masterKey = await deriveMasterKey(password, salt);
      const { authKey, encryptionKey } = await splitKeys(masterKey);

      // 3. Network Translation
      const hexSalt = bufferToHex(salt);
      const hexAuthKey = bufferToHex(authKey);

      // 4. The Network Boundary (The Handshake)
      const payload = {
        email: email,
        kdf_salt: hexSalt,
        auth_verifier: hexAuthKey
      };

      const response = await fetch('http://127.0.0.1:5000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // 5. Handle the Server Response
      const data = await response.json();

      if (!response.ok) {
        // This catches our Flask 400 and 409 error messages
        setErrorMsg(data.error || 'Registration failed');
        throw new Error(data.error || 'Registration failed');
      }

      console.log("Success:", data.message);
      // Optional: Redirect the user to the login page here using React Router
      
    } catch (error) {
      console.error("Registration aborted:", error);
    } finally {
      // CRITICAL: Wipe both plaintext passwords from memory immediately
      setPassword('');
      setConfirmation('');
    }
  };

  return (
    <div className="register-container">
      <h2>Create Master Vault</h2>
      {/* autoComplete="off" on the form wrapper disables historical suggestions */}
      <form onSubmit={handleSubmit} autoComplete="off">
        
        <div>
          <label>Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="false"
            spellCheck="false"
            required 
          />
        </div>

        <div>
          <label>Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            // 'new-password' prevents the browser from auto-filling a saved password
            autoComplete="new-password" 
            spellCheck="false"
            required 
          />
        </div>

        <div>
            <label>Password Confirmation</label>
            <input
            type = "password"
            value = {passwordConfirmation}
            onChange = {(e) => setConfirmation(e.target.value)}
            autoComplete='new-password'
            spellCheck = "false"
            required
            />
        </div>

        <button type="submit">Secure Register</button>
      </form>
    </div>
  );
}