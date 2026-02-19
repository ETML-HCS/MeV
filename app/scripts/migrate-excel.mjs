import fs from 'node:fs'
import path from 'node:path'
import xlsx from 'xlsx'

const inputPath = process.argv[2]
const outputPath = process.argv[3] ?? 'migration-output.json'

if (!inputPath) {
  console.error('Usage: npm run migrate:excel -- <input.xlsx> [output.json]')
  process.exit(1)
}

const workbook = xlsx.readFile(inputPath)
const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = xlsx.utils.sheet_to_json(firstSheet, { header: 1, raw: false })

const students = rows
  .slice(14, 120)
  .filter((row) => (row?.[0] ?? '').toString().trim() || (row?.[1] ?? '').toString().trim())
  .map((row) => ({ lastname: String(row[0] ?? '').trim(), firstname: String(row[1] ?? '').trim() }))
  .filter((row) => row.lastname && row.firstname)

const loginRows = []
for (const sheetName of workbook.SheetNames) {
  if (!/in/i.test(sheetName)) continue
  const sheetRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false })
  for (const row of sheetRows) {
    const lastname = String(row?.[0] ?? '').trim()
    const firstname = String(row?.[1] ?? '').trim()
    const login = String(row?.[2] ?? '').trim()
    if (!lastname || !firstname || !login) continue
    const group = /fin/i.test(sheetName) ? 'fin' : /cin/i.test(sheetName) ? 'cin' : /min/i.test(sheetName) ? 'min' : sheetName
    loginRows.push({ lastname, firstname, login, group })
  }
}

const output = {
  source: path.basename(inputPath),
  generatedAt: new Date().toISOString(),
  students,
  logins: loginRows,
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')
console.log(`Migration JSON generated: ${outputPath}`)
