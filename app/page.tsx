"use client"

import { useState, type ClipboardEvent, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Download, Music, Video, AlertCircle, RotateCcw } from "lucide-react"
import { ConversionProgress } from "@/components/conversion-progress"
import { useConversion } from "@/hooks/use-conversion"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState("")
  // 元数据展示：标题与封面
  const [meta, setMeta] = useState<{ title: string; coverUrl: string } | null>(null)
  const [metaLoading, setMetaLoading] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  const {
    isConverting,
    steps,
    currentStep,
    overallProgress,
    downloadUrl,
    fileName,
    fileSize,
    expiresAt,
    error,
    startConversion,
    resetConversion,
  } = useConversion()

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
    return h === "b23.tv" || h === "bilibili.com" || h.endsWith(".bilibili.com")
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

  // 从任意文本中提取第一个受支持的链接（例如“【标题】 https://b23.tv/xxxx”）
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

  // 新增：重置逻辑，清空元数据
  const handleReset = () => {
    resetConversion()
    setVideoUrl("")
    setMeta(null)
    setMetaError(null)
  }

  const handleConvert = async () => {
    // 兜底：将输入中的文本再次提取
    const cleaned = extractFirstSupportedUrl(videoUrl) || videoUrl
    if (!isSupportedUrl(cleaned)) {
      return
    }
    await startConversion(cleaned)
  }

  // 批量处理：并发启动每个任务
  const handleBatchConvert = async () => {
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

      const response = await fetch("/api/convert", {
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
        throw new Error(data?.error || `转换失败(${response.status})`)
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
      const msg = err?.message || "转换过程中出现错误"
      setBatchTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error", error: msg } : t)))
    }
  }

  // 保证是布尔值
  const isCompleted = overallProgress === 100 && !isConverting && !!downloadUrl

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
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-7 w-7 text-foreground/60" />
              <h1 className="text-xl font-semibold text-foreground">Bilibili 转 MP3</h1>
            </div>
            <nav className="hidden md:flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/records">我的记录</Link>
              </Button>
              <Button variant="ghost" size="sm" className="opacity-60" disabled>
                关于
              </Button>
              <Button variant="ghost" size="sm" className="opacity-60" disabled>
                常见问题
              </Button>
              <Button variant="ghost" size="sm" className="opacity-60" disabled>
                联系我们
              </Button>
            </nav>
            {/* Mobile: 单独展示“我的记录”入口 */}
            <div className="md:hidden">
              <Button asChild size="sm" variant="outline">
                <Link href="/records">我的记录</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="mx-auto mb-6 h-16 w-16 rounded-xl bg-muted grid place-items-center">
              <Video className="h-8 w-8 text-foreground/60" />
            </div>
            <h2 className="text-4xl font-bold text-foreground mb-3">轻松将 Bilibili 视频转换为 MP3</h2>
            <p className="text-base md:text-lg text-foreground/70">快速、简单的在线视频转音频工具</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Badge variant="secondary">支持 b23.tv 短链</Badge>
              <Badge variant="secondary">自动获取标题与封面</Badge>
              <Badge variant="secondary">无广告</Badge>
            </div>
          </div>

          {/* Conversion Progress (单个模式) */}
          {!batchMode && (isConverting || isCompleted || error) && (
            <div className="mb-8">
              <ConversionProgress
                steps={steps}
                currentStep={currentStep}
                overallProgress={overallProgress}
                isCompleted={isCompleted}
                downloadUrl={downloadUrl}
                fileName={fileName}
                fileSize={fileSize}
                expiresAt={expiresAt}
              />

              {(isCompleted || error) && (
                <div className="mt-4 flex justify-center">
                  <Button onClick={handleReset} variant="outline" className="gap-2 w-full md:w-auto">
                    <RotateCcw className="h-4 w-4" />
                    转换新视频
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Conversion Card */}
          {!isConverting && !isCompleted && !error && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-foreground/60" />
                  开始转换
                </CardTitle>
                <CardDescription>粘贴 Bilibili 视频链接（支持单个或批量，批量以分号分隔）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    {/* 模式切换 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">输入模式</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground/70">单个</span>
                        <Switch checked={batchMode} onCheckedChange={setBatchMode} />
                        <span className="text-sm text-foreground/70">批量</span>
                      </div>
                    </div>

                    {/* 输入区 */}
                    {batchMode ? (
                      <div className="space-y-2">
                        <label htmlFor="batch-input" className="text-sm font-medium text-foreground">
                          批量链接（以分号分隔）
                        </label>
                        <Textarea
                          id="batch-input"
                          placeholder="https://www.bilibili.com/video/BV...; https://b23.tv/...; https://m.bilibili.com/video/BV..."
                          value={batchInput}
                          onChange={(e) => setBatchInput(e.target.value)}
                          className="w-full max-w-full break-all whitespace-pre-wrap resize-y overflow-x-hidden"
                          rows={6}
                        />
                        <p className="text-xs text-foreground/60">有效链接：{parseBatchInput(batchInput).length} 个</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label htmlFor="video-url" className="text-sm font-medium text-foreground">
                          视频链接
                        </label>
                        <Input
                          id="video-url"
                          type="url"
                          placeholder="https://www.bilibili.com/video/BV... 或 https://b23.tv/..."
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
                    )}

                    {/* 操作按钮 */}
                    <Button
                      onClick={batchMode ? handleBatchConvert : handleConvert}
                      disabled={batchMode ? parseBatchInput(batchInput).length === 0 : !isSupportedUrl(videoUrl)}
                      size="lg"
                      className="w-full"
                    >
                      <Music className="h-4 w-4 mr-2" />
                      {batchMode ? `开始批量转换 (${parseBatchInput(batchInput).length})` : "转换为 MP3"}
                    </Button>
                  </div>

                  {/* 右侧预览（单个模式可用） */}
                  <div>
                    <Card className="bg-muted/30">
                      <CardHeader>
                        <CardTitle className="text-base">视频预览</CardTitle>
                        <CardDescription>根据链接自动获取</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {!batchMode && !isSupportedUrl(videoUrl) ? (
                          <div className="text-sm text-foreground/70">粘贴一个有效的 B 站链接以预览</div>
                        ) : !batchMode && metaLoading ? (
                          <div className="space-y-3">
                            <Skeleton className="h-24 w-full rounded" />
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-3 w-1/3" />
                          </div>
                        ) : !batchMode && meta ? (
                          <div className="flex gap-3 items-start">
                            <div className="w-40">
                              <AspectRatio ratio={16 / 9}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={meta.coverUrl} alt="视频封面" className="h-full w-full object-cover rounded" />
                              </AspectRatio>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-foreground/60 mb-1">校验成功</div>
                              <div className="text-sm font-medium text-foreground break-words">{meta.title}</div>
                            </div>
                          </div>
                        ) : !batchMode && metaError ? (
                          <Alert variant="destructive">
                            <AlertDescription>{metaError}</AlertDescription>
                          </Alert>
                        ) : (
                          <div className="text-sm text-foreground/70">{batchMode ? "批量模式下不提供预览" : "检测到有效链接，正在准备预览"}</div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 批量结果列表 */}
          {batchMode && batchTasks.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>批量结果</CardTitle>
                <CardDescription>并行处理多个链接，完成后可直接下载</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {batchTasks.map((task) => (
                  <div key={task.id} className="rounded-md border border-border p-3 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" title={task.url}>{task.url}</div>
                      <div className="text-xs text-foreground/60">
                        {task.status === "in-progress"
                          ? "处理中…"
                          : task.status === "completed"
                          ? "已完成"
                          : task.status === "error"
                          ? `错误：${task.error || ""}`
                          : "等待中"}
                      </div>
                      <div className="mt-2">
                        <Progress value={task.progress} className="h-1" />
                      </div>
                    </div>
                    {task.status === "completed" && task.downloadUrl && (
                      <a
                        href={task.downloadUrl}
                        download
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm hover:bg-primary/90"
                      >
                        <Download className="h-4 w-4" /> 下载 MP3
                      </a>
                    )}
                  </div>
                ))}
                <div className="pt-2 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setBatchTasks([])}>
                    清空列表
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-8">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-foreground/80">
                <li>复制 Bilibili 视频的完整链接</li>
                <li>将链接粘贴到上方的输入框中</li>
                <li>点击“转换为 MP3”按钮开始转换</li>
                <li>等待转换完成后下载 MP3 文件</li>
              </ol>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-foreground/70">
                  <strong>支持的链接格式：</strong>
                  <br />• https://www.bilibili.com/video/BV...
                  <br />• https://b23.tv/...
                  <br />• https://m.bilibili.com/video/BV...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-foreground/70">
            <p>&copy; 2024 Bilibili 转 MP3 工具. 仅供个人学习使用.</p>
            <div className="flex justify-center gap-6 mt-4">
              <span className="hover:text-foreground transition-colors cursor-not-allowed opacity-60" aria-disabled="true" title="暂未开放">
                服务条款
              </span>
              <span className="hover:text-foreground transition-colors cursor-not-allowed opacity-60" aria-disabled="true" title="暂未开放">
                隐私政策
              </span>
              <span className="hover:text-foreground transition-colors cursor-not-allowed opacity-60" aria-disabled="true" title="暂未开放">
                技术支持
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
