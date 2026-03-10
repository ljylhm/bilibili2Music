import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import { existsSync } from "fs"
import { fileManager } from "@/lib/file-manager"
import { normalizeInputUrl } from "../convert/route"

const execAsync = promisify(exec)

// 输出目录
const COLLECTIONS_DIR = path.join(process.cwd(), "collections")

// 确保输出目录存在
async function ensureCollectionsDir() {
  const fs = await import("fs")
  if (!fs.existsSync(COLLECTIONS_DIR)) {
    await fs.promises.mkdir(COLLECTIONS_DIR, { recursive: true })
  }
}

// 下载单个视频并转换为MP3
async function downloadSingleVideo(
  videoUrl: string,
  videoTitle: string,
  outputDir: string
): Promise<{ success: boolean; filename?: string; error?: string }> {
  try {
    const normalizedUrl = normalizeInputUrl(videoUrl)
    console.log(`[collection-download] 开始下载: ${videoTitle}`)
    console.log(`[collection-download] 视频URL: ${normalizedUrl}`)
    
    // 如果标题为 'NA' 或 '未知标题'，先获取真实标题
    let actualTitle = videoTitle
    if (videoTitle === 'NA' || videoTitle === '未知标题' || !videoTitle || videoTitle.trim() === '') {
      try {
        console.log(`[collection-download] 获取视频真实标题: ${normalizedUrl}`)
        const titleCommand = `yt-dlp --get-title "${normalizedUrl}"`
        const { stdout: titleStdout } = await execAsync(titleCommand, {
          timeout: 30000, // 30秒超时
          maxBuffer: 1024 * 1024 // 1MB buffer
        })
        const realTitle = titleStdout.trim()
        if (realTitle) {
          actualTitle = realTitle
          console.log(`[collection-download] 获取到真实标题: ${actualTitle}`)
        }
      } catch (titleError) {
        console.log(`[collection-download] 获取标题失败，使用默认标题: ${titleError}`)
        actualTitle = `视频_${Date.now()}`
      }
    }
    
    // 清理文件名，移除特殊字符
    const sanitizedTitle = actualTitle
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 100) // 限制长度
    
    const filename = `${sanitizedTitle}.mp3`
    const outputPath = path.join(outputDir, filename)
    
    console.log(`[collection-download] 输出路径: ${outputPath}`)
    
    // 直接使用 yt-dlp 下载并转换为 MP3，简化流程
    const command = `yt-dlp --extract-audio --audio-format mp3 --audio-quality 192K --output "${outputPath.replace('.mp3', '.%(ext)s')}" "${normalizedUrl}"`
    
    console.log(`[collection-download] 执行命令: ${command}`)
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: outputDir,
      timeout: 300000, // 5分钟超时
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    })
    
    console.log(`[collection-download] yt-dlp stdout: ${stdout}`)
    if (stderr) {
      console.log(`[collection-download] yt-dlp stderr: ${stderr}`)
    }
    
    // 验证输出文件
    const fs = await import('fs')
    if (!fs.existsSync(outputPath)) {
      throw new Error(`MP3文件未生成: ${outputPath}`)
    }
    
    const stats = await fs.promises.stat(outputPath)
    if (stats.size === 0) {
      throw new Error('生成的MP3文件为空')
    }
    
    console.log(`[collection-download] 下载成功: ${filename} (${Math.round(stats.size / 1024)}KB)`)
     return { success: true, filename }
     
   } catch (error: any) {
     console.error(`[collection-download] 下载失败 ${videoTitle}:`, error.message)
     console.error(`[collection-download] 错误详情:`, error)
     return { success: false, error: error.message || '下载失败' }
   }
}

export async function POST(req: Request) {
  try {
    const { videos, collectionTitle } = await req.json()
    
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: "缺少视频列表" }, { status: 400 })
    }
    
    if (!collectionTitle || typeof collectionTitle !== "string") {
      return NextResponse.json({ error: "缺少合集标题" }, { status: 400 })
    }
    
    await ensureCollectionsDir()
    
    // 创建合集专用目录
    const sanitizedCollectionTitle = collectionTitle
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 50)
    
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const collectionDirName = `${timestamp}_${randomId}_${sanitizedCollectionTitle}`
    const collectionDir = path.join(COLLECTIONS_DIR, collectionDirName)
    
    const fs = await import("fs")
    await fs.promises.mkdir(collectionDir, { recursive: true })
    
    console.log(`[collection-download] 开始批量下载合集: ${collectionTitle}`)
    console.log(`[collection-download] 输出目录: ${collectionDir}`)
    
    const results = []
    
    // 串行下载每个视频
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i]
      console.log(`[collection-download] 处理视频 ${i + 1}/${videos.length}: ${video.title}`)
      
      const result = await downloadSingleVideo(video.url, video.title, collectionDir)
      results.push({
        title: video.title,
        url: video.url,
        ...result
      })
      
      // 添加短暂延迟避免请求过于频繁
      if (i < videos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // 统计结果
    const successCount = results.filter(r => r.success).length
    const failedCount = results.length - successCount
    
    console.log(`[collection-download] 批量下载完成: 成功 ${successCount}/${results.length}`)
    
    return NextResponse.json({
      success: true,
      collectionDir: collectionDirName,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failedCount
      }
    })
  } catch (error: any) {
    console.error("[collection-download] 批量下载失败:", error)
    return NextResponse.json({ error: "批量下载失败" }, { status: 500 })
  }
}
