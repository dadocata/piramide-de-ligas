import { useMemo, useRef, useCallback, useEffect, useState, type CSSProperties, type MouseEvent } from 'react'
import type { League } from '@/domain/types'
import { useApp } from '@/state/AppContext'
import { Button } from '@/components/ui'
import { cupParticipantClubs, getLeagueClubs } from '@/domain/validation'
import { computeTreeSlots } from '@/domain/treeLayout'
import { CrestImage } from '@/components/CrestImage'

interface ArrowInfo {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  kind: 'connection' | 'feeder'
  promote: number
  relegate: number
}

const CARD_W = 340
const CARD_H = 100
const COL_GAP = 20
const ROW_GAP = 60
const PAD_X = 36
const PAD_Y = 32
const RAIL = 88
const CUP_W = 200
const CUP_H = 120
const CUP_GAP_Y = 32
const CUP_GAP_X = 42
const CUP_PAD = 16

function rectExitAt(hw: number, hh: number, dx: number, dy: number): number {
  let t = Infinity
  if (dx > 0) t = Math.min(t, hw / dx)
  if (dx < 0) t = Math.min(t, -hw / dx)
  if (dy > 0) t = Math.min(t, hh / dy)
  if (dy < 0) t = Math.min(t, -hh / dy)
  return t
}

