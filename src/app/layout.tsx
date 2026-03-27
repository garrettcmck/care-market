import type { Metadata } from "next";
import WalletContextProvider from "@/components/WalletProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Care Market — Lossless Giving on Solana",
  description: "Stake SOL to fund charitable campaigns. Your SOL earns yield, charity gets paid, you get your SOL back.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <WalletContextProvider>
          <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh" }}>
            {children}
          </div>
        </WalletContextProvider>
      </body>
    </html>
  );
}
