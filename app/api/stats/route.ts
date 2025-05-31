import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Thống kê tổng quan
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM institutions) as total_institutions,
        (SELECT COUNT(*) FROM certificates) as total_certificates,
        (SELECT COUNT(*) FROM transactions) as total_transactions,
        (SELECT COUNT(*) FROM transactions WHERE status = true) as successful_transactions
    `

    // Thống kê certificates theo ngày (7 ngày gần nhất)
    const dailyStats = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as certificates_count
      FROM certificates
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `

    // Top institutions theo số certificates
    const topInstitutions = await sql`
      SELECT 
        institution_name,
        COUNT(*) as certificates_count
      FROM certificates
      GROUP BY institution_name
      ORDER BY certificates_count DESC
      LIMIT 5
    `

    return NextResponse.json({
      overview: stats[0],
      daily_certificates: dailyStats,
      top_institutions: topInstitutions,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
