"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  FileMusic,
  Download as DownloadIcon,
  RefreshCw,
  MoreVertical,
  Link as LinkIcon,
  Clock,
  ExternalLink,
  Copy,
  RotateCcw,
  Search as SearchIcon,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

type RecordItem = {
  filename: string
  originalUrl: string
  createdAt: string // ISO
  expiresAt: string // ISO
  size: number
  expired: boolean
  timeLeftSeconds: number
  downloadUrl: string
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function formatCountdown(seconds: number) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}分${r}秒`
}

function shortUrlDisplay(url: string) {
  try {
    const u = new URL(url)
    const pathname = decodeURIComponent(u.pathname).replace(/\/+/, "/")
    const shortPath = pathname.length > 24 ? pathname.slice(0, 24) + "…" : pathname
    return `${u.hostname}${shortPath}`
  } catch {
    return url
  }
}

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // filename 正在操作
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<"all" | "active" | "expired">("all")

  const fetchRecords = async () => {
    setError(null)
    try {
      const res = await fetch("/api/storage/records", { cache: "no-store" })
      if (!res.ok) throw new Error(`请求失败 ${res.status}`)
      const data = await res.json()
      if (!data?.success) throw new Error(data?.error || "请求失败")
      setRecords(data.records || [])
    } catch (e: any) {
      setError(e?.message || "获取记录失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
    // 每30秒刷新一次，保证“剩余时间”更准确
    const t = setInterval(fetchRecords, 30000)
    return () => clearInterval(t)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records.filter((rec) => {
      const expired = rec.expired || new Date(rec.expiresAt).getTime() <= Date.now()
      if (status === "active" && expired) return false
      if (status === "expired" && !expired) return false
      if (!q) return true
      return (
        rec.filename.toLowerCase().includes(q) ||
        rec.originalUrl.toLowerCase().includes(q)
      )
    })
  }, [records, query, status])

  const handleRegenerate = async (rec: RecordItem) => {
    try {
      setActionLoading(rec.filename)
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rec.originalUrl }),
      })
      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(text || "服务器返回异常")
      }
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `生成失败(${res.status})`)
      }
      await fetchRecords()
    } catch (e: any) {
      // 用户提示
      setError(e?.message || "重新生成失败")
    } finally {
      setActionLoading(null)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // 忽略
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">转换记录</h1>
          <p className="text-sm text-muted-foreground">本地记录保存 30 分钟，过期后可一键重新生成</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索文件名或原链接"
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="active">可下载</SelectItem>
              <SelectItem value="expired">已过期</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchRecords} className="gap-2">
            <RefreshCw className="h-4 w-4" /> 刷新
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>我的记录</CardTitle>
          <CardDescription>共 {filtered.length} 条</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-md border border-border p-3 flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[60%]" />
                    <Skeleton className="h-3 w-[40%]" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileMusic className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-base font-medium">暂无转换记录</div>
              <div className="text-sm text-muted-foreground mt-1">去首页转换一个 B 站视频试试吧</div>
              <div className="mt-4">
                <Link href="/">
                  <Button className="gap-2">
                    <RotateCcw className="h-4 w-4" /> 去转换
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((rec) => {
                const createdAt = new Date(rec.createdAt)
                const expiresAt = new Date(rec.expiresAt)
                const expired = rec.expired || expiresAt.getTime() <= Date.now()
                const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
                const relCreated = formatDistanceToNow(createdAt, { addSuffix: true, locale: zhCN })
                const relExpire = formatDistanceToNow(expiresAt, { addSuffix: true, locale: zhCN })

                return (
                  <div
                    key={rec.filename}
                    className="rounded-md border border-border p-3 flex flex-col md:flex-row md:items-center gap-3"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`h-10 w-10 rounded-md grid place-items-center ${expired ? "bg-muted" : "bg-muted"}`}>
                        <FileMusic className={`h-5 w-5 ${expired ? "text-muted-foreground" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium truncate" title={rec.filename}>{rec.filename}</div>
                          {expired ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">已过期</Badge>
                          ) : (
                            <Badge variant="outline" className="border-border text-foreground">可下载</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          <Link href={rec.originalUrl} className="inline-flex items-center gap-1 hover:underline" target="_blank">
                            <LinkIcon className="h-3.5 w-3.5" /> {shortUrlDisplay(rec.originalUrl)}
                          </Link>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                          <span>大小：{formatBytes(rec.size)}</span>
                          <span>· 创建：{relCreated}</span>
                          <span>· 过期：{relExpire}</span>
                          {!expired && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> 剩余：{formatCountdown(timeLeft)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {expired ? (
                        <Button
                          variant="default"
                          onClick={() => handleRegenerate(rec)}
                          disabled={actionLoading === rec.filename}
                          className="gap-2"
                        >
                          <RefreshCw className="h-4 w-4" /> {actionLoading === rec.filename ? "重新生成中..." : "重新生成"}
                        </Button>
                      ) : (
                        <Link href={rec.downloadUrl} target="_blank">
                          <Button variant="secondary" className="gap-2">
                            <DownloadIcon className="h-4 w-4" /> 直接下载
                          </Button>
                        </Link>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>更多操作</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={rec.originalUrl} target="_blank" className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4" /> 打开原视频
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copy(rec.originalUrl)} className="flex items-center gap-2">
                            <Copy className="h-4 w-4" /> 复制原链接
                          </DropdownMenuItem>
                          {!expired && (
                            <DropdownMenuItem onClick={() => copy(rec.downloadUrl)} className="flex items-center gap-2">
                              <Copy className="h-4 w-4" /> 复制下载链接
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled className="opacity-60">更多功能敬请期待</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}