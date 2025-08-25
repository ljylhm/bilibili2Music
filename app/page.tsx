"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Music, Video, AlertCircle, RotateCcw } from "lucide-react"
import { ConversionProgress } from "@/components/conversion-progress"
import { useConversion } from "@/hooks/use-conversion"

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState("")
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

  const handleConvert = async () => {
    if (!videoUrl.trim()) {
      return
    }

    // 简单的URL验证
    if (!videoUrl.includes("bilibili.com")) {
      return
    }

    await startConversion(videoUrl)
  }

  const handleReset = () => {
    resetConversion()
    setVideoUrl("")
  }

  const isCompleted = overallProgress === 100 && !isConverting && downloadUrl

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Bilibili转MP3</h1>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <span className="text-muted-foreground cursor-not-allowed opacity-60" aria-disabled="true" title="暂未开放">
                关于
              </span>
              <span className="text-muted-foreground cursor-not-allowed opacity-60" aria-disabled="true" title="暂未开放">
                常见问题
              </span>
              <span className="text-muted-foreground cursor-not-allowed opacity-60" aria-disabled="true" title="暂未开放">
                联系我们
              </span>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Video className="h-16 w-16 text-primary" />
                <div className="absolute -right-2 -bottom-2 bg-secondary rounded-full p-2">
                  <Music className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-foreground mb-4">轻松将Bilibili视频转换为MP3</h2>
            <p className="text-xl text-muted-foreground mb-8">快速、简单、免费的在线视频转音频工具</p>
          </div>

          {/* Conversion Progress */}
          {(isConverting || isCompleted || error) && (
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
                  <Button onClick={handleReset} variant="outline" className="gap-2 bg-transparent">
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
                  <Download className="h-5 w-5" />
                  开始转换
                </CardTitle>
                <CardDescription>粘贴Bilibili视频链接，点击转换按钮即可获得MP3文件</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="video-url" className="text-sm font-medium text-foreground">
                    视频链接
                  </label>
                  <Input
                    id="video-url"
                    type="url"
                    placeholder="https://www.bilibili.com/video/BV..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full"
                  />
                </div>

                <Button
                  onClick={handleConvert}
                  disabled={!videoUrl.trim() || !videoUrl.includes("bilibili.com")}
                  className="w-full"
                  size="lg"
                >
                  <Music className="h-4 w-4 mr-2" />
                  转换为MP3
                </Button>
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
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>复制Bilibili视频的完整链接</li>
                <li>将链接粘贴到上方的输入框中</li>
                <li>点击"转换为MP3"按钮开始转换</li>
                <li>等待转换完成后下载MP3文件</li>
              </ol>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
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
      <footer className="border-t border-border bg-card/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 Bilibili转MP3工具. 仅供个人学习使用.</p>
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
