import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function UsageInstructions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>使用说明</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal list-inside space-y-2 text-foreground/80">
          <li>复制视频的完整链接（支持多个平台）</li>
          <li>将链接粘贴到上方的输入框中</li>
          <li>选择单个或批量模式（批量模式用分号分隔多个链接）</li>
          <li>点击转换按钮开始处理</li>
          <li>等待转换完成后下载 MP3 文件</li>
        </ol>
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-foreground/70">
            <strong>支持的平台和链接格式：</strong>
            <br />• <strong>Bilibili：</strong> https://www.bilibili.com/video/BV... 或 https://b23.tv/...
            <br />• <strong>YouTube：</strong> https://www.youtube.com/watch?v=... 或 https://youtu.be/...
            <br />• <strong>小红书：</strong> https://www.xiaohongshu.com/... 或 https://xhslink.com/...
            <br />• <strong>抖音：</strong> https://www.douyin.com/... 或短链接
          </p>
        </div>
      </CardContent>
    </Card>
  )
}