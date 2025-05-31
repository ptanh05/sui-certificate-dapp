import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Received request body:", body);

    const {
      recipient_name,
      course_name,
      institution_name,
      recipient_wallet_address,
      issue_date,
      completion_date,
      description,
    } = body;

    // Kiểm tra các trường bắt buộc
    if (
      !recipient_name ||
      !course_name ||
      !institution_name ||
      !recipient_wallet_address ||
      !issue_date ||
      !completion_date
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO certificates (
        recipient_name, course_name, institution_name, recipient_wallet_address,
        issue_date, completion_date, description
      )
      VALUES (
        ${recipient_name}, ${course_name}, ${institution_name}, ${recipient_wallet_address},
        ${issue_date}, ${completion_date}, ${description}
      )
      RETURNING *;
    `;

    console.log("Certificate created:", result[0]);

    return NextResponse.json({ success: true, certificate: result[0] });
  } catch (error) {
    console.error("Error creating certificate:", error);
    return NextResponse.json(
      { error: "Failed to create certificate" },
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
    if (recipientWallet) {
      result = await sql`
        SELECT * FROM view_certificates 
        WHERE recipient_wallet_address = ${recipientWallet}
        ORDER BY created_at DESC
      `;
    } else if (institutionName) {
      result = await sql`
        SELECT * FROM view_certificates 
        WHERE institution_name = ${institutionName}
        ORDER BY created_at DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM view_certificates 
        ORDER BY created_at DESC 
        LIMIT 50
      `;
    }

    return NextResponse.json({ certificates: result });
  } catch (error) {
    console.error("Error fetching certificates:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}