export function PyramidTree() {
  const { state, setModal } = useApp()
  const treeRef = useRef<HTMLDivElement>(null)
  const cardEls = useRef(new Map<string, HTMLDivElement>())
  const [arrows, setArrows] = useState<ArrowInfo[]>([])
  const [visibleFeeders, setVisibleFeeders] = useState<Record<string, boolean>>({})

  const cups = useMemo(
    () => state.leagues.filter((l) => l.kind === 'copa'),
    [state.leagues]
  )

  const divisions = useMemo(
    () => state.leagues.filter((l) => l.kind !== 'copa'),
    [state.leagues]
  )

  const sorted = useMemo(
    () => [...divisions].sort((a, b) => a.level - b.level),
    [divisions]
  )

  const slots = useMemo(
    () => computeTreeSlots(divisions, state.connections),
    [divisions, state.connections]
  )

  const levels = useMemo(() => {
    const set = new Set<number>()
    for (const league of sorted) set.add(league.level)
    return [...set].sort((a, b) => a - b)
  }, [sorted])

  const maxSlot = useMemo(() => {
    let max = 0
    for (const slot of Object.values(slots)) max = Math.max(max, slot.slot)
    return max
  }, [slots])

  const hasCups = cups.length > 0

  const divAreaW = RAIL + PAD_X * 2 + maxSlot * (CARD_W + COL_GAP) + CARD_W
  const cupX = divAreaW + (hasCups ? CUP_GAP_X : 0)
  const stageWidth = useMemo(
    () => divAreaW + (hasCups ? CUP_GAP_X + CUP_W + CUP_PAD : 0),
    [divAreaW, hasCups]
  )
  const cupStackH = hasCups ? PAD_Y + cups.length * CUP_H + (cups.length - 1) * CUP_GAP_Y + PAD_Y : 0
  const divAreaH = PAD_Y * 2 + levels.length * CARD_H + (levels.length - 1) * ROW_GAP
  const stageHeight = Math.max(divAreaH, cupStackH)

  const pxX = (slot: number) => RAIL + PAD_X + slot * (CARD_W + COL_GAP)
  const pxY = (rowIndex: number) => PAD_Y + rowIndex * (CARD_H + ROW_GAP)

  const clubCountByLeague = useMemo(() => {
    const map = new Map<string, number>()
    for (const league of sorted) {
      map.set(league.id, getLeagueClubs(state.clubs, league.id).length)
    }
    return map
  }, [sorted, state.clubs])

  const participantCountByCup = useMemo(() => {
    const map = new Map<string, number>()
    for (const cup of cups) {
      map.set(cup.id, cupParticipantClubs(cup, state.clubs).length)
    }
    return map
  }, [cups, state.clubs])

  const feedTargets = useMemo(() => {
    const set = new Set<string>()
    for (const cup of cups) {
      if (visibleFeeders[cup.id] && cup.cup) {
        for (const f of cup.cup.feeders) set.add(f.leagueId)
      }
    }
    return set
  }, [cups, visibleFeeders])

  const recalcArrows = useCallback(() => {
    const tree = treeRef.current
    if (!tree) return
    const rects = new Map<string, { x: number; y: number; w: number; h: number }>()
    for (const league of [...sorted, ...cups]) {
      const el = cardEls.current.get(league.id)
      if (!el) continue
      rects.set(league.id, { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight })
    }

    const next: ArrowInfo[] = []
    for (const conn of state.connections) {
      const up = rects.get(conn.upperLeagueId)
      const low = rects.get(conn.lowerLeagueId)
      if (!up || !low) continue
      const c1x = up.x + up.w / 2
      const c1y = up.y + up.h / 2
      const c2x = low.x + low.w / 2
      const c2y = low.y + low.h / 2
      const dx = c2x - c1x
      const dy = c2y - c1y
      const len = Math.hypot(dx, dy)
      if (len < 1) continue
      const ux = dx / len
      const uy = dy / len
      const fromStart = rectExitAt(up.w / 2, up.h / 2, ux, uy)
      const fromEnd = rectExitAt(low.w / 2, low.h / 2, -ux, -uy)
      if (fromStart + fromEnd >= len) continue
      next.push({
        id: conn.id,
        x1: c1x + ux * fromStart,
        y1: c1y + uy * fromStart,
        x2: c2x - ux * fromEnd,
        y2: c2y - uy * fromEnd,
        kind: 'connection',
        promote: conn.promoteCount,
        relegate: conn.relegateCount
      })
    }

    for (const cup of cups) {
      if (!visibleFeeders[cup.id]) continue
      const cupRect = rects.get(cup.id)
      if (!cupRect || !cup.cup) continue
      for (const feeder of cup.cup.feeders) {
        const fed = rects.get(feeder.leagueId)
        if (!fed) continue
        const c1x = cupRect.x + cupRect.w / 2
        const c1y = cupRect.y + cupRect.h / 2
        const c2x = fed.x + fed.w / 2
        const c2y = fed.y + fed.h / 2
        const dx = c2x - c1x
        const dy = c2y - c1y
        const len = Math.hypot(dx, dy)
        if (len < 1) continue
        const ux = dx / len
        const uy = dy / len
        const fromStart = rectExitAt(cupRect.w / 2, cupRect.h / 2, ux, uy)
        const fromEnd = rectExitAt(fed.w / 2, fed.h / 2, -ux, -uy)
        if (fromStart + fromEnd >= len) continue
        next.push({
          id: `cup-${cup.id}-${feeder.leagueId}`,
          x1: c1x + ux * fromStart,
          y1: c1y + uy * fromStart,
          x2: c2x - ux * fromEnd,
          y2: c2y - uy * fromEnd,
          kind: 'feeder',
          promote: 0,
          relegate: 0
        })
      }
    }
    setArrows(next)
  }, [sorted, cups, state.connections, visibleFeeders])

  useEffect(() => {
    const timer = setTimeout(recalcArrows, 60)
    return () => clearTimeout(timer)
  }, [recalcArrows, slots, levels, stageWidth, stageHeight])

  function register(el: HTMLDivElement | null, id: string) {
    if (el) cardEls.current.set(id, el)
    else cardEls.current.delete(id)
  }

  return (
    <div className="pyramid-editor">
      <div className="editor-toolbar">
        <Button variant="secondary" onClick={() => setModal({ kind: 'league', level: levels.length + 1, defaultKind: 'division' })}>
          ＋ Agregar liga inferior
        </Button>
        <Button variant="ghost" onClick={() => setModal({ kind: 'league', level: 1, defaultKind: 'division' })}>
          ＋ Agregar liga en el tope
        </Button>
        <Button variant="ghost" onClick={() => setModal({ kind: 'league', defaultKind: 'copa' })}>
          ＋ Crear copa
        </Button>
        <Button variant="ghost" onClick={() => setModal({ kind: 'connection' })}>
          ⛓ Conectar ligas
        </Button>
      </div>

      <div
        className="pyramid-tree"
        ref={treeRef}
        style={{ width: stageWidth, height: stageHeight }}
      >
        <svg className="tree-arrows" width={stageWidth} height={stageHeight}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill="var(--border-strong)" />
            </marker>
            <marker id="feeder-head" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill="var(--copa)" />
            </marker>
          </defs>
          {arrows.map((arrow) => {
            if (arrow.kind === 'feeder') {
              return (
                <line
                  key={arrow.id}
                  x1={arrow.x1}
                  y1={arrow.y1}
                  x2={arrow.x2}
                  y2={arrow.y2}
                  className="tree-arrow-line feeder"
                  markerEnd="url(#feeder-head)"
                />
              )
            }
            const cx = (arrow.x1 + arrow.x2) / 2
            const cy = (arrow.y1 + arrow.y2) / 2
            const label = `↑${arrow.promote} ↓${arrow.relegate}`
            const w = label.length * 7.5 + 16
            return (
              <g key={arrow.id}>
                <line
                  x1={arrow.x1}
                  y1={arrow.y1}
                  x2={arrow.x2}
                  y2={arrow.y2}
                  className="tree-arrow-line"
                  markerEnd="url(#arrowhead)"
                />
                <g
                  className="tree-arrow-label"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    setModal({ kind: 'connection', connectionId: arrow.id })
                  }}
                >
                  <rect x={cx - w / 2} y={cy - 11} width={w} height={22} rx={11} />
                  <text x={cx} y={cy + 4} textAnchor="middle">
                    {label}
                  </text>
                </g>
              </g>
            )
          })}
        </svg>

        {levels.map((level, row) => (
          <span
            key={level}
            className="tree-level-badge"
            style={{ top: pxY(row) + (CARD_H - 34) / 2 }}
          >
            N{level}
          </span>
        ))}

        {cups.map((cup, i) => (
          <CupCard
            key={cup.id}
            cup={cup}
            participantCount={participantCountByCup.get(cup.id) ?? 0}
            visible={Boolean(visibleFeeders[cup.id])}
            onToggle={() => setVisibleFeeders((m) => ({ ...m, [cup.id]: !m[cup.id] }))}
            style={{ left: cupX, top: PAD_Y + i * (CUP_H + CUP_GAP_Y), width: CUP_W, height: CUP_H }}
            register={(el) => register(el, cup.id)}
          />
        ))}

        {sorted.map((league) => {
          const slotInfo = slots[league.id]
          if (!slotInfo) return null
          const row = levels.indexOf(slotInfo.level)
          const style: CSSProperties = {
            left: pxX(slotInfo.slot),
            top: pxY(row)
          }
          return (
            <TreeCard
              key={league.id}
              league={league}
              clubCount={clubCountByLeague.get(league.id) ?? 0}
              feederTarget={feedTargets.has(league.id)}
              style={style}
              register={(el) => register(el, league.id)}
            />
          )
        })}
      </div>
    </div>
  )
}

