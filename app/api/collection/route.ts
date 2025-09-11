import { NextRequest, NextResponse } from 'next/server'

// 辅助函数：解析 b23 短链
async function resolveB23(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual'
    })
    const location = response.headers.get('location')
    return location || url
  } catch {
    return url
  }
}

// 辅助函数：提取 BV 号
function extractBvid(url: string): string | null {
  const bvidMatch = url.match(/(?:BV|bv)([a-zA-Z0-9]+)/)
  return bvidMatch ? `BV${bvidMatch[1]}` : null
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: '缺少视频链接' },
        { status: 400 }
      )
    }

    console.log('Processing collection URL:', url)

    // 解析短链
    let resolvedUrl = url
    if (url.includes('b23.tv') || url.includes('bili2233.cn')) {
      resolvedUrl = await resolveB23(url)
      console.log('Resolved URL:', resolvedUrl)
    }

    // 提取 BV 号
    const bvid = extractBvid(resolvedUrl)
    if (!bvid) {
      return NextResponse.json(
        { success: false, error: '无法从链接中提取视频ID' },
        { status: 400 }
      )
    }

    console.log('Extracted BVID:', bvid)

    // 调用 Bilibili API 获取视频信息
    const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.bilibili.com/'
      }
    })

    if (!response.ok) {
      throw new Error(`Bilibili API request failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('Bilibili API response:', JSON.stringify(data, null, 2))

    if (data.code !== 0) {
      return NextResponse.json(
        { success: false, error: `获取视频信息失败: ${data.message}` },
        { status: 400 }
      )
    }

    const videoData = data.data
    
    // 检查是否有合集信息或多P视频
    const hasMultiplePages = videoData.pages && videoData.pages.length > 1
    const hasUgcSeason = videoData.ugc_season
    
    if (!hasUgcSeason && !hasMultiplePages) {
      // 如果不是合集也不是多P视频，将单个视频作为合集返回
      console.log('Single video, treating as collection with one item')
      
      const singleVideo = {
        id: videoData.bvid,
        title: videoData.title || 'NA',
        thumbnail: videoData.pic || '',
        url: `https://www.bilibili.com/video/${videoData.bvid}`,
        duration: videoData.duration || 0,
        index: 1
      }
      
      return NextResponse.json({
        success: true,
        collection: {
          title: videoData.title || '单个视频',
          description: '包含 1 个视频',
          cover: videoData.pic || '',
          total: 1
        },
        videos: [singleVideo]
      })
    }
    
    // 处理多P视频
    if (hasMultiplePages && !hasUgcSeason) {
      console.log(`Multi-part video found with ${videoData.pages.length} parts`)
      
      const videos = videoData.pages.map((page: any, index: number) => ({
        id: `${videoData.bvid}?p=${page.page}`,
        title: page.part || `第${page.page}P`,
        thumbnail: videoData.pic || '',
        url: `https://www.bilibili.com/video/${videoData.bvid}?p=${page.page}`,
        duration: page.duration || 0,
        index: index + 1
      }))
      
      return NextResponse.json({
        success: true,
        collection: {
          title: videoData.title || '多P视频',
          description: `包含 ${videoData.pages.length} 个分P`,
          cover: videoData.pic || '',
          total: videoData.pages.length
        },
        videos
      })
    }

    const ugcSeason = videoData.ugc_season
    console.log('Found UGC season:', ugcSeason)

    // 获取合集中的所有视频
    const seasonApiUrl = `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=${videoData.owner.mid}&season_id=${ugcSeason.id}&sort_reverse=false&page_num=1&page_size=100`
    const seasonResponse = await fetch(seasonApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.bilibili.com/'
      }
    })

    if (!seasonResponse.ok) {
      throw new Error(`Season API request failed: ${seasonResponse.status}`)
    }

    const seasonData = await seasonResponse.json()
    console.log('Season API response:', JSON.stringify(seasonData, null, 2))

    if (seasonData.code !== 0) {
      return NextResponse.json(
        { success: false, error: `获取合集信息失败: ${seasonData.message}` },
        { status: 400 }
      )
    }

    const seasonInfo = seasonData.data.items_lists.seasons_list[0]
    if (!seasonInfo) {
      return NextResponse.json(
        { success: false, error: '未找到合集信息' },
        { status: 404 }
      )
    }

    // 构建视频列表
    const videos = seasonInfo.archives.map((video: any, index: number) => ({
      id: video.bvid,
      title: video.title || 'NA',
      thumbnail: video.pic || '',
      url: `https://www.bilibili.com/video/${video.bvid}`,
      duration: video.duration || 0,
      index: index + 1
    }))

    console.log(`Successfully got collection with ${videos.length} videos`)

    return NextResponse.json({
      success: true,
      collection: {
        title: ugcSeason.title,
        description: `包含 ${videos.length} 个视频`,
        cover: ugcSeason.cover || seasonInfo.archives[0]?.pic || '',
        total: videos.length
      },
      videos: videos
    })

  } catch (error: any) {
    console.error('Collection API error:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// 处理不支持的 HTTP 方法
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}