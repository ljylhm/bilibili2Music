import { mkdir, unlink, stat } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import crypto from "crypto"

export interface FileInfo {
  filename: string
  originalUrl: string
  createdAt: Date
  expiresAt: Date
  size: number
}

// 文件存储管理类
export class FileManager {
  private static instance: FileManager
  private tempDir: string
  private fileRegistry: Map<string, FileInfo> = new Map()
  private readonly EXPIRY_TIME = 30 * 60 * 1000 // 30分钟过期

  constructor() {
    this.tempDir = path.join(process.cwd(), "temp")
    this.ensureTempDir()
    this.startCleanupScheduler()
  }

  static getInstance(): FileManager {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager()
    }
    return FileManager.instance
  }

  // 确保临时目录存在
  private async ensureTempDir(): Promise<void> {
    if (!existsSync(this.tempDir)) {
      await mkdir(this.tempDir, { recursive: true })
    }
  }

  // 生成基于URL的唯一文件名
  generateFilename(url: string, extension: string): string {
    const hash = crypto.createHash("md5").update(url).digest("hex")
    const timestamp = Date.now()
    return `${hash}_${timestamp}.${extension}`
  }

  // 检查文件是否已存在（基于URL缓存）
  async checkExistingFile(url: string): Promise<string | null> {
    const urlHash = crypto.createHash("md5").update(url).digest("hex")

    for (const [filename, info] of this.fileRegistry.entries()) {
      if (info.originalUrl === url && info.expiresAt > new Date()) {
        const filePath = path.join(this.tempDir, filename)
        if (existsSync(filePath)) {
          console.log(`[v0] 找到缓存文件: ${filename}`)
          return filename
        } else {
          // 文件不存在，从注册表中移除
          this.fileRegistry.delete(filename)
        }
      }
    }

    return null
  }

  // 注册新文件
  async registerFile(filename: string, originalUrl: string): Promise<void> {
    const filePath = path.join(this.tempDir, filename)

    if (existsSync(filePath)) {
      const fileStats = await stat(filePath)
      const fileInfo: FileInfo = {
        filename,
        originalUrl,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.EXPIRY_TIME),
        size: fileStats.size,
      }

      this.fileRegistry.set(filename, fileInfo)
      console.log(`[v0] 已注册文件: ${filename}, 过期时间: ${fileInfo.expiresAt}`)
    }
  }

  // 获取文件信息
  getFileInfo(filename: string): FileInfo | undefined {
    return this.fileRegistry.get(filename)
  }

  // 获取文件完整路径
  getFilePath(filename: string): string {
    return path.join(this.tempDir, filename)
  }

  // 删除文件
  async deleteFile(filename: string): Promise<void> {
    const filePath = this.getFilePath(filename)

    try {
      if (existsSync(filePath)) {
        await unlink(filePath)
        console.log(`[v0] 已删除文件: ${filename}`)
      }
      this.fileRegistry.delete(filename)
    } catch (error) {
      console.error(`[v0] 删除文件失败: ${filename}`, error)
    }
  }

  // 清理过期文件
  async cleanupExpiredFiles(): Promise<void> {
    const now = new Date()
    const expiredFiles: string[] = []

    for (const [filename, info] of this.fileRegistry.entries()) {
      if (info.expiresAt <= now) {
        expiredFiles.push(filename)
      }
    }

    console.log(`[v0] 开始清理 ${expiredFiles.length} 个过期文件`)

    for (const filename of expiredFiles) {
      await this.deleteFile(filename)
    }
  }

  // 启动定期清理任务
  private startCleanupScheduler(): void {
    // 每5分钟清理一次过期文件
    setInterval(
      () => {
        this.cleanupExpiredFiles().catch((error) => {
          console.error("[v0] 定期清理任务失败:", error)
        })
      },
      5 * 60 * 1000,
    )

    console.log("[v0] 文件清理调度器已启动")
  }

  // 获取存储统计信息
  async getStorageStats(): Promise<{
    totalFiles: number
    totalSize: number
    expiredFiles: number
  }> {
    const now = new Date()
    let totalSize = 0
    let expiredFiles = 0

    for (const info of this.fileRegistry.values()) {
      totalSize += info.size
      if (info.expiresAt <= now) {
        expiredFiles++
      }
    }

    return {
      totalFiles: this.fileRegistry.size,
      totalSize,
      expiredFiles,
    }
  }
}

// 导出单例实例
export const fileManager = FileManager.getInstance()
