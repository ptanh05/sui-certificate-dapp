import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  let transactionStarted = false;
  try {
    const body = await request.json();
    console.log("[Institution API] Received request:", {
      institution_name: body.institution_name,
      email: body.email,
      website: body.website,
      wallet_address: body.wallet_address
    });

    const { institution_name, email, website, wallet_address } = body;

    // Validate input
    if (!institution_name || !email || !website || !wallet_address) {
      const missingFields = [];
      if (!institution_name) missingFields.push('institution_name');
      if (!email) missingFields.push('email');
      if (!website) missingFields.push('website');
      if (!wallet_address) missingFields.push('wallet_address');
      
      console.log("[Institution API] Missing fields:", missingFields);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Kiểm tra user có tồn tại không
    console.log("[Institution API] Checking user...");
    const userResult = await sql`
      SELECT * FROM users WHERE wallet_address = ${wallet_address}
    `;

    if (!userResult || userResult.length === 0) {
      console.log("[Institution API] User not found:", wallet_address);
      return NextResponse.json(
        { error: "User not found. Please try reconnecting your wallet." },
        { status: 404 }
      );
    }
    const user = userResult[0];
    console.log("[Institution API] User found:", user.wallet_address);

    // Kiểm tra email đã được sử dụng chưa
    console.log("[Institution API] Checking existing institution...");
    const existingInstitutionResult = await sql`
      SELECT i.*, u.wallet_address 
      FROM institutions i
      LEFT JOIN users u ON i.email = u.email
      WHERE i.email = ${email}
    `;

    // Bắt đầu transaction
    console.log("[Institution API] Starting transaction...");
    transactionStarted = true;
    await sql`BEGIN;`;

    try {
      if (existingInstitutionResult && existingInstitutionResult.length > 0) {
        const existingInstitution = existingInstitutionResult[0];
        console.log("[Institution API] Found existing institution:", existingInstitution);
        
        if (existingInstitution.wallet_address === wallet_address) {
          console.log("[Institution API] Updating existing institution...");
          
          // Cập nhật institution
          const updatedInstitution = await sql`
            UPDATE institutions 
            SET 
              institution_name = ${institution_name},
              website = ${website}
            WHERE email = ${email}
            RETURNING *
          `;

          // Cập nhật user
          const updatedUser = await sql`
            UPDATE users 
            SET 
              institution_name = ${institution_name},
              website = ${website}
            WHERE wallet_address = ${wallet_address}
            RETURNING *
          `;

          await sql`COMMIT;`;
          console.log("[Institution API] Update successful:", {
            institution: updatedInstitution[0],
            user: updatedUser[0]
          });

          return NextResponse.json({
            success: true,
            institution: updatedInstitution[0],
            user: updatedUser[0],
            message: "Institution information updated successfully"
          });
        } else {
          await sql`ROLLBACK;`;
          console.log("[Institution API] Email belongs to another institution");
          return NextResponse.json(
            { error: "Email này đã được đăng ký bởi tổ chức khác" },
            { status: 400 }
          );
        }
      }

      // Tạo mới institution
      console.log("[Institution API] Creating new institution...");

    // Tạo institution mới
      const newInstitution = await sql`
      INSERT INTO institutions (institution_name, email, website)
      VALUES (${institution_name}, ${email}, ${website})
      RETURNING *
    `;

      if (!newInstitution || newInstitution.length === 0) {
        throw new Error("Failed to create institution");
      }

      // Cập nhật user
      const updatedUser = await sql`
        UPDATE users 
        SET 
          institution_name = ${institution_name},
          email = ${email},
          website = ${website}
        WHERE wallet_address = ${wallet_address}
        RETURNING *
      `;

      if (!updatedUser || updatedUser.length === 0) {
        throw new Error("Failed to update user");
      }

      // Commit transaction
      await sql`COMMIT;`;

      console.log("[Institution API] Create successful:", {
        institution: newInstitution[0],
        user: updatedUser[0]
      });

    return NextResponse.json({
      success: true,
        institution: newInstitution[0],
        user: updatedUser[0],
        message: "Institution registered successfully"
      });

    } catch (dbError: any) {
      console.error("[Institution API] Database error:", dbError);
      await sql`ROLLBACK;`;
      
      if (dbError.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: "Email này đã được đăng ký bởi tổ chức khác" },
          { status: 400 }
        );
      }
      
      throw dbError;
    }

  } catch (error: any) {
    console.error("[Institution API] Error:", error);
    if (transactionStarted) {
      await sql`ROLLBACK;`;
    }
    
    return NextResponse.json(
      { 
        error: error.message || "An unexpected error occurred while processing institution",
        details: error.code || "Unknown error code"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet_address");
    const email = searchParams.get("email");

    console.log("[Institution API] GET request params:", { walletAddress, email });

    let query;
    if (walletAddress) {
      // Lấy thông tin institution theo wallet_address
      console.log("[Institution API] Fetching institution by wallet:", walletAddress);
      query = sql`
        SELECT i.* 
        FROM institutions i
        JOIN users u ON i.email = u.email 
        WHERE u.wallet_address = ${walletAddress}
      `;
    } else if (email) {
      // Lấy thông tin institution theo email
      console.log("[Institution API] Fetching institution by email:", email);
      query = sql`
        SELECT * FROM institutions WHERE email = ${email}
      `;
    } else {
      // Lấy tất cả institutions
      console.log("[Institution API] Fetching all institutions");
      query = sql`
        SELECT * FROM institutions ORDER BY created_at DESC
      `;
    }

    const result = await query;
    console.log("[Institution API] Query result:", result);

    // Trả về kết quả phù hợp với loại query
    if (walletAddress || email) {
      return NextResponse.json({ 
        institution: result[0] || null,
        found: result.length > 0
      });
    } else {
      return NextResponse.json({ 
        institutions: result,
        count: result.length
      });
    }
  } catch (error) {
    console.error("[Institution API] Error fetching institutions:", error);
    return NextResponse.json(
      { error: "Failed to fetch institutions" },
      { status: 500 }
    );
  }
}

// Thêm hàm PUT để cập nhật thông tin institution
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { institution_name, email, website, wallet_address } = body;

    if (!institution_name || !email || !website || !wallet_address) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Kiểm tra xem user có tồn tại không
    const user = await sql`
      SELECT * FROM users WHERE wallet_address = ${wallet_address}
    `;

    if (user.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Kiểm tra xem email có thuộc về user khác không
    const existingEmail = await sql`
      SELECT * FROM institutions 
      WHERE email = ${email} 
      AND institution_name != ${user[0].institution_name}
    `;

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { error: "Email is already registered by another institution" },
        { status: 400 }
      );
    }

    // Bắt đầu transaction để cập nhật
    const result = await sql`
      BEGIN;
      
      -- Cập nhật bảng institutions
      WITH updated_institution AS (
        UPDATE institutions 
        SET 
          institution_name = ${institution_name},
          website = ${website}
        WHERE email = ${email}
        RETURNING *
      )
      -- Cập nhật bảng users
      UPDATE users 
      SET 
        institution_name = ${institution_name},
        website = ${website}
      WHERE wallet_address = ${wallet_address}
      RETURNING (SELECT * FROM updated_institution) as institution, users.*;

      COMMIT;
    `;

    if (!result[0].institution) {
      throw new Error("Failed to update institution");
    }

    return NextResponse.json({
      success: true,
      institution: result[0].institution,
      user: result[0],
      message: "Institution updated successfully"
    });
  } catch (error) {
    await sql`ROLLBACK;`;
    console.error("Error updating institution:", error);
    return NextResponse.json(
      { error: "Failed to update institution" },
      { status: 500 }
    );
  }
}