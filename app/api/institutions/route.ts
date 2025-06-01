import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

interface ApiError extends Error {
  code?: string;
  message: string;
}

export async function POST(request: NextRequest) {
  let transactionStarted = false;
  try {
    const body = await request.json();
    console.log("[Institution API - POST] Received request:", {
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

      console.log("[Institution API - POST] Missing fields:", missingFields);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Kiểm tra user có tồn tại không
    console.log("[Institution API - POST] Checking user existence for wallet:", wallet_address);
    const userResult = await sql`
      SELECT id, institution_name, email, website FROM users WHERE wallet_address = ${wallet_address}
    `;

    if (!userResult || userResult.length === 0) {
      console.log("[Institution API - POST] User not found:", wallet_address);
      return NextResponse.json(
        { error: "User not found. Please try reconnecting your wallet." },
        { status: 404 }
      );
    }
    const user = userResult[0];
    console.log("[Institution API - POST] User found:", user);

    // Bắt đầu transaction
    console.log("[Institution API - POST] Starting transaction...");
    transactionStarted = true;
    await sql`BEGIN`;

    try {
        // Logic 1: Kiểm tra xem có TỔ CHỨC nào khác đã đăng ký email này trong bảng 'institutions' chưa
        console.log("[Institution API - POST] Checking if email is already used by another institution...");
        const existingInstitutionWithEmail = await sql`
            SELECT * FROM institutions
            WHERE email = ${email}
            LIMIT 1
        `;

        if (existingInstitutionWithEmail && existingInstitutionWithEmail.length > 0) {
             if (existingInstitutionWithEmail[0].institution_name !== institution_name) {
                 await sql`ROLLBACK`;
                 console.log("[Institution API - POST] Email already registered by another institution name:", email);
                 return NextResponse.json(
                     { error: "Email này đã được đăng ký bởi tổ chức khác." },
                     { status: 400 }
                 );
             }
             console.log("[Institution API - POST] Email found in institutions, name matches. Proceeding with update logic.");
        }


        // Logic 2: Cập nhật thông tin TỔ CHỨC cho người dùng trong bảng 'users'
        console.log("[Institution API - POST] Updating user's institution info in 'users' table...");
        const updatedUserResult = await sql`
            UPDATE users
            SET
                institution_name = ${institution_name},
                email = ${email},
                website = ${website}
            WHERE wallet_address = ${wallet_address}
            RETURNING id, wallet_address, institution_name, email, website, created_at
        `;

        if (!updatedUserResult || updatedUserResult.length === 0) {
             await sql`ROLLBACK`;
             console.error("[Institution API - POST] Failed to update user's institution info.");
             throw new Error("Failed to update user's institution information.");
        }
        const updatedUser = updatedUserResult[0];
        console.log("[Institution API - POST] User info updated:", updatedUser);


        // Logic 3: Tạo hoặc cập nhật thông tin TỔ CHỨC trong bảng 'institutions'
        console.log("[Institution API - POST] Upserting institution info into 'institutions' table...");
        const upsertInstitutionResult = await sql`
            INSERT INTO institutions (institution_name, email, website)
            VALUES (${institution_name}, ${email}, ${website})
            ON CONFLICT (email)
            DO UPDATE SET
                institution_name = EXCLUDED.institution_name,
                website = EXCLUDED.website
            RETURNING *
        `;

         if (!upsertInstitutionResult || upsertInstitutionResult.length === 0) {
             await sql`ROLLBACK`;
             console.error("[Institution API - POST] Failed to upsert institution info.");
             throw new Error("Failed to create or update institution information.");
         }
        const upsertedInstitution = upsertInstitutionResult[0];
        console.log("[Institution API - POST] Institution upserted:", upsertedInstitution);


        // Commit transaction if all steps were successful
        await sql`COMMIT`;
        console.log("[Institution API - POST] Transaction committed successfully.");


        // Return success response. Include both user and institution info.
        return NextResponse.json({
            success: true,
            user: updatedUser,
            institution: upsertedInstitution,
            message: existingInstitutionWithEmail.length > 0 ? "Institution information updated successfully" : "Institution registered successfully"
        });


    } catch (dbError: any) { // Catch database-related errors during the transaction
      console.error("[Institution API - POST] Database error during transaction:", dbError.message || dbError);
      if (transactionStarted) {
           await sql`ROLLBACK`;
           console.log("[Institution API - POST] Transaction rolled back due to database error.");
       }

      // Specific handling for unique constraint violation on email in 'institutions' table
      if (dbError.code === '23505' && dbError.constraint === 'institutions_email_key') {
           return NextResponse.json(
             { error: "Email này đã được đăng ký bởi tổ chức khác." },
             { status: 400 }
           );
      }

      // Re-throw the error or return a generic database error response
      return NextResponse.json(
        { error: "Database error processing institution registration", details: dbError.message || "Unknown database error" },
        { status: 500 }
      );
    }

  } catch (error: any) { // Catch other potential errors (e.g., JSON parsing)
    console.error("[Institution API - POST] General error:", error.message || error);
     if (transactionStarted) {
        // If transaction was started but an error occurred before rollback in the try block
         await sql`ROLLBACK`;
         console.log("[Institution API - POST] Transaction rolled back due to general error.");
     }

    return NextResponse.json(
      {
        error: "An unexpected error occurred while processing institution",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

// --- GET Handler ---
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet_address");
    const email = searchParams.get("email");

    console.log("[Institution API - GET] Request params:", { walletAddress, email });

    let result;
    if (walletAddress) {
      // Lấy thông tin institution ĐƯỢC LIÊN KẾT VỚI user (từ bảng users)
      console.log("[Institution API - GET] Fetching user's institution info by wallet:", walletAddress);
      const userWithInstitution = await sql`
        SELECT id, wallet_address, institution_name, email, website, created_at
        FROM users
        WHERE wallet_address = ${walletAddress}
      `;

      if (userWithInstitution && userWithInstitution.length > 0 && userWithInstitution[0].institution_name) {
           // User found and has institution info linked in the users table
            const userInfo = userWithInstitution[0];
           console.log("[Institution API - GET] Found user's linked institution info:", userInfo);
           // Create a mock Institution object from user data
            const userInstitution = {
                id: null, // No institution ID from users table
                institution_name: userInfo.institution_name,
                email: userInfo.email, // This is the user's email linked to the institution email
                website: userInfo.website,
                wallet_address: walletAddress, // Add wallet_address for frontend convenience if needed
                created_at: null, // No creation date for this link
            };
           return NextResponse.json({
             institution: userInstitution,
             found: true, // Found institution info linked to this user
           });
      } else {
           // User found but no institution info linked OR user not found
           console.log("[Institution API - GET] User found but no institution linked, or user not found.");
           return NextResponse.json({
             institution: null,
             found: false, // No institution linked
           });
      }


    } else if (email) {
      // Lấy thông tin institution TỪ BẢNG INSTITUTIONS theo email
      console.log("[Institution API - GET] Fetching institution by email from 'institutions' table:", email);
      result = await sql`
        SELECT * FROM institutions WHERE email = ${email} LIMIT 1
      `;
        const institutionData = result[0] || null;
      console.log("[Institution API - GET] Query result by email:", institutionData);
      return NextResponse.json({
        institution: institutionData,
        found: result.length > 0
      });

    } else {
      // Lấy tất cả institutions TỪ BẢNG INSTITUTIONS
      console.log("[Institution API - GET] Fetching all institutions from 'institutions' table");
      result = await sql`
        SELECT * FROM institutions ORDER BY created_at DESC
      `;

      console.log(`[Institution API - GET] Fetched ${result.length} institutions.`);

      return NextResponse.json({
        institutions: result,
        count: result.length
      });
    }
  } catch (error: any) {
    console.error("[Institution API - GET] Error fetching institutions:", error.message || error);
    return NextResponse.json(
      { error: "Failed to fetch institutions", details: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}


// --- PUT Handler ---
export async function PUT(request: NextRequest) {
    let transactionStarted = false;
  try {
    const body = await request.json();
     console.log("[Institution API - PUT] Received request:", {
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
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Kiểm tra xem user có tồn tại không
    console.log("[Institution API - PUT] Checking user existence for wallet:", wallet_address);
    const user = await sql`
      SELECT id, institution_name FROM users WHERE wallet_address = ${wallet_address}
    `;

    if (user.length === 0) {
        console.log("[Institution API - PUT] User not found for wallet:", wallet_address);
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }
    console.log("[Institution API - PUT] User found.");


     // Check if the provided institution email exists in the institutions table.
     // This ensures they are linking to a registered institution.
    console.log("[Institution API - PUT] Checking if institution email exists in 'institutions' table:", email);
     const institutionExists = await sql`
        SELECT id, institution_name FROM institutions WHERE email = ${email} LIMIT 1
     `;

     if (!institutionExists || institutionExists.length === 0) {
         console.log("[Institution API - PUT] Institution not found with email:", email);
         return NextResponse.json(
            { error: `Institution with email ${email} not found. Please register the institution first.` },
            { status: 404 }
         );
     }
    // Optional: Check if the provided institution_name matches the one found by email.
    if (institutionExists[0].institution_name !== institution_name) {
         console.log("[Institution API - PUT] Institution name mismatch for email:", email);
         return NextResponse.json(
            { error: `Institution name '${institution_name}' does not match the registered name '${institutionExists[0].institution_name}' for email '${email}'.` },
            { status: 400 }
         );
    }
     console.log("[Institution API - PUT] Institution found and name matches.");


    // Bắt đầu transaction để cập nhật user
     console.log("[Institution API - PUT] Starting transaction...");
     transactionStarted = true;
     await sql`BEGIN`;

    try {
        // Cập nhật thông tin tổ chức cho người dùng trong bảng 'users'
        console.log("[Institution API - PUT] Updating user's institution info in 'users' table...");
        const updatedUserResult = await sql`
          UPDATE users
          SET
            institution_name = ${institution_name},
            email = ${email},
            website = ${website}
          WHERE wallet_address = ${wallet_address}
          RETURNING id, wallet_address, institution_name, email, website, created_at
        `;

        if (!updatedUserResult || updatedUserResult.length === 0) {
            await sql`ROLLBACK`;
             console.error("[Institution API - PUT] Failed to update user's institution info.");
             throw new Error("Failed to update user's institution information.");
        }
         const updatedUser = updatedUserResult[0];
        console.log("[Institution API - PUT] User info updated:", updatedUser);

        // Commit transaction
        await sql`COMMIT`;
        console.log("[Institution API - PUT] Transaction committed successfully.");


        // Return success response.
        return NextResponse.json({
          success: true,
          user: updatedUser,
          message: "User's institution information updated successfully"
        });

    } catch (dbError: any) { // Catch database errors during transaction
        console.error("[Institution API - PUT] Database error during transaction:", dbError.message || dbError);
        if (transactionStarted) {
             await sql`ROLLBACK`;
             console.log("[Institution API - PUT] Transaction rolled back due to database error.");
         }
        return NextResponse.json(
           { error: "Database error updating user's institution information", details: dbError.message || "Unknown database error" },
           { status: 500 }
        );
    }


  } catch (error: any) { // Catch other errors
    console.error("[Institution API - PUT] General error:", error.message || error);
    if (transactionStarted) {
        await sql`ROLLBACK`;
        console.log("[Institution API - PUT] Transaction rolled back due to general error.");
    }
    return NextResponse.json(
      { error: "An unexpected error occurred while updating institution", details: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// No DELETE handler provided, keeping only GET, POST, PUT.