interface TreeCardProps {
  league: League
  clubCount: number
  style: CSSProperties
  register: (el: HTMLDivElement | null) => void
  feederTarget?: boolean
}

function TreeCard({ league, clubCount, style, register, feederTarget = false }: TreeCardProps) {
  const { dispatch, setModal, setOpenTarget } = useApp()

  function stop(ev: MouseEvent) {
    ev.stopPropagation()
  }

  return (
    <div
      ref={register}
      className={`tree-card ${feederTarget ? 'feeder-target' : ''}`}
      style={style}
      onClick={() => setOpenTarget({ leagueId: league.id })}
      title="Ver tabla de la liga"
    >
      <div className="tree-card-head">
        <span className="tree-card-logo"><CrestImage data={league.logoData} name={league.name} /></span>
        <div className="tree-card-info">
          <span className="tree-card-name">{league.name}</span>
        </div>
      </div>
      <div className="tree-card-foot">
        <span className="chip neutral">{clubCount} clubes</span>
        <Button size="sm" variant="secondary" onClick={(ev) => { stop(ev); setModal({ kind: 'picker', leagueId: league.id }) }}>
          ＋ clubes
        </Button>
        <Button size="sm" onClick={(ev) => { stop(ev); setModal({ kind: 'league', leagueId: league.id }) }}>
          Editar
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={(ev) => {
            stop(ev)
            confirm(`¿Eliminar la liga «${league.name}» con sus clubes?`) &&
              dispatch({ type: 'REMOVE_LEAGUE', id: league.id })
          }}
        >
          Eliminar
        </Button>
      </div>
    </div>
  )
}

interface CupCardProps {
  cup: League
  participantCount: number
  visible: boolean
  onToggle: () => void
  style: CSSProperties
  register: (el: HTMLDivElement | null) => void
}

function CupCard({ cup, participantCount, visible, onToggle, style, register }: CupCardProps) {
  const { dispatch, setModal } = useApp()
  const scope = cup.cup?.scope === 'regional' ? 'Regional' : 'Nacional'
  const feederCount = cup.cup?.feeders.length ?? 0

  return (
    <div
      ref={register}
      className="tree-card cup"
      style={{ ...style, width: CUP_W, height: CUP_H }}
      onClick={() => setModal({ kind: 'league', leagueId: cup.id })}
      title="Editar la copa y ver sus dependencias"
    >
      <div className="tree-card-head">
        <span className="tree-card-logo"><CrestImage data={cup.logoData} name={cup.name} /></span>
        <div className="tree-card-info">
          <span className="tree-card-name">{cup.name}</span>
        </div>
      </div>
      <div className="tree-card-foot">
        <span className="chip neutral">{scope} · {participantCount} part.</span>
        <span className="spacer" />
        <button
          className="icon-btn danger"
          onClick={(ev) => {
            ev.stopPropagation()
            confirm(`¿Eliminar la copa «${cup.name}»?`) &&
              dispatch({ type: 'REMOVE_LEAGUE', id: cup.id })
          }}
          aria-label="Eliminar copa"
        >
          ✕
        </button>
      </div>
      <Button
        size="sm"
        variant={visible ? 'primary' : 'secondary'}
        onClick={(ev) => {
          ev.stopPropagation()
          onToggle()
        }}
        title={visible ? 'Ocultar las ligas conectadas' : 'Mostrar las ligas conectadas a esta copa'}
        style={{ width: '100%' }}
      >
        {visible ? 'Ocultar ligas' : `Ver ligas participantes${feederCount > 0 ? ` (${feederCount})` : ''}`}
      </Button>
    </div>
  )
}