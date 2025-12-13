import { checkPrices, checkSingleProduct, manualPriceCheck } from './functions/check-prices'
import { discoverProducts, manualDiscovery } from './functions/discover-products'

// Export all Inngest functions
export const functions = [
  checkPrices,
  checkSingleProduct,
  manualPriceCheck,
  discoverProducts,
  manualDiscovery,
]
