# 🏷️ MultiversX On-Chain Proof Plugin

**Universal smart contract pentru badge/certificat/atestare pe blockchain, fără fonduri!**

## Ce face?
- Oricine poate “stamp-ui” o dovadă (badge/text/timestamp) on-chain.
- Nu gestionează fonduri, nu implică risc financiar!

## Instalare & Deploy rapid

```bash
pipx install multiversx-sdk-cli --force
cd contract
mxpy deps install rust --overwrite
sc-meta all build
mxpy contract deploy --bytecode=./output/onchain-proof.wasm --keyfile=walletKey.json --gas-limit=100000000 --proxy=https://devnet-gateway.multiversx.com --chain=D --send
```

## Exemplu frontend (HTML simplu):

Vezi [frontend-example/index.html](frontend-example/index.html).

---

Licență: MIT
