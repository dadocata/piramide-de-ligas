import { useState } from 'react'
import { useApp } from '@/state/AppContext'
import { Button } from '@/components/ui'
import { LeagueModal } from '@/components/modals/LeagueModal'
import { ClubModal } from '@/components/modals/ClubModal'
import { ConnectionModal } from '@/components/modals/ConnectionModal'
import { MultiClubPicker } from '@/components/modals/MultiClubPicker'
import { CupParticipantsModal } from '@/components/modals/CupClubPicker'
import { LeagueView } from './LeagueView'
import { TablesView } from './TablesView'
import { CupsView } from './CupsView'
import { PyramidTree } from './PyramidTree'
import { SideNav } from '@/components/SideNav'

type EditorSection = 'pyramid' | 'tables' | 'cups'

export function EditorView() {
  const { state, openTarget } = useApp()
  const divisions = state.leagues.filter((l) => l.kind !== 'copa')
  const [section, setSection] = useState<EditorSection>('pyramid')

  return (
    <>
      <div className="editor-layout">
        {state.leagues.length > 0 && <SideNav />}
        <div className="editor-content">
          {openTarget ? (
            <LeagueView
              key={`${openTarget.leagueId}:${openTarget.tournamentId ?? ''}`}
              leagueId={openTarget.leagueId}
              tournamentId={openTarget.tournamentId}
            />
          ) : (
            <>
              <div className="editor-tabs">
                {(
                  [
                    ['pyramid', 'Pirámide'],
                    ['tables', 'Tablas'],
                    ['cups', 'Copas']
                  ] as Array<[EditorSection, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    className={`tab-chip ${section === value ? 'active' : ''}`}
                    onClick={() => setSection(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {section === 'pyramid' && divisions.length === 0 && <EmptyPyramid />}
              {section === 'pyramid' && divisions.length > 0 && <PyramidTree />}
              {section === 'tables' && <TablesView />}
              {section === 'cups' && <CupsView />}
            </>
          )}
        </div>
      </div>

      <ModalHost />
    </>
  )
}

function EmptyPyramid() {
  const { setModal, loadSample } = useApp()

  return (
    <div className="card hero">
      <h1>Tu pirámide está vacía</h1>
      <p>Creá tu primera liga o cargá el ejemplo para ver cómo funciona todo.</p>
      <div className="hero-actions">
        <Button variant="primary" size="lg" onClick={() => setModal({ kind: 'league', level: 1, defaultKind: 'division' })}>
          ＋ Crear primera liga
        </Button>
        <Button size="lg" onClick={() => void loadSample()}>
          Cargar Fútbol Argentino 2026
        </Button>
      </div>
    </div>
  )
}

function ModalHost() {
  const { modal, setModal } = useApp()

  return (
    <>
      {modal.kind === 'league' && (
        <LeagueModal
          leagueId={modal.leagueId}
          defaultLevel={modal.level ?? 1}
          defaultKind={modal.defaultKind}
          onClose={() => setModal({ kind: 'none' })}
        />
      )}
      {modal.kind === 'club' && modal.clubId && (
        <ClubModal clubId={modal.clubId} onClose={() => setModal({ kind: 'none' })} />
      )}
      {modal.kind === 'connection' && (
        <ConnectionModal
          upperLeagueId={modal.upperLeagueId}
          connectionId={modal.connectionId}
          onClose={() => setModal({ kind: 'none' })}
        />
      )}
      {modal.kind === 'picker' && (
        <MultiClubPicker leagueId={modal.leagueId} onClose={() => setModal({ kind: 'none' })} />
      )}
      {modal.kind === 'cupClubPicker' && (
        <CupParticipantsModal leagueId={modal.leagueId} onClose={() => setModal({ kind: 'none' })} />
      )}
    </>
  )
}