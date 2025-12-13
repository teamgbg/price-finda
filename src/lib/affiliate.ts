/**
 * Amazon Affiliate Link Utilities
 *
 * Adds affiliate tags to Amazon AU product URLs to earn commissions.
 */

const AMAZON_AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || 'maxpricefinda-22'

/**
 * Check if a URL is an Amazon AU URL
 */
export function isAmazonAuUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname.includes('amazon.com.au')
  } catch {
    return false
  }
}

/**
 * Add affiliate tag to an Amazon AU URL
 * Works with both /dp/ and /gp/ product URLs
 */
export function addAffiliateTag(url: string): string {
  if (!isAmazonAuUrl(url)) {
    return url // Return unchanged for non-Amazon URLs
  }

  try {
    const parsed = new URL(url)

    // Remove existing affiliate tags
    parsed.searchParams.delete('tag')
    parsed.searchParams.delete('linkCode')
    parsed.searchParams.delete('camp')
    parsed.searchParams.delete('creative')

    // Add our affiliate tag
    parsed.searchParams.set('tag', AMAZON_AFFILIATE_TAG)

    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * Create a clean Amazon affiliate link from an ASIN
 */
export function createAmazonLink(asin: string): string {
  return `https://www.amazon.com.au/dp/${asin}?tag=${AMAZON_AFFILIATE_TAG}`
}

/**
 * Extract ASIN from an Amazon URL
 */
export function extractAsin(url: string): string | null {
  if (!isAmazonAuUrl(url)) return null

  // Match /dp/ASIN or /gp/product/ASIN patterns
  const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/)
  return asinMatch ? asinMatch[1] : null
}

/**
 * Get affiliate tag for display
 */
export function getAffiliateTag(): string {
  return AMAZON_AFFILIATE_TAG
}

/**
 * Check if a retailer listing should use affiliate links
 */
export function shouldUseAffiliateLink(retailerSlug: string): boolean {
  return retailerSlug === 'amazon-au'
}
