import { useMemo, useState } from 'react'
import { parseLoginWorkbook } from '../../lib/excel-utils'
import { useConfirm } from '../../hooks/useConfirm'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { Student } from '../../types'

interface StudentsViewProps {
  students: Student[]
  onReplaceAll: (students: Student[]) => Promise<void>
  onUpdateStudent: (student: Student) => Promise<void>
}

export const StudentsView = ({ students, onReplaceAll, onUpdateStudent }: StudentsViewProps) => {
  const [isImporting, setIsImporting] = useState(false)
  const [search, setSearch] = useState('')
  const [confirm, confirmDialogProps] = useConfirm()

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return students
    return students.filter((student) =>
      `${student.lastname} ${student.firstname} ${student.login} ${student.group}`.toLowerCase().includes(normalized),
    )
  }, [students, search])

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    try {
      const parsed = await parseLoginWorkbook(file)
      if (students.length > 0) {
        const ok = await confirm({
          title: 'Remplacer la liste des élèves ?',
          message: `L'import va remplacer les ${students.length} élève(s) actuels par ${parsed.length} nouveaux élèves. Les évaluations existantes seront conservées mais pourraient ne plus correspondre.`,
          confirmLabel: 'Remplacer',
          cancelLabel: 'Annuler',
          variant: 'warning',
        })
        if (!ok) return
      }
      await onReplaceAll(parsed)
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  return (
    <section className="space-y-6">
      {/* HEADER ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gestion des élèves</h2>
          <p className="text-sm text-slate-500 mt-1">
            {students.length} élève{students.length > 1 ? 's' : ''} enregistré{students.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-64 pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              aria-label="Rechercher un élève"
            />
          </div>

          {/* Import Button */}
          <label className={`
            relative px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer
            transition-all active:scale-95 shadow-lg shadow-blue-200
            ${isImporting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
          `}>
            {isImporting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Import...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>📥</span>
                Import Excel
              </span>
            )}
            <input
              type="file"
              accept=".xlsx,.xlsm,.xls"
              onChange={onFileChange}
              disabled={isImporting}
              className="sr-only"
              aria-label="Importer le fichier logins"
            />
          </label>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Nom</th>
                <th className="px-6 py-4 text-left font-semibold">Prénom</th>
                <th className="px-6 py-4 text-left font-semibold">Login</th>
                <th className="px-6 py-4 text-left font-semibold">Groupe</th>
                <th className="px-6 py-4 text-center font-semibold w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    {search ? 'Aucun élève trouvé' : 'Aucun élève enregistré'}
                  </td>
                </tr>
              ) : (
                filtered.map((student, index) => (
                  <tr 
                    key={student.id} 
                    className={`hover:bg-slate-50/80 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {student.lastname}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {student.firstname}
                    </td>
                    <td className="px-6 py-4">
                      <input
                        value={student.login}
                        onChange={(e) => onUpdateStudent({ ...student, login: e.target.value })}
                        className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        placeholder="login"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        value={student.group}
                        onChange={(e) => onUpdateStudent({ ...student, group: e.target.value })}
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        placeholder="Groupe"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onUpdateStudent({ ...student, login: '', group: '' })}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Réinitialiser"
                      >
                        ↺
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        {filtered.length > 0 && search && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} sur {students.length}
          </div>
        )}
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </section>
  )
}