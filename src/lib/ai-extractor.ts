import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

interface ExtractedProduct {
  name: string
  brand?: string
  model?: string
  priceCents?: number
  salePriceCents?: number
  inStock?: boolean
  specs?: {
    screenSize?: string
    screenType?: string
    screenBrightness?: number
    resolution?: string
    touchscreen?: boolean
    processor?: string
    ram?: number
    storage?: number
    storageType?: string
    batteryLife?: number
    weight?: number
    usbCPorts?: number
    usbAPorts?: number
    hdmiPort?: boolean
    sdCardSlot?: boolean
  }
}

const EXTRACTION_PROMPT = `You are a product data extractor. Given the markdown content of a retailer product page, extract the following information in JSON format:

{
  "name": "Full product name",
  "brand": "Brand name (Lenovo, HP, ASUS, Acer, Samsung, Dell, etc.)",
  "model": "Model number if available",
  "priceCents": 49900, // Price in cents (e.g., $499.00 = 49900)
  "salePriceCents": 39900, // Sale price in cents if on sale, otherwise null
  "inStock": true, // Whether the product is in stock
  "specs": {
    "screenSize": "14\"",
    "screenType": "IPS", // IPS, TN, OLED, VA, etc.
    "screenBrightness": 300, // In nits
    "resolution": "1920x1080",
    "touchscreen": false,
    "processor": "Intel Celeron N4500",
    "ram": 8, // In GB
    "storage": 256, // In GB
    "storageType": "SSD", // SSD, eMMC, HDD
    "batteryLife": 10, // In hours
    "weight": 1450, // In grams
    "usbCPorts": 2,
    "usbAPorts": 1,
    "hdmiPort": true,
    "sdCardSlot": true
  }
}

Rules:
- Only extract information that is explicitly stated on the page
- Convert prices to cents (e.g., $499 = 49900, $1,299.00 = 129900)
- For Australian prices, look for AUD or $ symbols
- If a spec is not mentioned, use null
- For boolean values, only set true if explicitly confirmed
- Return ONLY valid JSON, no markdown or explanations

Page content:`

/**
 * Extract product data from retailer page markdown using Groq AI
 */
export async function extractProductFromMarkdown(
  markdown: string,
  retailerName: string
): Promise<ExtractedProduct | null> {
  try {
    // Truncate very long content (Groq has context limits)
    const truncated = markdown.slice(0, 8000)

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile', // Free tier model with good extraction
      messages: [
        {
          role: 'system',
          content: `You are extracting product data from ${retailerName}'s website. Be precise with Australian Dollar prices.`,
        },
        {
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\n${truncated}`,
        },
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content) as ExtractedProduct
    return parsed
  } catch (error) {
    console.error('Failed to extract product data:', error)
    return null
  }
}

/**
 * Extract price only (faster, smaller model)
 */
export async function extractPriceFromMarkdown(
  markdown: string
): Promise<{ priceCents: number; salePriceCents?: number; inStock: boolean } | null> {
  try {
    const truncated = markdown.slice(0, 2000) // Only need start of page for price

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant', // Smaller, faster model for price extraction
      messages: [
        {
          role: 'user',
          content: `Extract the price from this Australian retailer page. Return JSON only:
{
  "priceCents": 49900,
  "salePriceCents": null,
  "inStock": true
}

Convert Australian dollars to cents. Page content:
${truncated}`,
        },
      ],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return null

    return JSON.parse(content)
  } catch (error) {
    console.error('Failed to extract price:', error)
    return null
  }
}
