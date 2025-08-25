import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Download, FileAudio, Loader2 } from "lucide-react"

export interface ConversionStep {
  id: string
  name: string
  status: "pending" | "in-progress" | "completed" | "error"
  progress?: number
  message?: string
}

interface ConversionProgressProps {
  steps: ConversionStep[]
  currentStep: string
  overallProgress: number
  isCompleted: boolean
  downloadUrl?: string
  fileName?: string
  fileSize?: number
  expiresAt?: string
}

export function ConversionProgress({
  steps,
  currentStep,
  overallProgress,
  isCompleted,
  downloadUrl,
  fileName,
  fileSize,
  expiresAt,
}: ConversionProgressProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatExpiryTime = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt)
    const now = new Date()
    const diffMinutes = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60))
    return `${diffMinutes} 分钟后过期`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isCompleted ? (
            <FileAudio className="h-5 w-5 text-primary" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          转换进度
        </CardTitle>
        <CardDescription>{isCompleted ? "转换已完成，可以下载文件" : "正在处理您的视频，请稍候..."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 总体进度条 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">总体进度</span>
            <span className="font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* 步骤列表 */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {step.status === "completed" ? (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                  </div>
                ) : step.status === "in-progress" ? (
                  <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  </div>
                ) : step.status === "error" ? (
                  <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                    <div className="w-2 h-2 bg-destructive-foreground rounded-full" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{step.name}</span>
                  <Badge
                    variant={
                      step.status === "completed"
                        ? "default"
                        : step.status === "in-progress"
                        ? "secondary"
                        : step.status === "error"
                        ? "destructive"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {step.status === "completed"
                      ? "完成"
                      : step.status === "in-progress"
                      ? "进行中"
                      : step.status === "error"
                      ? "错误"
                      : "等待中"}
                  </Badge>
                </div>

                {step.message && <p className="text-xs text-muted-foreground mt-1">{step.message}</p>}

                {step.status === "in-progress" && step.progress !== undefined && (
                  <div className="mt-2">
                    <Progress value={step.progress} className="h-1" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 文件信息和下载 */}
        {isCompleted && downloadUrl && (
          <div className="border-t pt-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium">文件已准备就绪</p>
                {fileName && <p className="text-xs text-muted-foreground truncate">文件名: {fileName}</p>}
                {fileSize && <p className="text-xs text-muted-foreground">大小: {formatFileSize(fileSize)}</p>}
                {expiresAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatExpiryTime(expiresAt)}
                  </p>
                )}
              </div>
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors w-full md:w-auto justify-center"
              >
                <Download className="h-4 w-4" />
                下载 MP3
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
