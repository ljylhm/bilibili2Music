import { type NextRequest, NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
import { existsSync } from "fs"
import { fileManager } from "@/lib/file-manager"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const { filename } = params

    // 验证文件名安全性
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "无效的文件名" }, { status: 400 })
    }

    // 验证文件扩展名
    if (!filename.endsWith(".mp3")) {
      return NextResponse.json({ error: "不支持的文件类型" }, { status: 400 })
    }

    const fileInfo = fileManager.getFileInfo(filename)
    const filePath = fileManager.getFilePath(filename)

    // 检查文件是否存在且未过期
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "文件不存在或已过期" }, { status: 404 })
    }

    if (fileInfo && fileInfo.expiresAt <= new Date()) {
      // 文件已过期，删除它
      await fileManager.deleteFile(filename)
      return NextResponse.json({ error: "文件已过期" }, { status: 410 })
    }

    console.log(`[v0] 开始下载文件: ${filename}`)

    // 读取文件
    const fileBuffer = await readFile(filePath)
    const fileStats = await stat(filePath)

    // 设置响应头
    const headers = new Headers()
    headers.set("Content-Type", "audio/mpeg")
    headers.set("Content-Length", fileStats.size.toString())
    headers.set("Content-Disposition", `attachment; filename="${filename}"`)
    headers.set("Cache-Control", "no-cache")

    if (fileInfo) {
      headers.set("X-File-Expires", fileInfo.expiresAt.toISOString())
    }

    // 创建响应
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers,
    })

    setTimeout(async () => {
      try {
        // 只有在文件即将过期时才删除（留给用户一些时间重新下载）
        if (fileInfo && fileInfo.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
          await fileManager.deleteFile(filename)
        }
      } catch (error) {
        console.error(`[v0] 延迟删除文件失败: ${filename}`, error)
      }
    }, 10000) // 10秒后检查删除

    return response
  } catch (error) {
    console.error(`[v0] 下载文件错误:`, error)

    return NextResponse.json(
      {
        error: "文件下载失败",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    )
  }
}
