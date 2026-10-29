import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ProductSheet } from '@/components/tracker/costing/ProductSheet'
import { sectionPath } from '@/components/tracker/sections'
import { useTrackerData } from '@/components/tracker/use-tracker'
import { ProductProfit } from './ProductProfit'
import { ProfitabilityView } from './ProfitabilityView'

/** Profitability, with one product open in the focused sheet: /profitability/:productId keeps the period and view in the URL. */
export function ProfitabilitySection() {
  const { itemId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data } = useTrackerData()
  const found = data.products.find((p) => p.id === itemId)

  // Keep showing the last product while the sheet animates closed.
  const [lastId, setLastId] = useState(itemId)
  if (itemId && itemId !== lastId) setLastId(itemId)
  const product = found ?? data.products.find((p) => p.id === lastId)
  const collection = data.collections.find((c) => c.id === product?.collectionId)?.name

  return (
    <>
      <ProfitabilityView />
      {product && (
        <ProductSheet open={!!found} onClose={() => navigate(`${sectionPath('profitability')}${location.search}`)} viewKey={itemId ?? ''} name={product.name} meta={`${collection ?? 'Uncollected'} · ${product.sku} · Profitability`}>
          <ProductProfit product={product} />
        </ProductSheet>
      )}
    </>
  )
}
