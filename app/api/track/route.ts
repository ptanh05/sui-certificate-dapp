import { type NextRequest, NextResponse } from "next/server"

type LogEntry = {
  address: string
  action: string
  digest: string
  timestamp: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LogEntry
    const { address, action, digest, timestamp } = body

    const logEntry = { address, action, digest, timestamp }

    // Trong môi trường production thực tế, bạn sẽ lưu vào database
    // Đây chỉ là mock để demo
    console.log("Log entry:", logEntry)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error logging action:", error)
    return NextResponse.json({ error: "Failed to log action" }, { status: 500 })
  }
}
