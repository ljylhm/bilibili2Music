// 安装必要的依赖包
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

async function installDependencies() {
  console.log("开始安装视频处理依赖...")

  try {
    // 安装yt-dlp (Python工具，需要系统安装)
    console.log("检查yt-dlp安装状态...")

    try {
      const { stdout } = await execAsync("yt-dlp --version")
      console.log(`yt-dlp已安装: ${stdout.trim()}`)
    } catch (error) {
      console.log("yt-dlp未安装，请手动安装:")
      console.log("方法1: pip install yt-dlp")
      console.log("方法2: 从 https://github.com/yt-dlp/yt-dlp/releases 下载")
      console.log("方法3: npm install -g yt-dlp-wrap (Node.js包装器)")
    }

    // 检查ffmpeg
    try {
      const { stdout } = await execAsync("ffmpeg -version")
      console.log("ffmpeg已安装")
    } catch (error) {
      console.log("ffmpeg未安装，请手动安装:")
      console.log("Windows: 从 https://ffmpeg.org/download.html 下载")
      console.log("macOS: brew install ffmpeg")
      console.log("Linux: sudo apt install ffmpeg 或 sudo yum install ffmpeg")
    }

    console.log("依赖检查完成！")
  } catch (error) {
    console.error("依赖安装检查失败:", error)
  }
}

installDependencies()
