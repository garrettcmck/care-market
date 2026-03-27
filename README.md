# Care Market — Lossless Giving on Solana

Stake SOL to fund charitable campaigns. Your SOL earns yield via jitoSOL, the charity gets paid when the goal is reached, and you get your SOL back.

## Live on Solana Devnet

| | Address |
|---|---|
| Program | `3CQ9sfki5SgF4pdL7qZgFWGzf4h3HSfgNXwWS5usbUsz` |
| CareMarket PDA | `8RicR5nT8aqQdZRg7wApHtcbA3qszD4r3ow1oiLwoszR` |
| Campaign 0 | `G3kvpTeu7NCvtDCMqgKqhrC86gASWzhrq4oS5jiSEmY9` |

[View on Solana Explorer](https://explorer.solana.com/address/3CQ9sfki5SgF4pdL7qZgFWGzf4h3HSfgNXwWS5usbUsz?cluster=devnet)

## How It Works

1. **Stake SOL** — your SOL is swapped to jitoSOL earning ~7.5% APY
2. **Yield funds charity** — staking rewards accumulate toward the campaign goal
3. **Get SOL back** — when the goal is reached, your full deposit is returned

## Development

```bash
npm install
npm run dev
```

## Deploy

Push to `main` and GitHub Actions deploys to GitHub Pages automatically.
