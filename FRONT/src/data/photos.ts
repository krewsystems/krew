// Temporary character art (cut from the reference sheet) until the final 3D agents are produced.
const WITH_PHOTO = new Set(['manager', 'luna', 'tracker', 'ivy', 'store', 'ads', 'retention', 'echo', 'atlas', 'muse', 'scout', 'vera', 'nova'])

export function agentFace(agentId: string): string | undefined {
  return WITH_PHOTO.has(agentId) ? `/agents/${agentId}-face.jpg` : undefined
}

export function agentPortrait(agentId: string): string | undefined {
  return WITH_PHOTO.has(agentId) ? `/agents/${agentId}.jpg` : undefined
}
