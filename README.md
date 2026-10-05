# Zero-Knowledge Password Manager Sandbox

**Disclaimer upfront:** This is *not* a production-ready application. This project was built strictly as a sandbox to explore core cybersecurity concepts, specifically mitigating OWASP Top 10 vulnerabilities, and learning how to deploy a multithreaded Python backend.

## What It Does

This is a basic, proof-of-concept zero-knowledge password manager. The core rule of the architecture is that the server must never know the user's master password, nor possess the mathematical capability to read their encrypted vault. All encryption, decryption, and key derivation happen strictly in the browser's volatile memory, while the server acts as a blind, heavily defended storage unit.

## The Tech Stack

* **Frontend:** React (Vite), React Router
* **Backend:** Flask, SQLAlchemy
* **Database:** PostgreSQL
* **Production Server:** Waitress (WSGI)
* **Cryptography:** Argon2id, HKDF, Web Crypto API (AES-256-GCM), Bcrypt

## Concepts Explored

### 1. Zero-Knowledge Cryptography

* **Client-Side Derivation:** Using Argon2id to stretch the master password, then applying HKDF to split it into two mathematically isolated keys: an Authentication Key (sent to the server) and an Encryption Key (kept in browser RAM).
* **Symmetric Encryption:** Utilizing the browser's native Web Crypto API to encrypt vault items via AES-256-GCM before transmitting the ciphertext over the network.

### 2. OWASP Top 10 Defenses

* **Anti-Enumeration (Broken Authentication):** The API intentionally lies to attackers. If a hacker queries an unregistered email, the server generates a mathematically valid fake salt. This prevents attackers from figuring out who uses the app while forcing them to waste massive compute cycles on dead-end cryptography.
* **Information Leakage:** Enforcing completely generic HTTP 401 error messages ("Invalid email or master password") across all failure points, ensuring no system state is leaked to the client.
* **Injection & Payload Validation:** Implementing strict "circuit breakers" on the API routes to validate email regex, hex string lengths, and data types before the payload ever reaches the database query layer.
* **Constant-Time Comparisons:** Utilizing Bcrypt server-side to verify authentication keys, neutralizing timing attacks.

### 3. Concurrency in Python

* **Bypassing the GIL:** Simple Flask development servers freeze up when multiple users trigger heavy CPU-bound cryptography at the same time. This project implements Waitress, a WSGI multi-worker server, to distribute incoming traffic across multiple parallel threads and prevent request queue bottlenecks.

## How to Run Locally

**1. Database**
Ensure PostgreSQL is running locally with an active database named `vault_db`.

**2. Backend Setup**

```bash
# Install dependencies
pip install flask flask-cors email-validator flask-sqlalchemy flask-migrate bcrypt waitress

# Boot the WSGI multi-worker server (do not use 'flask run')
python run_server.py

```

**3. Frontend Setup**

```bash
# Install dependencies including react-router-dom
npm install

# Boot the Vite development server
npm run dev

```
