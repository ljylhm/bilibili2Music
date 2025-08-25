import { NextResponse } from "next/server"
import { fileManager } from "@/lib/file-manager"

export async function GET() {
  try {
    const stats = await fileManager.getStorageStats()

    return NextResponse.json({
      success: true,
      stats: {
        totalFiles: stats.totalFiles,
        totalSize: stats.totalSize,
        totalSizeMB: Math.round((stats.totalSize / (1024 * 1024)) * 100) / 100,
        expiredFiles: stats.expiredFiles,
      },
    })
  } catch (error) {
    console.error("[v0] 获取存储统计失败:", error)

    return NextResponse.json(
      {
        error: "获取存储统计失败",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    )
  }
}
