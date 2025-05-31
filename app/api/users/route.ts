import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Tạo hoặc lấy user theo ví (và các trường định danh bổ sung)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Creating user with data:", body);

    const { wallet_address } = body;

    // Kiểm tra wallet_address
    if (!wallet_address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Kiểm tra xem user đã tồn tại chưa
    const existingUser = await sql`
      SELECT * FROM users 
      WHERE wallet_address = ${wallet_address}
    `;

    if (existingUser.length > 0) {
      // Nếu user đã tồn tại, trả về thông tin user đó
      return NextResponse.json({ 
        success: true,
        user: existingUser[0],
        message: "User already exists"
      });
    }

    // Nếu user chưa tồn tại, tạo user mới
    try {
      const newUser = await sql`
        INSERT INTO users (wallet_address)
        VALUES (${wallet_address})
        RETURNING *
      `;

      console.log("Created new user:", newUser[0]);
      return NextResponse.json({ 
        success: true,
        user: newUser[0],
        message: "User created successfully"
      });
    } catch (dbError) {
      console.error("Database error creating user:", dbError);
      return NextResponse.json(
        { error: "Database error while creating user" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in user creation:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

// Lấy user theo ví (có thể mở rộng lấy danh sách user nếu muốn)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet_address");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const user = await sql`
      SELECT * FROM users 
      WHERE wallet_address = ${walletAddress}
    `;

    return NextResponse.json({ user: user[0] || null });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
