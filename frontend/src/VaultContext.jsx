import { createContext, useContext, useState } from 'react';

// 1. Create the Context
const VaultContext = createContext();

// 2. Create the Provider Component
export function VaultProvider({ children }) {
  const [encryptionKey, setEncryptionKey] = useState(null);
  
  // A simple derived state so other components know if the vault is unlocked
  const isUnlocked = encryptionKey !== null;

  const unlockVault = (key) => {
    setEncryptionKey(key);
  };

  const lockVault = () => {
    // CRITICAL: Overwrite the key with null to destroy it from memory
    setEncryptionKey(null);
  };

  return (
    <VaultContext.Provider value={{ encryptionKey, isUnlocked, unlockVault, lockVault }}>
      {children}
    </VaultContext.Provider>
  );
}

// 3. Create a custom hook for easy access
export function useVault() {
  return useContext(VaultContext);
}