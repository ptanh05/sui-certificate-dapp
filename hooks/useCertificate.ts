// hooks/useCertificate.ts
import { useWalletKit } from "@mysten/wallet-kit";
import { TransactionBlock } from "@mysten/sui.js";
import { PACKAGE_ID, MODULE_NAME } from "../constants/contract";

export const useCertificate = () => {
  console.log("=== Hook Initialized ===");
  const { currentAccount, signAndExecuteTransactionBlock } = useWalletKit();
  
  // Log ngay khi hook được khởi tạo
  console.log("Wallet connection status:", currentAccount ? "Connected" : "Not connected");
  if (currentAccount) {
    console.log("Connected wallet:", currentAccount.address);
    console.log("Network:", currentAccount.chains[0]);
  }

  const mintCertificate = async (
    recipientName: string,
    courseName: string,
    institution: string,
    issueDate: string,
    completionDate: string,
    description: string,
    recipientAddress: string
  ) => {
    console.log("=== Mint Certificate Called ===");
    console.log("Parameters:", {
      recipientName,
      courseName,
      institution,
      issueDate,
      completionDate,
      description,
      recipientAddress
    });

    if (!currentAccount) {
      console.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    // Log chi tiết hơn
    console.log("=== Debug Info ===");
    console.log("Current account:", currentAccount.address);
    console.log("Network:", currentAccount.chains[0]);
    console.log("Package ID:", PACKAGE_ID);
    console.log("Module name:", MODULE_NAME);
    console.log("Target:", `${PACKAGE_ID}::${MODULE_NAME}::mint_certificate`);

    const tx = new TransactionBlock();
    try {
      const moveCall = {
        target: `${PACKAGE_ID}::${MODULE_NAME}::mint_certificate`,
        arguments: [
          tx.pure(recipientName),
          tx.pure(courseName),
          tx.pure(institution),
          tx.pure(issueDate),
          tx.pure(completionDate),
          tx.pure(description),
          tx.pure(recipientAddress),
        ],
      };
      
      console.log("Move call:", moveCall);
      tx.moveCall(moveCall);

      const serializedTx = tx.serialize();
      console.log("Serialized transaction:", serializedTx);

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: tx,
      });
      console.log("Transaction result:", result);
      return result;
    } catch (error) {
      console.error("Transaction error:", error);
      throw error;
    }
  };

  return {
    mintCertificate,
  };
};