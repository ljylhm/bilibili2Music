"use client"

import { useState, type ClipboardEvent, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Download, Video, AlertCircle, RotateCcw } from "lucide-react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { VideoPreview } from "@/components/video-preview"
import { UsageInstructions } from "@/components/usage-instructions"

export default function VideoPage() {
  const [videoUrl, setVideoUrl] = useState("")
  // 元数据展示：标题与封面
  const [meta, setMeta] = useState<{ title: string; coverUrl: string } | null>(null)
  const [metaLoading, setMetaLoading] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  
  // 下载状态
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 批量模式状态
  const [batchMode, setBatchMode] = useState(false)
  const [batchInput, setBatchInput] = useState("")
  type BatchTask = {
    id: string
    url: string
    status: "pending" | "in-progress" | "completed" | "error"
    progress: number
    downloadUrl?: string
    filename?: string
    fileSize?: number
    expiresAt?: string
    error?: string
  }
  const [batchTasks, setBatchTasks] = useState<BatchTask[]>([])

  // 受支持域名判断
  const isSupportedHost = (host: string) => {
    const h = host.toLowerCase()
    return (
      // Bilibili
      h === "b23.tv" || h === "bilibili.com" || h.endsWith(".bilibili.com") ||
      // 小红书
      h === "xiaohongshu.com" || h.endsWith(".xiaohongshu.com") || h === "xhslink.com" ||
      // 抖音
      h === "douyin.com" || h.endsWith(".douyin.com") || h === "iesdouyin.com" || h.endsWith(".iesdouyin.com") || h === "v.douyin.com" ||
      // YouTube
      h === "youtube.com" || h.endsWith(".youtube.com") || h === "youtu.be" || h === "m.youtube.com"
    )
  }

  // 是否受支持的有效 URL
  const isSupportedUrl = (url: string) => {
    try {
      const u = new URL(url.trim())
      return isSupportedHost(u.hostname)
    } catch {
      return false
    }
  }

  // 从任意文本中提取第一个受支持的链接（例如"【标题】 https://b23.tv/xxxx"）
  const extractFirstSupportedUrl = (text: string) => {
    const regex = /(https?:\/\/[^\s<>"]+)/gi
    const matches = text.match(regex) || []
    for (const m of matches) {
      try {
        const u = new URL(m)
        if (isSupportedHost(u.hostname)) {
          return u.toString()
        }
      } catch {
        // ignore
      }
    }
    return ""
  }

  // 批量解析：分号或换行分隔，去重并仅保留受支持链接
  const parseBatchInput = (text: string) => {
    const parts = text
      .split(/[;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const urls: string[] = []
    for (const raw of parts) {
      const extracted = extractFirstSupportedUrl(raw) || raw
      if (isSupportedUrl(extracted) && !urls.includes(extracted)) {
        urls.push(extracted)
      }
    }
    return urls
  }

  // 粘贴时拦截清洗内容（单个模式）
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData("text") || ""
    const extracted = extractFirstSupportedUrl(raw)
    if (extracted) {
      e.preventDefault()
      setVideoUrl(extracted)
    }
  }

  // 重置下载状态
  const handleReset = () => {
    setVideoUrl("")
    setMeta(null)
    setMetaError(null)
    setIsDownloading(false)
    setDownloadProgress(0)
    setDownloadUrl(null)
    setFileName(null)
    setFileSize(null)
    setExpiresAt(null)
    setError(null)
  }

  // 下载视频
  const handleDownload = async () => {
    // 兜底：将输入中的文本再次提取
    const cleaned = extractFirstSupportedUrl(videoUrl) || videoUrl
    if (!isSupportedUrl(cleaned)) {
      return
    }

    setIsDownloading(true)
    setDownloadProgress(10)
    setError(null)

    try {
      // 创建一个新的API端点用于视频下载
      const response = await fetch("/api/video-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleaned }),
      })

      setDownloadProgress(50)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `下载失败(${response.status})`)
      }

      const data = await response.json()
      setDownloadProgress(100)
      setDownloadUrl(data.downloadUrl)
      setFileName(data.filename)
      setFileSize(data.fileSize)
      setExpiresAt(data.expiresAt)
    } catch (err: any) {
      setError(err.message || "下载过程中出现错误")
    } finally {
      setIsDownloading(false)
    }
  }

  // 批量处理：并发启动每个任务
  const handleBatchDownload = async () => {
    const urls = parseBatchInput(batchInput)
    if (urls.length === 0) return

    // 初始化任务列表
    const initialTasks: BatchTask[] = urls.map((u, idx) => ({
      id: `${Date.now()}-${idx}`,
      url: u,
      status: "pending",
      progress: 0,
    }))
    setBatchTasks(initialTasks)

    // 并发执行
    initialTasks.forEach((task) => {
      runBatchTask(task.id, task.url)
    })
  }

  const runBatchTask = async (id: string, url: string) => {
    // 设置为进行中
    setBatchTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "in-progress", progress: 15 } : t)))

    try {
      // 模拟进度
      setBatchTasks((prev) => prev.map((t) => (t.id === id ? { ...t, progress: 35 } : t)))

      const response = await fetch("/api/video-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const contentType = response.headers.get("content-type") || ""
      if (!contentType.includes("application/json")) {
        const text = await response.text().catch(() => "")
        throw new Error(text || "服务器返回了非JSON格式的响应")
      }

      const data = await response.json()
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `下载失败(${response.status})`)
      }

      // 接近完成
      setBatchTasks((prev) => prev.map((t) => (t.id === id ? { ...t, progress: 85 } : t)))

      // 完成
      setBatchTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status: "completed",
                progress: 100,
                downloadUrl: data.downloadUrl,
                filename: data.filename,
                fileSize: data.fileSize,
                expiresAt: data.expiresAt,
              }
            : t,
        ),
      )
    } catch (err: any) {
      const msg = err?.message || "下载过程中出现错误"
      setBatchTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error", error: msg } : t)))
    }
  }

  useEffect(() => {
    // 每次输入变化都先清空之前的元数据和错误（仅单个模式）
    if (batchMode) return
    setMeta(null)
    setMetaError(null)

    const candidate = extractFirstSupportedUrl(videoUrl) || videoUrl
    if (!isSupportedUrl(candidate)) {
      setMetaLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setMetaLoading(true)
      try {
        const res = await fetch("/api/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: candidate }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const msg = await res.text().catch(() => "")
          throw new Error(msg || "获取视频信息失败")
        }
        const data = await res.json()
        if (data?.title && data?.coverDataUrl) {
          setMeta({ title: data.title, coverUrl: data.coverDataUrl })
        } else {
          setMetaError("未获取到视频信息")
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setMetaError("获取视频信息失败")
        }
      } finally {
        setMetaLoading(false)
      }
    }, 400)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [videoUrl, batchMode])

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="mx-auto mb-6 h-16 w-16 rounded-xl bg-muted grid place-items-center">
              <Video className="h-8 w-8 text-foreground/60" />
            </div>
            <h2 className="text-4xl font-bold text-foreground mb-3">多平台视频下载工具</h2>
            <p className="text-base md:text-lg text-foreground/70">支持 Bilibili、小红书、抖音、YouTube 等平台</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Badge variant="secondary">支持多平台</Badge>
              <Badge variant="secondary">批量下载</Badge>
              <Badge variant="secondary">自动获取标题与封面</Badge>
              <Badge variant="secondary">无广告</Badge>
            </div>
          </div>

          {/* 下载进度 */}
          {!batchMode && (isDownloading || downloadUrl || error) && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">下载状态</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isDownloading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>正在下载视频...</span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <Progress value={downloadProgress} className="h-2" />
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {downloadUrl && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-md bg-muted/50">
                      <div className="text-sm font-medium mb-1">下载信息</div>
                      <div className="text-xs text-foreground/70 space-y-1">
                        <div>文件名: {fileName}</div>
                        {fileSize && <div>文件大小: {(fileSize / (1024 * 1024)).toFixed(2)} MB</div>}
                        {expiresAt && <div>有效期至: {new Date(expiresAt).toLocaleString()}</div>}
                      </div>
                    </div>

                    <div className="flex justify-center gap-4">
                      <Button asChild>
                        <a href={downloadUrl} download>
                          <Download className="mr-2 h-4 w-4" /> 下载视频
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {(downloadUrl || error) && (
                  <div className="mt-4 flex justify-center">
                    <Button onClick={handleReset} variant="outline" className="gap-2 w-full md:w-auto">
                      <RotateCcw className="h-4 w-4" />
                      下载新视频
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 下载卡片 */}
          {!isDownloading && !downloadUrl && !error && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-foreground/60" />
                  视频下载
                </CardTitle>
                <CardDescription>粘贴视频链接（支持 Bilibili、小红书、抖音、YouTube）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    {/* 输入区 */}
                    <div className="space-y-2">
                      <label htmlFor="video-url" className="text-sm font-medium text-foreground">
                        视频链接
                      </label>
                      <Input
                        id="video-url"
                        type="url"
                        placeholder="支持 Bilibili、YouTube、小红书、抖音等平台链接"
                        value={videoUrl}
                        onPaste={handlePaste}
                        onChange={(e) => {
                          const text = e.target.value
                          const extracted = extractFirstSupportedUrl(text)
                          setVideoUrl(extracted || text)
                        }}
                        className="w-full"
                      />
                    </div>

                    {/* 操作按钮 */}
                    <Button
                      onClick={handleDownload}
                      disabled={!isSupportedUrl(videoUrl)}
                      size="lg"
                      className="w-full"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      下载视频
                    </Button>
                  </div>

                  {/* 右侧预览 */}
                  <div>
                    <VideoPreview
                      batchMode={batchMode}
                      videoUrl={videoUrl}
                      isSupportedUrl={isSupportedUrl}
                      metaLoading={metaLoading}
                      meta={meta}
                      metaError={metaError}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 使用说明 */}
          <UsageInstructions />
        </div>
      </main>

      <Footer />
    </div>
  )
}