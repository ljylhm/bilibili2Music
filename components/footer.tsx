export function Footer() {
  return (
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
  )
}