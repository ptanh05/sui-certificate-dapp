import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { Buffer } from 'buffer';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    // Parse FormData instead of JSON
    const formData = await request.formData();
    console.log("[Certificates API - POST] Received request.");

    const object_id = formData.get('object_id') as string;
    const recipient_name = formData.get('recipient_name') as string;
    const course_name = formData.get('course_name') as string;
    const institution_name = formData.get('institution_name') as string;
    const recipient_wallet_address = formData.get('recipient_wallet_address') as string;
    const issue_date = formData.get('issue_date') as string;
    const completion_date = formData.get('completion_date') as string;
    const description = formData.get('description') as string;
    const name = formData.get('name') as string;
    const url = formData.get('url') as string; // Original URL from form (if any)
    const issuer_address = formData.get('issuer_address') as string;
    const transaction_hash = formData.get('transaction_hash') as string;

    // Kiểm tra các trường bắt buộc
    if (
      !object_id ||
      !recipient_name ||
      !course_name ||
      !institution_name ||
      !recipient_wallet_address ||
      !issue_date ||
      !completion_date ||
      !issuer_address ||
      !transaction_hash ||
      !name
    ) {
      console.error("[Certificates API - POST] Missing required fields in form data.");
      // Log specific missing fields for easier debugging
      const missingFields = [];
      if (!object_id) missingFields.push('object_id');
      if (!recipient_name) missingFields.push('recipient_name');
      if (!course_name) missingFields.push('course_name');
      if (!institution_name) missingFields.push('institution_name');
      if (!recipient_wallet_address) missingFields.push('recipient_wallet_address');
      if (!issue_date) missingFields.push('issue_date');
      if (!completion_date) missingFields.push('completion_date');
      if (!issuer_address) missingFields.push('issuer_address');
      if (!transaction_hash) missingFields.push('transaction_hash');
      if (!name) missingFields.push('name');

      console.error("[Certificates API - POST] Missing fields:", missingFields.join(', '));

      return NextResponse.json(
        { error: "Missing required fields", details: `Missing: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Xử lý file ảnh nếu có
    const imageFile = formData.get('image') as File | null;
    let finalUrl = url; // Mặc định dùng URL từ form nếu không có file
    
    if (imageFile) {
      console.log(`[Certificates API - POST] Image file received: ${imageFile.name}, size: ${imageFile.size}`);
      // Bỏ qua việc upload lên Pinata, chỉ log thông tin file
      console.log("[Certificates API - POST] Skipping Pinata upload, using original URL if available.");
    } else {
        console.log("[Certificates API - POST] No image file received.");
    }

    console.log("[Certificates API - POST] Attempting to insert certificate into DB with URL:", finalUrl);

    const result = await sql`
      INSERT INTO certificates (
        object_id,
        recipient_name,
        course_name,
        institution_name,
        recipient_wallet_address,
        issue_date,
        completion_date,
        description,
        name,
        url,
        issuer_address,
        transaction_hash
      )
      VALUES (
        ${object_id},
        ${recipient_name},
        ${course_name},
        ${institution_name},
        ${recipient_wallet_address},
        ${issue_date},
        ${completion_date},
        ${description},
        ${name},
        ${finalUrl}, -- Use the final URL (from Pinata or original form)
        ${issuer_address},
        ${transaction_hash}
      )
      RETURNING *;
    `;

    console.log("[Certificates API - POST] Certificate created in DB:", result[0]?.id);

    return NextResponse.json({ success: true, certificate: result[0] });
  } catch (error: unknown) {
    console.error("[Certificates API - POST] General error:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { 
        error: "Failed to create certificate", 
        details: error instanceof Error ? error.message : "Unknown error",
        success: false
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recipientWallet = searchParams.get("recipient_wallet");
    const institutionName = searchParams.get("institution_name");

    let result;
    // Sử dụng parameterized query thay vì unsafe
    if (recipientWallet) {
      result = await sql`
        SELECT
          c.id,
          c.recipient_name,
          c.course_name,
          c.institution_name,
          c.recipient_wallet_address,
          c.issue_date,
          c.completion_date,
          c.description,
          c.object_id,
          c.name,
          c.url,
          c.issuer_address,
          c.transaction_hash,
          t.txHash,
          c.created_at
        FROM certificates c
        LEFT JOIN transactions t ON c.transaction_hash = t.txHash
        WHERE c.recipient_wallet_address = ${recipientWallet}
        ORDER BY c.created_at DESC
      `;
    } else if (institutionName) {
      result = await sql`
        SELECT
          c.id,
          c.recipient_name,
          c.course_name,
          c.institution_name,
          c.recipient_wallet_address,
          c.issue_date,
          c.completion_date,
          c.description,
          c.object_id,
          c.name,
          c.url,
          c.issuer_address,
          c.transaction_hash,
          t.txHash,
          c.created_at
        FROM certificates c
        LEFT JOIN transactions t ON c.transaction_hash = t.txHash
        WHERE c.institution_name = ${institutionName}
        ORDER BY c.created_at DESC
      `;
    } else {
      result = await sql`
        SELECT
          c.id,
          c.recipient_name,
          c.course_name,
          c.institution_name,
          c.recipient_wallet_address,
          c.issue_date,
          c.completion_date,
          c.description,
          c.object_id,
          c.name,
          c.url,
          c.issuer_address,
          c.transaction_hash,
          t.txHash,
          c.created_at
        FROM certificates c
        LEFT JOIN transactions t ON c.transaction_hash = t.txHash
        ORDER BY c.created_at DESC
        LIMIT 50
      `;
    }

    // DEBUG: Log dữ liệu trước khi gửi đi
    console.log("[Certificate API - GET] Fetched certificates data.", { count: result.length });

    // Đảm bảo mỗi certificate có đầy đủ thông tin
    const certificates = result.map((cert: any) => ({
      ...cert,
      txHash: cert.txHash || cert.transaction_hash, // Fallback to transaction_hash if txHash is null
      transaction_hash: cert.transaction_hash || cert.txHash // Fallback to txHash if transaction_hash is null
    }));

    return NextResponse.json({ 
      certificates,
      count: certificates.length,
      success: true 
    });
  } catch (error: unknown) {
    console.error("[Certificate API - GET] Error fetching certificates:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { 
        error: "Failed to fetch certificates", 
        details: error instanceof Error ? error.message : "Unknown error",
        success: false 
      },
      { status: 500 }
    );
  }
}