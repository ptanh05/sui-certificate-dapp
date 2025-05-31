"use client"

import { useState, useEffect } from "react"

interface SuiWallet {
  address: string | null
  connected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  signAndExecuteTransactionBlock: (transaction: any) => Promise<any>
}

export function useSuiWallet(): SuiWallet {
  const [address, setAddress] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Check if wallet is already connected
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).suiWallet) {
        const accounts = await (window as any).suiWallet.getAccounts()
        if (accounts.length > 0) {
          setAddress(accounts[0])
          setConnected(true)
        }
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error)
    }
  }

  const connect = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).suiWallet) {
        const result = await (window as any).suiWallet.requestPermissions({
          permissions: ["viewAccount", "suggestTransactions"],
        })

        if (result.accounts.length > 0) {
          setAddress(result.accounts[0])
          setConnected(true)
        }
      } else {
        alert("Please install Sui Wallet extension")
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
    }
  }

  const disconnect = () => {
    setAddress(null)
    setConnected(false)
  }

  const signAndExecuteTransactionBlock = async (transaction: any) => {
    if (!connected || typeof window === "undefined" || !(window as any).suiWallet) {
      throw new Error("Wallet not connected")
    }

    try {
      const result = await (window as any).suiWallet.signAndExecuteTransactionBlock({
        transactionBlock: transaction,
        options: {
          showInput: true,
          showEffects: true,
          showEvents: true,
        },
      })
      return result
    } catch (error) {
      console.error("Error executing transaction:", error)
      throw error
    }
  }

  return {
    address,
    connected,
    connect,
    disconnect,
    signAndExecuteTransactionBlock,
  }
}
