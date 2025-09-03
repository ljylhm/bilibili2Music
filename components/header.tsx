import { Button } from "@/components/ui/button"
import { Music } from "lucide-react"
import Link from "next/link"

export function Header() {
  return (
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
          {/* Mobile: 单独展示"我的记录"入口 */}
          <div className="md:hidden">
            <Button asChild size="sm" variant="outline">
              <Link href="/records">我的记录</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}