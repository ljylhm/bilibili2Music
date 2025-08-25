import { type NextRequest, NextResponse } from "next/server"
import { mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"
import { fileManager } from "@/lib/file-manager"
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg"

const execAsync = promisify(exec)

// 创建临时文件目录
const TEMP_DIR = path.join(process.cwd(), "temp")

async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true })
  }
}

// 验证Bilibili URL
function validateBilibiliUrl(url: string): boolean {
  const bilibiliPatterns = [
    /^https?:\/\/(www\.)?bilibili\.com\/video\/[A-Za-z0-9]+/,
    /^https?:\/\/b23\.tv\/[A-Za-z0-9]+/,
    /^https?:\/\/m\.bilibili\.com\/video\/[A-Za-z0-9]+/,
  ]

  return bilibiliPatterns.some((pattern) => pattern.test(url))
}

// 生成唯一文件名
function generateUniqueFilename(extension: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `${timestamp}_${random}.${extension}`
}

// 使用yt-dlp下载视频并转换为MP3
async function downloadAndConvertToMp3(videoUrl: string): Promise<string> {
  const existingFile = await fileManager.checkExistingFile(videoUrl)
  if (existingFile) {
    console.log(`[v0] 使用缓存文件: ${existingFile}`)
    return existingFile
  }

  let inputPath: string | undefined
  try {
    await ensureTempDir()

    // 第一步：只下载，不转码
    const dl = await downloadVideoToTemp(videoUrl)
    inputPath = dl.inputPath

    // 第二步：将下载好的文件转为 mp3
    const outputFilename = await convertFileToMp3(inputPath, videoUrl)
    return outputFilename
  } catch (error) {
    console.error(`[v0] 下载/转码流程出错:`, error)
    throw error
  } finally {
    // 清理临时下载的源文件
    if (inputPath) {
      try {
        const fs = await import("fs")
        if (fs.existsSync(inputPath)) {
          await fs.promises.unlink(inputPath)
          console.log(`[v0] 已清理临时文件: ${inputPath}`)
        }
      } catch (cleanupError) {
        console.error(`[v0] 清理临时文件失败:`, cleanupError)
      }
    }
  }
}

// 先下载视频/音频到临时目录（不转码）
async function downloadVideoToTemp(videoUrl: string): Promise<{ inputPath: string }> {
  await ensureTempDir()

  // 生成唯一前缀，便于找到下载后的文件
  const baseName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const outputTemplate = path.join(TEMP_DIR, `${baseName}.%(ext)s`)
  const command = `yt-dlp -f bestaudio/best --no-playlist --restrict-filenames -o "${outputTemplate}" "${videoUrl}"`

  console.log(`[v0] 执行下载命令: ${command}`)

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5分钟
      maxBuffer: 1024 * 1024 * 10,
    })
    if (stdout) console.log(`[v0] yt-dlp输出: ${stdout}`)
    if (stderr) console.log(`[v0] yt-dlp错误信息: ${stderr}`)
  } catch (execError: any) {
    console.error(`[v0] yt-dlp下载失败:`, execError)
    if (execError.code === "ETIMEDOUT") {
      throw new Error("下载超时，请稍后重试")
    }
    throw new Error(`视频下载失败: ${execError.message || "未知错误"}`)
  }

  // 下载成功后，在 TEMP_DIR 中查找以 baseName 开头的文件（真实扩展名可能为 .m4a/.webm/.mp4 等）
  const fs = await import("fs")
  const files = await fs.promises.readdir(TEMP_DIR)
  const matched = files.find((f) => f.startsWith(`${baseName}.`))
  if (!matched) {
    console.error("[v0] 未找到下载后的文件，baseName:", baseName)
    throw new Error("下载完成但未找到输出文件")
  }

  const inputPath = path.join(TEMP_DIR, matched)
  console.log("[v0] 下载完成，文件路径:", inputPath)
  return { inputPath }
}

