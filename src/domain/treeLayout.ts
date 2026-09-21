import type { League, LeagueConnection } from './types'

export interface TreeSlot {
  level: number
  slot: number
}

interface LayoutNode {
  id: string
  level: number
  children: LayoutNode[]
  slot: number
  walked: boolean
}

export function computeTreeSlots(
  leagues: League[],
  connections: LeagueConnection[]
): Record<string, TreeSlot> {
  const byId = new Map(leagues.map((l) => [l.id, l]))

  const childrenOf = new Map<string, string[]>()
  const parentOf = new Map<string, string>()
  const ordered = [...connections].sort((a, b) => a.id.localeCompare(b.id))
  for (const conn of ordered) {
    const upper = byId.get(conn.upperLeagueId)
    const lower = byId.get(conn.lowerLeagueId)
    if (!upper || !lower) continue
    if (lower.level <= upper.level) continue
    const list = childrenOf.get(conn.upperLeagueId) ?? []
    list.push(conn.lowerLeagueId)
    childrenOf.set(conn.upperLeagueId, list)
    if (!parentOf.has(conn.lowerLeagueId)) {
      parentOf.set(conn.lowerLeagueId, conn.upperLeagueId)
    }
  }

  const nameOf = (id: string) => byId.get(id)?.name ?? ''
  const compare = (a: string, b: string) => {
    const aLevel = byId.get(a)?.level ?? 0
    const bLevel = byId.get(b)?.level ?? 0
    if (aLevel !== bLevel) return aLevel - bLevel
    return nameOf(a).localeCompare(nameOf(b))
  }
  for (const kids of childrenOf.values()) {
    kids.sort(compare)
  }

  const roots = leagues
    .filter((l) => !parentOf.has(l.id))
    .map((l) => l.id)
    .sort(compare)

  const nodes = new Map<string, LayoutNode>()
  function ensure(id: string): LayoutNode {
    let node = nodes.get(id)
    if (node) return node
    const league = byId.get(id)!
    node = { id, level: league.level, children: [], slot: 0, walked: false }
    nodes.set(id, node)
    for (const kid of childrenOf.get(id) ?? []) {
      node.children.push(ensure(kid))
    }
    return node
  }

  let counter = 0
  function firstWalk(node: LayoutNode) {
    if (node.walked) return
    node.walked = true
    if (node.children.length === 0) {
      node.slot = counter
      counter += 1
    } else {
      for (const child of node.children) firstWalk(child)
      const first = node.children[0]
      const last = node.children[node.children.length - 1]
      node.slot = (first.slot + last.slot) / 2
    }
  }

  for (const root of roots) firstWalk(ensure(root))

  for (const league of leagues) {
    const node = ensure(league.id)
    firstWalk(node)
  }

  const result: Record<string, TreeSlot> = {}
  for (const [id, node] of nodes) {
    result[id] = { level: node.level, slot: node.slot }
  }
  return result
}