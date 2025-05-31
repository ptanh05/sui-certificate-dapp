import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Received transaction data:", body)

    const {
      wallet_address,
      transaction_type,
      txHash,
      status = false,
      description = null
    } = body

    if (!wallet_address || !transaction_type) {
      return NextResponse.json(
        { error: "Wallet address and transaction type are required" },
        { status: 400 }
      )
    }

    const user = await sql`
      SELECT id FROM users WHERE wallet_address = ${wallet_address}
    `

    if (user.length === 0) {
      const newUser = await sql`
        INSERT INTO users (wallet_address)
        VALUES (${wallet_address})
        RETURNING id
      `
      user[0] = newUser[0]
    }

    const result = await sql`
      INSERT INTO transactions (
        user_id,
        transaction_type,
        txHash,
        status,
        description,
        created_at
      ) VALUES (
        ${user[0].id},
        ${transaction_type},
        ${txHash},
        ${status},
        ${description},
        CURRENT_TIMESTAMP
      ) RETURNING *
    `

    console.log("Created transaction:", result[0])
    return NextResponse.json({ success: true, transaction: result[0] })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet_address")
    const txHash = searchParams.get("txHash")
    const transactionType = searchParams.get("type")

    let query = sql`
      SELECT 
        t.*,
        u.wallet_address
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `

    if (walletAddress) {
      query = sql`${query} AND u.wallet_address = ${walletAddress}`
    }
    if (txHash) {
      query = sql`${query} AND t.txHash = ${txHash}`
    }
    if (transactionType) {
      query = sql`${query} AND t.transaction_type = ${transactionType}`
    }

    query = sql`${query} ORDER BY t.created_at DESC LIMIT 100`;
    const result = await query;
    return NextResponse.json({ transactions: result });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}