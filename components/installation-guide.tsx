import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Terminal, Download, CheckCircle } from "lucide-react"

export function InstallationGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            系统依赖安装指南
          </CardTitle>
          <CardDescription>为了使视频转换功能正常工作，需要安装以下系统依赖</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription>
              <strong>重要提示：</strong>以下工具需要在服务器环境中安装，本地开发时请确保已安装。
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                1. 安装 yt-dlp
              </h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                <p># 方法1: 使用pip安装</p>
                <p>pip install yt-dlp</p>
                <br />
                <p># 方法2: 使用npm安装Node.js包装器</p>
                <p>npm install yt-dlp-wrap</p>
                <br />
                <p># 方法3: 直接下载二进制文件</p>
                <p># 从 https://github.com/yt-dlp/yt-dlp/releases 下载</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                2. 安装 FFmpeg
              </h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                <p># Windows: 从官网下载</p>
                <p># https://ffmpeg.org/download.html</p>
                <br />
                <p># macOS: 使用Homebrew</p>
                <p>brew install ffmpeg</p>
                <br />
                <p># Ubuntu/Debian</p>
                <p>sudo apt update && sudo apt install ffmpeg</p>
                <br />
                <p># CentOS/RHEL</p>
                <p>sudo yum install ffmpeg</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                3. 验证安装
              </h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                <p># 检查yt-dlp</p>
                <p>yt-dlp --version</p>
                <br />
                <p># 检查ffmpeg</p>
                <p>ffmpeg -version</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
