import { Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { Page } from '@/components/common/Panel'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <Page>
      <div className="mt-16">
        <EmptyState
          icon={<Compass size={24} />}
          title="This page isn’t part of your workspace"
          description="The link may be old, or the agent it pointed to is no longer on your team."
          action={<Button variant="secondary" onClick={() => navigate('/')}>Back to overview</Button>}
        />
      </div>
    </Page>
  )
}