// 将已下载的文件转换为 MP3
export const runtime = "nodejs" // 确保使用 Node.js 运行时（而非 Edge）

// 解析可用的 ffmpeg 可执行路径：环境变量 > 常见 Homebrew 路径 > 裸命令
function resolveFfmpegBin(): string {
  try {
    if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
      return process.env.FFMPEG_PATH
    }
  } catch {}

  const candidates = [
    "/opt/homebrew/bin/ffmpeg", // Apple Silicon 常见路径
    "/usr/local/bin/ffmpeg",    // Intel Mac 常见路径
  ]
  for (const p of candidates) {
    try {
      if (existsSync(p)) return p
    } catch {}
  }
  // 兜底使用 PATH
  return "ffmpeg"
}

async function convertFileToMp3(inputPath: string, videoUrl: string): Promise<string> {
  const outputFilename = fileManager.generateFilename(videoUrl, "mp3")
  const outputPath = fileManager.getFilePath(outputFilename)
  const ffmpegBin = resolveFfmpegBin()
  const command = `"${ffmpegBin}" -y -i "${inputPath}" -vn -acodec libmp3lame -b:a 192k "${outputPath}"`

  console.log(`[v0] 使用的ffmpeg路径: ${ffmpegBin}`)
  console.log(`[v0] 执行转码命令: ${command}`)
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5分钟
      maxBuffer: 1024 * 1024 * 10,
    })
    if (stdout) console.log(`[v0] ffmpeg输出: ${stdout}`)
    if (stderr) console.log(`[v0] ffmpeg错误信息: ${stderr}`)
  } catch (execError: any) {
    console.error(`[v0] ffmpeg转码失败:`, execError)
    if (execError.code === "ETIMEDOUT") {
      throw new Error("转码超时，请稍后重试")
    }
    throw new Error(`音频转码失败: ${execError.message || "未知错误"}`)
  }

  // 校验输出文件
  const fs = await import("fs")
  if (!fs.existsSync(outputPath)) {
    console.error(`[v0] 输出MP3文件不存在: ${outputPath}`)
    throw new Error("MP3文件生成失败，请检查视频链接是否有效")
  }
  const stats = await fs.promises.stat(outputPath)
  if (stats.size === 0) {
    throw new Error("生成的MP3文件为空")
  }

  await fileManager.registerFile(outputFilename, videoUrl)
  console.log(`[v0] 文件注册成功: ${outputFilename}, 大小: ${stats.size} bytes`)
  return outputFilename
}

export async function POST(request: NextRequest) {
  try {
    console.log(`[v0] 收到转换请求`)

    let requestBody
    try {
      requestBody = await request.json()
    } catch (parseError) {
      console.error(`[v0] 请求体解析失败:`, parseError)
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
    }

    const { url } = requestBody

    // 验证输入
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "请提供有效的视频链接" }, { status: 400 })
    }

    // 验证是否为Bilibili链接
    if (!validateBilibiliUrl(url)) {
      return NextResponse.json({ error: "请提供有效的Bilibili视频链接" }, { status: 400 })
    }

    console.log(`[v0] 开始处理视频链接: ${url}`)

    // 下载并转换视频
    const filename = await downloadAndConvertToMp3(url)

    // 生成下载链接
    const downloadUrl = `/api/download/${filename}`

    const fileInfo = fileManager.getFileInfo(filename)

    console.log(`[v0] 转换完成，文件: ${filename}`)

    return NextResponse.json({
      success: true,
      downloadUrl,
      filename,
      fileSize: fileInfo?.size,
      expiresAt: fileInfo?.expiresAt,
    })
  } catch (error) {
    console.error(`[v0] API错误:`, error)

    const errorMessage = error instanceof Error ? error.message : "服务器内部错误"
    const errorDetails =
      process.env.NODE_ENV === "development"
        ? {
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined,
          }
        : undefined

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
