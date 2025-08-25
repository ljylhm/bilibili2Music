import { NextResponse } from "next/server"

function isSupportedHost(host: string) {
  const h = host.toLowerCase()
  return h === "b23.tv" || h === "bilibili.com" || h.endsWith(".bilibili.com")
}

async function resolveB23(url: string): Promise<string> {
  // b23 短链通常 302 跳转，这里采用不自动跟随重定向的方式获取 Location
  const res = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "Referer": "https://www.bilibili.com/",
    },
  })
  const loc = res.headers.get("location")
  if (loc) {
    return new URL(loc, url).toString()
  }
  // 如果服务器未返回 Location（个别场景可能直接返回页面），回退原 url
  return url
}

function extractBvid(u: URL): string | null {
  // /video/BVxxxx
  const m = u.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/)
  if (m && m[1]) return m[1]
  // ?bvid=BVxxxx
  const bv = u.searchParams.get("bvid")
  if (bv) return bv
  return null
}

async function fetchImageAsBase64(url: string): Promise<{ dataUrl: string; mime: string }> {
  // 服务端携带合适的头，避免防盗链导致的 403
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Referer": "https://www.bilibili.com/",
    },
    cache: "no-store",
    redirect: "follow",
  })

  if (!resp.ok) {
    throw new Error(`fetch cover failed: ${resp.status}`)
  }

  const mime = (resp.headers.get("content-type") || "image/jpeg").split(";")[0]
  const ab = await resp.arrayBuffer()
  const base64 = Buffer.from(ab).toString("base64")
  const dataUrl = `data:${mime};base64,${base64}`

  return { dataUrl, mime }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 })
    }

    let finalUrl = url
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return NextResponse.json({ error: "无效的 URL" }, { status: 400 })
    }

    if (!isSupportedHost(parsed.hostname)) {
      return NextResponse.json({ error: "不支持的域名" }, { status: 400 })
    }

    // 解析 b23 短链
    if (parsed.hostname === "b23.tv") {
      finalUrl = await resolveB23(url)
      parsed = new URL(finalUrl)
    }

    if (!isSupportedHost(parsed.hostname)) {
      return NextResponse.json({ error: "跳转后域名不受支持" }, { status: 400 })
    }

    const bvid = extractBvid(parsed)
    if (!bvid) {
      return NextResponse.json({ error: "无法解析视频ID（BV号）" }, { status: 400 })
    }

    const api = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`
    const resp = await fetch(api, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    })

    if (!resp.ok) {
      return NextResponse.json({ error: "获取视频信息失败（网络）" }, { status: 502 })
    }

    const data = await resp.json()
    if (!data || typeof data !== "object" || data.code !== 0 || !data.data) {
      return NextResponse.json({ error: "获取视频信息失败（返回异常）" }, { status: 502 })
    }

    const title: string = data.data.title
    const coverUrl: string = data.data.pic

    // 新增：抓取封面并返回 base64 data URL（带防盗链头）
    const { dataUrl: coverDataUrl, mime: coverMime } = await fetchImageAsBase64(coverUrl)

    return NextResponse.json({ title, coverUrl, coverDataUrl, coverMime, bvid, finalUrl })
  } catch (e) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}