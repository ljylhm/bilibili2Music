import { NextResponse } from "next/server"
import { fileManager } from "@/lib/file-manager"

export async function GET() {
  try {
    const records = fileManager.getAllRecords()
    const now = Date.now()

    const data = records
      .map((r) => {
        const createdAt = new Date(r.createdAt)
        const expiresAt = new Date(r.expiresAt)
        const expired = expiresAt.getTime() <= now
        const timeLeftSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000))

        return {
          filename: r.filename,
          originalUrl: r.originalUrl,
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          size: r.size,
          expired,
          timeLeftSeconds,
          downloadUrl: `/api/download/${r.filename}`,
        }
      })
      // 最近的排前面
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ success: true, records: data })
  } catch (error) {
    console.error("[records] 获取记录失败:", error)
    return NextResponse.json(
      {
        success: false,
        error: "获取记录失败",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 },
    )
  }
}