import argon2 from 'argon2-browser/dist/argon2-bundled.min.js';

/*
* Generate 16 byte salt
*/
export function generateSalt(){
    const salt = new Uint8Array(16); /// create 16 byte salt array
    window.crypto.getRandomValues(salt); /// populate salt array
    return salt;
}

export function bufferToHex(buffer){
    return Array.from(buffer).map(byte=>byte.toString(16).padStart(2,'0')).join('') //First turn salt into std array
    //Loop through bytes and convert to base-16 hex str, if byte small pad with 0 at front, mash strings together
}

export function hexToBuffer(hexString) {
  const bytes = new Uint8Array(Math.ceil(hexString.length / 2)); // init array of bytes
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16); //loop thru bytes and append to arr
  }
  return bytes;
}

///Derive MK with argonid
export async function deriveMasterKey(password, salt){
    try{
        const result = await argon2.hash({
            pass: password,
            salt: salt,
            //Common OWASP security parameters
            time: 3,   ///num iterations
            mem: 65536,  //RAM used in KB
            hashLen: 32,  //Need 32 bytes to store hash key
            parallelism: 1,  // num of Threads
            type: argon2.ArgonType.Argon2id /// industry standard algorithm

        });
        return result.hash;
    } catch(error){
        console.error("argon failed: ", error);
        throw new Error("Failed to get MK");
    }
}

//Split MK with HKDF
export async function splitKeys(masterKey){
    //import bytes into web crypto key obj
    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        masterKey,
        { name: "HKDF" },
        false,
        ["deriveBits"]
    );
    const encoder = new TextEncoder();

    //get AuthKey using a webAPI
    const authKeyBuffer = await window.crypto.subtle.deriveBits(
        {
            name: "HKDF",
            hash: "SHA-256", ///HKDF told to use SHA-256 Hashing algorithm
            salt: new Uint8Array(0), //already applied in MK os no need for salt
            info: encoder.encode("authentication")
        },
        baseKey, 256 //Request 32 bytes of output data

    )

    // get Encryption Key
    const encKeyBuffer = await window.crypto.subtle.deriveBits(
        {
        name: "HKDF",
        hash: "SHA-256",
        salt: new Uint8Array(0),
        info: encoder.encode("encryption") //2 diff info fields force the results to be different
        },
        baseKey,
        256
    );
    return {
        authKey: new Uint8Array(authKeyBuffer),
        encryptionKey: new Uint8Array(encKeyBuffer)
    };
}


// Helper to import the raw memory buffer into a usable AES-GCM CryptoKey
const importAesKey = async (rawKeyBuffer) => {
  return await window.crypto.subtle.importKey(
    "raw",
    rawKeyBuffer,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptVaultItem = async (plaintext, rawKeyBuffer) => {
  const aesKey = await importAesKey(rawKeyBuffer);
  
  // 1. Generate a unique 12-byte Initialization Vector (IV) for this specific item
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // 2. Encode the plaintext string into a byte array
  const encodedText = new TextEncoder().encode(plaintext);
  
  // 3. Encrypt the data. 
  // Web Crypto GCM automatically appends a 16-byte Authentication Tag to the end of the ciphertext.
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encodedText
  );

  // 4. Split the ciphertext and the 16-byte Auth Tag for your database columns
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const ciphertext = encryptedArray.slice(0, encryptedArray.length - 16);
  const authTag = encryptedArray.slice(encryptedArray.length - 16);

  // 5. Return everything as hex strings ready for your Flask JSON payload
  return {
    ciphertext: bufferToHex(ciphertext),
    iv: bufferToHex(iv),
    auth_tag: bufferToHex(authTag)
  };
};

export const decryptVaultItem = async (ciphertextHex, ivHex, authTagHex, rawKeyBuffer) => {
  const aesKey = await importAesKey(rawKeyBuffer);
  
  // 1. Convert the hex strings back into byte arrays
  const ciphertext = hexToBuffer(ciphertextHex);
  const iv = hexToBuffer(ivHex);
  const authTag = hexToBuffer(authTagHex);
  
  // 2. Recombine the ciphertext and Auth Tag (Web Crypto expects them as one buffer)
  const combinedBuffer = new Uint8Array(ciphertext.length + authTag.length);
  combinedBuffer.set(ciphertext, 0);
  combinedBuffer.set(authTag, ciphertext.length);

  // 3. Decrypt and authenticate the data
  // If the Auth Tag or Ciphertext was tampered with, this function will intentionally throw an error.
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    combinedBuffer
  );

  // 4. Decode the byte array back into the original plaintext string
  return new TextDecoder().decode(decryptedBuffer);
};