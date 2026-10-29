import { FolderKanban } from 'lucide-react'
import type { ProjectType } from '@/data/tracker/types'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ProductSheet } from '@/components/tracker/costing/ProductSheet'
import { PROJECT_STATUS, PROJECT_TYPE, PROJECT_TYPE_STYLE } from '@/components/tracker/projects/labels'
import { sectionPath } from '@/components/tracker/sections'
import { useTrackerData } from '@/components/tracker/use-tracker'
import { ProjectDetail } from './ProjectDetail'
import { ProjectForm } from './ProjectForm'
import { ProjectsList } from './ProjectsList'

/** The project's type icon on its accent tint, matching the card in the list. */
function ProjectIcon({ type }: { type?: ProjectType }) {
  const style = type ? PROJECT_TYPE_STYLE[type] : undefined
  const Icon = style?.icon ?? FolderKanban
  return (
    <span
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-line"
      style={style ? { background: `color-mix(in oklab, ${style.color} 16%, var(--surface))`, color: style.color } : undefined}
    >
      <Icon className="size-[18px]" strokeWidth={1.6} />
    </span>
  )
}

/**
 * Seasons and projects: the list, with one project (or the create form) open in a focused sheet on top.
 * /seasons/new creates, /seasons/:id opens a project, ?edit=1 edits it.
 */
export function SeasonsSection() {
  const { itemId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data } = useTrackerData()
  const creating = itemId === 'new'
  const found = data.projects.find((p) => p.id === itemId)
  const editing = !!found && params.get('edit') === '1'

  // Keep showing the last project while the sheet animates closed.
  const [lastId, setLastId] = useState(itemId)
  if (itemId && itemId !== lastId) setLastId(itemId)
  const project = found ?? data.projects.find((p) => p.id === lastId)
  const open = creating || !!found
  const showingNew = creating || (!found && lastId === 'new')
  const base = sectionPath('seasons')

  return (
    <>
      <ProjectsList />
      {(project || showingNew) && (
        <ProductSheet
          open={open}
          onClose={() => navigate(base)}
          viewKey={`${itemId}:${editing}`}
          thumb={<ProjectIcon type={showingNew ? undefined : project!.type} />}
          name={showingNew ? 'New project' : project!.name}
          meta={showingNew ? 'Seasons and projects' : `${PROJECT_TYPE[project!.type]} · ${PROJECT_STATUS[project!.status].label}`}
          trail={editing ? [{ label: 'Edit', onClick: () => navigate(`${base}/${project!.id}`) }] : []}
        >
          {showingNew ? <ProjectForm data={data} /> : editing ? <ProjectForm key={project!.id} data={data} project={project} /> : <ProjectDetail project={project!} data={data} />}
        </ProductSheet>
      )}
    </>
  )
}
