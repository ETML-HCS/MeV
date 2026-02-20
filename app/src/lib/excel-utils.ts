import * as XLSX from 'xlsx'
import type { Objective, Student, StudentGrid } from '../types'
import { normalizeText, uid } from '../utils/helpers'

interface LoginRecord {
  firstname: string
  lastname: string
  login: string
  group: string
}

const parseSheetRows = (worksheet: XLSX.WorkSheet): string[][] => {
  const data = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, {
    header: 1,
    raw: false,
  })
  return data.map((row) => row.map((cell) => String(cell ?? '').trim()))
}

const readLoginCandidates = (workbook: XLSX.WorkBook): LoginRecord[] => {
  const candidates: LoginRecord[] = []
  workbook.SheetNames.forEach((sheetName) => {
    if (!/in/i.test(sheetName)) return
    const rows = parseSheetRows(workbook.Sheets[sheetName])
    rows.forEach((row) => {
      const lastname = row[0] ?? ''
      const firstname = row[1] ?? ''
      const login = row[2] ?? ''
      if (!lastname || !firstname || !login) return
      const group = /fin/i.test(sheetName) ? 'fin' : /cin/i.test(sheetName) ? 'cin' : /min/i.test(sheetName) ? 'min' : sheetName
      candidates.push({ firstname, lastname, login, group })
    })
  })
  return candidates
}

const readStudentsFromMainSheet = (workbook: XLSX.WorkBook): Pick<Student, 'firstname' | 'lastname'>[] => {
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = parseSheetRows(firstSheet)
  
  // Find the header row that contains "Nom" and "Prénom"
  let headerRowIndex = -1
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const hasNom = row.some(cell => cell.toLowerCase().includes('nom'))
    const hasPrenom = row.some(cell => cell.toLowerCase().includes('prénom') || cell.toLowerCase().includes('prenom'))
    if (hasNom && hasPrenom) {
      headerRowIndex = i
      break
    }
  }

  // If no header found, fallback to row 14
  const startIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 14
  const selected = rows.slice(startIndex)
  
  return selected
    .filter((row) => row[0] || row[1])
    .map((row) => ({ lastname: row[0] ?? '', firstname: row[1] ?? '' }))
    .filter((entry) => entry.lastname && entry.firstname)
}

export const parseLoginWorkbook = async (file: File): Promise<Student[]> => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer)
  const students = readStudentsFromMainSheet(workbook)
  const loginCandidates = readLoginCandidates(workbook)

  return students.map((student) => {
    const key = `${normalizeText(student.lastname)}-${normalizeText(student.firstname)}`
    const match = loginCandidates.find(
      (candidate) => `${normalizeText(candidate.lastname)}-${normalizeText(candidate.firstname)}` === key,
    )

    return {
      id: uid(),
      firstname: student.firstname,
      lastname: student.lastname,
      login: match?.login ?? '',
      group: match?.group ?? '',
      gridId: uid(),
    }
  })
}

export const exportSynthesisWorkbook = (
  objectives: Objective[],
  students: Student[],
  grids: StudentGrid[],
): Blob => {
  const workbook = XLSX.utils.book_new()
  const matrix: (string | number)[][] = [['Objectif / Indicateur', ...students.map((student) => `${student.lastname} ${student.firstname}`)]]

  objectives.forEach((objective) => {
    objective.indicators.forEach((indicator) => {
      const row: (string | number)[] = [`O${objective.number} - ${indicator.behavior}`]
      students.forEach((student) => {
        const grid = grids.find((item) => item.studentId === student.id)
        const evaluation = grid?.evaluations.find(
          (entry) => entry.objectiveId === objective.id && entry.indicatorId === indicator.id,
        )
        row.push(evaluation?.score ?? '')
      })
      matrix.push(row)
    })
  })

  const worksheet = XLSX.utils.aoa_to_sheet(matrix)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Synthese')
  const content = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new Blob([content], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
