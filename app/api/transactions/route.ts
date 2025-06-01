import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Define an interface for the expected request body for clarity
interface CreateTransactionRequestBody {
    wallet_address: string;
    transaction_type: string;
    txHash?: string | null; // txHash might be null for some transaction types?
    status?: boolean;
    description?: string | null;
}


export async function POST(request: NextRequest) {
  try {
    // Use the interface for type safety
    const body: CreateTransactionRequestBody = await request.json()
    console.log("Received transaction data:", body)

    const {
      wallet_address,
      transaction_type,
      txHash,
      status = false, // Default status to false if not provided
      description = null // Default description to null if not provided
    } = body

    // Basic validation for required fields
    if (!wallet_address || !transaction_type) {
         console.error("Missing wallet_address or transaction_type in request body:", body);
      return NextResponse.json(
        { error: "Wallet address and transaction type are required" },
        { status: 400 }
      )
    }

    // Find the user_id based on wallet_address
    // Assuming the user already exists in the 'users' table
    const user = await sql`
      SELECT id FROM users WHERE wallet_address = ${wallet_address}
    `

    // If user is not found, return an error.
    // This implies the user should have been created via the /api/users endpoint first.
    if (user.length === 0) {
        console.error(`User not found for wallet_address: ${wallet_address}`);
      return NextResponse.json(
        { error: `User not found for wallet address: ${wallet_address}. Please ensure the user is registered.` },
        { status: 404 } // 404 Not Found is appropriate here
      )
    }

    // User found, get the user_id
    const user_id = user[0].id;
    console.log(`Found user_id ${user_id} for wallet ${wallet_address}`);


    // Insert the transaction into the transactions table
    const result = await sql`
      INSERT INTO transactions (
        user_id, -- Use the fetched user_id
        transaction_type,
        txHash,
        status,
        description
        -- created_at is handled by the default value in schema
      ) VALUES (
        ${user_id},
        ${transaction_type},
        ${txHash || null}, -- Ensure txHash is saved as null if not provided
        ${status},
        ${description}
      ) RETURNING *
    `

    console.log("Created transaction in DB:", result[0])
    return NextResponse.json({ success: true, transaction: result[0] })
  } catch (error: any) { // Catch potential errors
    console.error("Error creating transaction in DB:", error.message || error)
    return NextResponse.json(
      { error: "Failed to create transaction", details: error.message },
      { status: 500 }
    )
  }
}

// The GET handler already joins with users and filters by wallet_address (via user_id).
// No changes needed here based on the updated schema and requirements.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet_address")
    const txHash = searchParams.get("txHash")
    const transactionType = searchParams.get("type")

    let query = sql`
      SELECT
        t.id, -- Select specific columns for clarity, including the new ones
        t.transaction_type,
        t.txHash,
        t.status,
        t.description,
        t.created_at,
        u.wallet_address -- Get wallet_address from joined users table
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

    // Ensure ordering and limit are applied correctly
    query = sql`${query} ORDER BY t.created_at DESC LIMIT 100`;
    console.log("Executing GET query for transactions:", query);

    const result = await query;
    console.log(`Fetched ${result.length} transactions.`);

    // The view_certificates aliases transaction_hash as txHash,
    // but this GET handler for transactions already selects t.txHash, which matches.
    return NextResponse.json({ transactions: result });
  } catch (error: any) {
    console.error("Error fetching transactions:", error.message || error);
    return NextResponse.json({ error: "Failed to fetch transactions", details: error.message }, { status: 500 });
  }
}