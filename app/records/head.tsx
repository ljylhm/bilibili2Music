export default function Head() {
  const title = "我的记录 | Bilibili 转 MP3"
  const description =
    "查看并管理你的转换记录，30 分钟内可直接下载，过期后可一键重新生成。"
  const keywords =
    "转换记录, 历史记录, Bilibili 转 MP3, 下载记录, 重新生成, 哔哩哔哩"
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="robots" content="noindex" />
    </>
  )
}