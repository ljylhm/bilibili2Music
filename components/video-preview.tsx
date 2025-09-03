import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { AspectRatio } from "@/components/ui/aspect-ratio"

interface VideoPreviewProps {
  batchMode: boolean
  videoUrl: string
  isSupportedUrl: (url: string) => boolean
  metaLoading: boolean
  meta: { title: string; coverUrl: string } | null
  metaError: string | null
}

export function VideoPreview({
  batchMode,
  videoUrl,
  isSupportedUrl,
  metaLoading,
  meta,
  metaError,
}: VideoPreviewProps) {
  return (
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
          <div className="text-sm text-foreground/70">
            {batchMode ? "批量模式下不提供预览" : "检测到有效链接，正在准备预览"}
          </div>
        )}
      </CardContent>
    </Card>
  )
}