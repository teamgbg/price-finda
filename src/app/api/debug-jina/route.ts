export const dynamic = 'force-dynamic'

// Extract images from markdown content using regex
function extractImagesFromMarkdown(markdown: string): { label: string; url: string }[] {
  const images: { label: string; url: string }[] = []
  // Match markdown images: ![alt text](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  let match
  while ((match = imageRegex.exec(markdown)) !== null) {
    images.push({ label: match[1], url: match[2] })
  }
  return images
}

export async function GET() {
  const testUrl = 'https://www.jbhifi.com.au/products/hp-14a-nf0005tu-14-hd-touchscreen-chromebook-laptop-intel-n10064gb'
  const JINA_API_KEY = 'jina_53e1114b145c42a6a3fa0dc759c64279lD8TCI9XM8RKVpJBWDtvKLE8BCgK'

  // Try different header: X-Return-Format with images
  const response = await fetch('https://r.jina.ai/' + encodeURIComponent(testUrl), {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${JINA_API_KEY}`,
      'X-Return-Format': 'markdown',
      'X-With-Images-Summary': 'all',
    },
    signal: AbortSignal.timeout(30000),
  })

  const json = await response.json()
  const content = json.data?.content || ''

  // Check for images in content
  const imageMatches = content.match(/!\[[^\]]*\]\([^)]+\)/g) || []

  return Response.json({
    dataKeys: json.data ? Object.keys(json.data) : [],
    hasImages: !!json.data?.images,
    imagesInContent: imageMatches.length,
    sampleContent: content.slice(0, 500),
    rawImages: json.data?.images,
  })
}
