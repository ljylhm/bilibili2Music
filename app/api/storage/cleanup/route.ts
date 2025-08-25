import { NextResponse } from "next/server"
import { fileManager } from "@/lib/file-manager"

export async function POST() {
  try {
    await fileManager.cleanupExpiredFiles()
    const stats = await fileManager.getStorageStats()

    return NextResponse.json({
      success: true,
      message: "清理完成",
      remainingFiles: stats.totalFiles,
    })
  } catch (error) {
    console.error("[v0] 手动清理失败:", error)

    return NextResponse.json(
      {
        error: "清理失败",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    )
  }
}
