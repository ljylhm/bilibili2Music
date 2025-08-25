export default function Head() {
  const title = "Bilibili 转 MP3 | 在线视频转音频工具"
  const description =
    "将 Bilibili 视频快速转换为 MP3，支持 b23.tv 短链与 bilibili.com 链接，自动获取标题与封面，免费、快速、无广告。"
  const keywords =
    "Bilibili 转 MP3, 哔哩哔哩 转 MP3, 视频转音频, b23.tv, bilibili 下载, MP3 下载, 在线工具, 音频提取"
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  )
}