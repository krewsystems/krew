import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ProductSheet } from '@/components/tracker/costing/ProductSheet'
import { sectionPath } from '@/components/tracker/sections'
import { useTrackerData } from '@/components/tracker/use-tracker'
import { BatchEditor } from './BatchEditor'
import { CostingList } from './CostingList'
import { ProductCosting } from './ProductCosting'

/**
 * Product costing: the product list, with one product open in a focused sheet on top.
 * The URL keeps the state: /costing/:productId opens the sheet, ?batch=id|new opens a batch inside it
 * (&from= duplicates a batch, &revise= corrects a finalized one).
 */
export function CostingSection() {
  const { itemId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data } = useTrackerData()
  const batchParam = params.get('batch')
  const found = data.products.find((p) => p.id === itemId)

  // Keep showing the last product while the sheet animates closed.
  const [lastId, setLastId] = useState(itemId)
  if (found && found.id !== lastId) setLastId(found.id)
  const product = found ?? data.products.find((p) => p.id === lastId)
  const base = product ? `${sectionPath('costing')}/${product.id}` : sectionPath('costing')
  const open = !!found

  const batch = product && batchParam ? data.batches.find((b) => b.id === batchParam) : undefined
  // Inside a batch, the product name in the header leads back to the product.
  const trail = batchParam ? [{ label: batch?.label ?? (params.get('revise') ? 'Revision' : 'New batch'), onClick: () => navigate(base) }] : []
  const collection = product ? data.collections.find((c) => c.id === product.collectionId)?.name : undefined

  return (
    <>
      <CostingList />
      {product && (
        <ProductSheet
          open={open}
          onClose={() => navigate(sectionPath('costing'))}
          viewKey={`${itemId}:${batchParam ?? ''}`}
          name={product.name}
          meta={`${collection ?? 'No collection'} · ${product.sku} · ${product.variants.length === 1 ? product.variants[0].title : `${product.variants.length} variants`}`}
          trail={trail}
        >
          {batchParam ? (
            <BatchEditor product={product} data={data} batchParam={batchParam} fromId={params.get('from')} reviseId={params.get('revise')} />
          ) : (
            <ProductCosting product={product} data={data} />
          )}
        </ProductSheet>
      )}
    </>
  )
}
