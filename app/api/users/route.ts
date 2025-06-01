import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Define an interface for the expected request body for clarity
interface CreateUserRequestBody {
    wallet_address: string;
    institution_name?: string | null; // Optional, can be string or null
    email?: string | null; // Optional, can be string or null
    website?: string | null; // Optional, can be string or null
}

// Tạo hoặc lấy user theo ví (và các trường định danh bổ sung)
export async function POST(request: NextRequest) {
  try {
    // Use the interface for type safety
    const body: CreateUserRequestBody = await request.json();
    console.log("Creating user with data:", body);

    // Extract all potential fields from the body
    const { wallet_address, institution_name, email, website } = body;

    // Kiểm tra wallet_address (vẫn là trường bắt buộc duy nhất khi tạo user ban đầu)
    if (!wallet_address) {
      console.error("Missing wallet_address in request body:", body);
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Kiểm tra xem user đã tồn tại chưa dựa trên wallet_address
    const existingUser = await sql`
      SELECT * FROM users
      WHERE wallet_address = ${wallet_address}
    `;

    if (existingUser.length > 0) {
      // Nếu user đã tồn tại, trả về thông tin user đó
      console.log("User already exists:", existingUser[0]);
      return NextResponse.json({
        success: true,
        user: existingUser[0],
        message: "User already exists"
      });
    }

    // Nếu user chưa tồn tại, tạo user mới
    try {
      // INSERT INTO users, bao gồm các cột mới.
      // Nếu các giá trị là null hoặc undefined từ frontend, database sẽ lưu NULL (do schema cho phép).
      const newUser = await sql`
        INSERT INTO users (wallet_address, institution_name, email, website)
        VALUES (${wallet_address}, ${institution_name || null}, ${email || null}, ${website || null})
        RETURNING *
      `;

      console.log("Created new user:", newUser[0]);
      return NextResponse.json({
        success: true,
        user: newUser[0],
        message: "User created successfully"
      });
    } catch (dbError: any) { // Catch potential database errors
        // Log error chi tiết hơn
      console.error("Database error while creating user:", dbError.message || dbError);
       // Check for unique constraint violation on wallet_address
        if (dbError.message && dbError.message.includes('duplicate key value violates unique constraint "users_wallet_address_key"')) {
             // This case should ideally be caught by the SELECT check above, but good to handle here too
            const user = await sql`SELECT * FROM users WHERE wallet_address = ${wallet_address}`;
             if (user.length > 0) {
                 return NextResponse.json({
                    success: true,
                    user: user[0],
                    message: "User already exists"
                 });
             }
        }
      return NextResponse.json(
        { error: "Database error while creating user", details: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) { // Catch other potential errors
    console.error("Error in user creation API:", error.message || error);
    return NextResponse.json(
      { error: "Failed to create user", details: error.message },
      { status: 500 }
    );
  }
}

// Lấy user theo ví (có thể mở rộng lấy danh sách user nếu muốn)
// Hàm GET này đã SELECT * nên không cần sửa để lấy các cột mới.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet_address");

    if (!walletAddress) {
       console.error("Missing wallet_address in GET request params");
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const user = await sql`
      SELECT * FROM users
      WHERE wallet_address = ${walletAddress}
    `;
    console.log(`Fetched user for wallet ${walletAddress}:`, user[0] || null);

    return NextResponse.json({ user: user[0] || null });
  } catch (error: any) { // Catch potential errors
    console.error("Error fetching user API:", error.message || error);
    return NextResponse.json(
      { error: "Failed to fetch user", details: error.message },
      { status: 500 }
    );
  }
}
