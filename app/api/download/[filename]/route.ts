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
    if (!filename.endsWith(".mp3") && !filename.endsWith(".mp4")) {
      return NextResponse.json({ error: "不支持的文件类型" }, { status: 400 })
    }

    // 尝试从fileManager获取文件信息
    let fileInfo = fileManager.getFileInfo(filename)
    let filePath = fileManager.getFilePath(filename)
    
    // 如果文件不存在，尝试从临时目录获取
    if (!existsSync(filePath)) {
      const tempDir = process.cwd() + "/temp"
      const tempFilePath = `${tempDir}/${filename}`
      
      if (existsSync(tempFilePath)) {
        filePath = tempFilePath
         // 为临时文件创建一个默认的fileInfo
         const tomorrow = new Date()
         tomorrow.setDate(tomorrow.getDate() + 1)
         fileInfo = {
           filename,
           expiresAt: tomorrow,
           createdAt: new Date()
         }
      }
    }

    // 检查文件是否存在且未过期
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "文件不存在或已过期" }, { status: 404 })
    }

    // 只有fileManager管理的文件才检查过期时间
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
    
    // 根据文件扩展名设置正确的Content-Type
    if (filename.endsWith(".mp3")) {
      headers.set("Content-Type", "audio/mpeg")
    } else if (filename.endsWith(".mp4")) {
      headers.set("Content-Type", "video/mp4")
    }
    
    headers.set("Content-Length", fileStats.size.toString())
    headers.set("Content-Disposition", `attachment; filename="${filename}"`)
    headers.set("Cache-Control", "no-cache")

    if (fileInfo) {
      headers.set("X-File-Expires", fileInfo.expiresAt.toISOString())
    }

    // 创建响应
    const response = new NextResponse(new Blob([fileBuffer]), {
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
