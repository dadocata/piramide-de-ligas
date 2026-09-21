import { useRef } from 'react'
import { useApp } from '@/state/AppContext'
import { Button } from '@/components/ui'
import { leagueNameSummary } from '@/seed/sampleProject'

export function HomeView() {
  const { projects, openProject, deleteProject, newProject, loadSample, importProject, setScreen } = useApp()
  const fileInput = useRef<HTMLInputElement>(null)

  async function onImport(file: File | undefined) {
    if (!file) return
    try {
      await importProject(file)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo importar el archivo.')
    }
  }

  return (
    <>
      <section className="card hero">
        <h1>Armá tu propia pirámide de ligas</h1>
        <p>
          Creá divisiones, agregá clubes, conectá ascensos y descensos, y mirá las tablas.
          Todo se guarda en tu navegador y podés exportarlo para compartir.
        </p>
        <div className="hero-actions">
          <Button variant="primary" size="lg" onClick={() => void newProject()}>＋ Proyecto nuevo</Button>
          <Button size="lg" onClick={() => void loadSample()}>Cargar Fútbol Argentino 2026</Button>
          <Button size="lg" onClick={() => fileInput.current?.click()}>Importar archivo…</Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => void onImport(e.target.files?.[0])}
          />
        </div>
        <span className="inline-hint">
          El ejemplo incluye {leagueNameSummary()}.
        </span>
      </section>

      <h2 className="section-title">Tus proyectos</h2>
      {projects.length === 0 ? (
        <div className="empty-note">
          Todavía no guardaste ningún proyecto. Creá uno nuevo o cargá el de ejemplo para empezar.
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <div key={p.id} className="card project-card" onClick={() => void openProject(p.id)}>
              <h3>{p.name}</h3>
              <span className="project-meta">
                Guardado {new Date(p.updatedAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="project-card-actions" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="secondary" onClick={() => void openProject(p.id)}>Abrir</Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (confirm(`¿Eliminar «${p.name}»? Esta acción no se puede deshacer.`)) void deleteProject(p.id)
                  }}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 26 }}>
        <Button variant="ghost" onClick={() => setScreen('catalog')}>Ir a la Biblioteca de clubes →</Button>
      </div>
    </>
  )
}