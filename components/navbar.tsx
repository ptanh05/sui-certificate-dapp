import { ConnectButton, useWalletKit } from "@mysten/wallet-kit";
import Image from "next/image";

export default function Navbar() {
  const { currentAccount } = useWalletKit();

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="flex justify-between items-center p-4 bg-blue-600 text-white">
      <div className="flex items-center space-x-3">
        <Image
          src="/CertChain.png"
          alt="Logo"
          width={48}
          height={48}
          className="rounded-full"
          priority
        />
        <h1 className="text-xl font-bold">SUI CERTIFICATE PLATFORM</h1>
      </div>
      <ConnectButton
        connectText="Connect Wallet"
        connectedText={
          currentAccount ? `${formatAddress(currentAccount.address)}` : ""
        }
      />
    </nav>
  );
}
