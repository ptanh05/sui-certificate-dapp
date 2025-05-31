import "@/styles/globals.css";
import { WalletKitProvider } from "@mysten/wallet-kit";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletKitProvider>
      <Component {...pageProps} />
    </WalletKitProvider>
  );
}
