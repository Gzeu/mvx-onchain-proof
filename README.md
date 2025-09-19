# 🏷️ MultiversX On-Chain Proof Plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MultiversX](https://img.shields.io/badge/MultiversX-Smart%20Contract-blue)](https://multiversx.com/)
[![Version](https://img.shields.io/badge/Version-0.1.0-green)](https://github.com/Gzeu/mvx-onchain-proof)

**Universal smart contract pentru badge/certificat/atestare pe blockchain MultiversX - 100% sigur, fără fonduri!**

## 🎯 Ce face?

Acest smart contract permite oricui să **"stampeze"** o dovadă permanentă pe blockchain-ul MultiversX:
- ✅ **Badge-uri de participare** (hackathon, evenimente, cursuri)
- ✅ **Certificate de finalizare** (proiecte, training-uri)  
- ✅ **Timestamp-uri verificabile** (dovezi de existență)
- ✅ **Atestări profesionale** (competențe, realizări)
- ✅ **Complet GRATUIT** - nu gestionează fonduri, zero risc financiar!

## 🏗️ Arhitectură

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│  Smart Contract  │───▶│   Blockchain    │
│   (HTML/JS)     │    │  (OnChainProof)  │    │   (MultiversX)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Funcții principale:**
- `certifyAction(proof)` - Salvează o dovadă on-chain
- `getProof(user)` - Returnează dovada unui utilizator

## 🚀 Instalare & Deploy Rapid

### Prerequisite
```bash
# Instalează MultiversX SDK
pipx install multiversx-sdk-cli --force

# Verifică instalarea
mxpy --version
```

### 1. Clone Repository
```bash
git clone https://github.com/Gzeu/mvx-onchain-proof.git
cd mvx-onchain-proof
```

### 2. Build Contract
```bash
cd contract
mxpy deps install rust --overwrite
sc-meta all build
```

### 3. Deploy pe DevNet
```bash
# Asigură-te că ai walletKey.json în directorul contract/
mxpy contract deploy \
  --bytecode=./output/onchain-proof.wasm \
  --keyfile=walletKey.json \
  --gas-limit=100000000 \
  --proxy=https://devnet-gateway.multiversx.com \
  --chain=D \
  --send
```

### 4. Deploy pe MainNet
```bash
mxpy contract deploy \
  --bytecode=./output/onchain-proof.wasm \
  --keyfile=walletKey.json \
  --gas-limit=100000000 \
  --proxy=https://gateway.multiversx.com \
  --chain=1 \
  --send
```

## 💡 Exemple de Utilizare

### Certificat de Participare Hackathon
```rust
proof = "HACKATHON_2025_PARTICIPANT|George_Pricop|2025-09-19|MultiversX_Bucharest"
```

### Badge de Finalizare Curs
```rust
proof = "BLOCKCHAIN_COURSE_COMPLETED|Smart_Contracts_Advanced|Score:95|Institution:TechAcademy"
```

### Dovadă de Existență Document
```rust
proof = "DOCUMENT_HASH|SHA256:a1b2c3d4e5f6|Timestamp:1695154800|Type:Contract"
```

## 🌐 Frontend Demo

Exemplu simplu în [frontend-example/index.html](frontend-example/index.html):

```html
<!DOCTYPE html>
<html>
<head>
    <title>MVX OnChain Proof Demo</title>
</head>
<body>
    <h2>🏷️ Claim Your On-Chain Proof</h2>
    <input id="proofInput" placeholder="Descrie dovada ta...">
    <button onclick="submitProof()">Mint Proof</button>
    
    <script>
        function submitProof() {
            const proof = document.getElementById('proofInput').value;
            if (proof) {
                // Integrare cu MultiversX SDK
                alert('Proof-ul va fi salvat on-chain: ' + proof);
            }
        }
    </script>
</body>
</html>
```

## 📖 API Documentation

### Smart Contract Methods

#### `certifyAction(proof: ManagedBuffer)`
**Scop:** Salvează o dovadă on-chain pentru utilizatorul curent

**Parametri:**
- `proof` - Text care descrie dovada/certificatul

**Gas Cost:** ~50,000 gas

**Exemplu:**
```javascript
await contract.certifyAction("HACKATHON_WINNER_2025");
```

#### `getProof(user: ManagedAddress) -> ManagedBuffer`
**Scop:** Returnează dovada salvată pentru un utilizator

**Parametri:**
- `user` - Adresa utilizatorului

**Return:** Text-ul dovezii sau buffer gol

**Exemplu:**
```javascript
const proof = await contract.getProof("erd1...");
```

## 🎯 Use Cases Practice

### 1. Sistem de Certificate Educaționale
```
Proof Format: "CERT|{course_name}|{completion_date}|{score}|{institution}"
Exemplu: "CERT|Blockchain Development|2025-09-19|98|TechUniversity"
```

### 2. Badge-uri Evenimente
```
Proof Format: "EVENT|{event_name}|{date}|{role}|{location}"
Exemplu: "EVENT|MultiversX Hackathon|2025-09-19|Participant|Bucharest"
```

### 3. Verificare Documente
```
Proof Format: "DOC|{doc_hash}|{timestamp}|{type}"
Exemplu: "DOC|sha256:abc123...|1695154800|Contract"
```

## 🔧 Development

### Structura Proiectului
```
mvx-onchain-proof/
├── contract/
│   ├── src/lib.rs          # Smart contract logic
│   ├── Cargo.toml          # Dependencies
│   └── output/             # Build artifacts
├── frontend-example/
│   └── index.html          # Demo frontend
├── tests/                  # Unit tests (coming soon)
├── docs/                   # Documentation (coming soon)
└── README.md
```

### Testing Local
```bash
# Run contract tests (coming soon)
cd contract
cargo test

# Start local devnet (coming soon)  
mxpy localnet setup
mxpy localnet start
```

## 🛣️ Roadmap

### ✅ Phase 1 - MVP (Completed)
- [x] Basic smart contract
- [x] Simple frontend example
- [x] Deploy instructions

### 🔄 Phase 2 - Enhanced Features (In Progress)
- [ ] Multiple proofs per user
- [ ] Timestamp support
- [ ] Event logging
- [ ] Metadata structure
- [ ] Proof categories

### 🎯 Phase 3 - Advanced Features (Planned)
- [ ] Modern React frontend
- [ ] MultiversX SDK integration
- [ ] Wallet connection
- [ ] Proof history viewer
- [ ] Search functionality
- [ ] Export certificates

### 🚀 Phase 4 - Production Ready (Future)
- [ ] Unit & integration tests
- [ ] CI/CD pipeline
- [ ] Security audit
- [ ] Performance optimization
- [ ] Mobile app support

## 🤝 Contributing

Contribuțiile sunt binevenite! Pentru a contribui:

1. Fork repository-ul
2. Creează un branch pentru feature (`git checkout -b feature/amazing-feature`)
3. Commit schimbările (`git commit -m 'Add amazing feature'`)
4. Push pe branch (`git push origin feature/amazing-feature`)
5. Deschide un Pull Request

### Guidelines
- Respectă coding standards
- Adaugă teste pentru noi funcționalități
- Actualizează documentația
- Descrie clar modificările în PR

## ❓ FAQ

**Q: Este sigur să folosesc acest contract?**
A: Da! Contract-ul nu gestionează fonduri și nu poate accesa wallet-ul tău.

**Q: Cât costă să "mint" o dovadă?**
A: Doar gas fee-ul pentru tranzacție (~$0.001 EGLD pe devnet/mainnet).

**Q: Pot să șterg o dovadă după ce am salvat-o?**
A: Nu, dovezile sunt permanente pe blockchain (acesta este scopul).

**Q: Câte dovezi pot să salvez?**
A: Versiunea actuală permite o dovadă per utilizator. Versiunea viitoare va suporta multiple.

**Q: Pot să verific dovada altcuiva?**
A: Da, folosind metoda `getProof()` cu adresa lor publică.

## 📄 License

Acest proiect este licențiat sub [MIT License](LICENSE).

---

**Creat de:** [George Pricop](https://github.com/Gzeu) | **Contact:** [GitHub](https://github.com/Gzeu)

⭐ Dacă îți place proiectul, oferă-i o stea pe GitHub!