import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import crypto from "crypto"
import { validateSupportedUrl, downloadVideoToTemp } from "../convert/route"

// 视频下载API端点
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    // 验证URL是否受支持
    const validationResult = validateSupportedUrl(url)
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.error || "不支持的URL" },
        { status: 400 }
      )
    }

    // 下载视频到临时目录
    const tempDir = path.join(process.cwd(), "temp")
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // 生成唯一文件名
    const uniqueId = crypto.randomBytes(4).toString('hex')
    const timestamp = Date.now()
    
    // 根据URL确定合适的文件扩展名
    let fileExt = "mp4"
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      fileExt = "mp4"
    } else if (url.includes("bilibili.com") || url.includes("b23.tv")) {
      fileExt = "mp4"
    } else if (url.includes("douyin.com") || url.includes("iesdouyin.com")) {
      fileExt = "mp4"
    } else if (url.includes("xiaohongshu.com") || url.includes("xhslink.com")) {
      fileExt = "mp4"
    }
    
    const filename = `${timestamp}_${uniqueId}_video.${fileExt}`
    const outputPath = path.join(tempDir, filename)

    // 下载视频
    const downloadResult = await downloadVideoToTemp(url, outputPath)
    if (!downloadResult.success && downloadResult.error) {
      return NextResponse.json(
        { error: downloadResult.error || "下载视频失败" },
        { status: 500 }
      )
    }

    // 获取文件大小
    const stats = fs.statSync(outputPath)
    const fileSize = stats.size

    // 设置过期时间（24小时后）
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // 返回下载信息
    return NextResponse.json({
      success: true,
      downloadUrl: `/api/download/${filename}`,
      filename,
      fileSize,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error: any) {
    console.error("视频下载失败:", error)
    return NextResponse.json(
      { error: error.message || "处理请求时出错" },
      { status: 500 }
    )
  }
}