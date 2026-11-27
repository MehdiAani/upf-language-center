import * as XLSX from 'xlsx'

export interface ParsedPvMetadata {
  academicYear: string
  session: string
  filiere: string
  groupe: string
  niveau: string
  semestre: string
  option: string
  matiere: string
}

export interface ParsedPvStudentRow {
  matricule: string
  cne: string
  lastName: string
  firstName: string
  cc1: number | null
  cc2: number | null
  ex: number | null
}

export interface ParsedPvResult {
  metadata: ParsedPvMetadata
  rows: ParsedPvStudentRow[]
}

export interface ExportPvMetadata {
  academicYear: string
  session: string
  filiere: string
  groupe: string
  niveau: number | string
  semestre: number | string
  option?: string
  matiere: string
  professorName?: string
  departmentCode?: string
}

export interface ExportPvStudentRow {
  matricule: string
  cne: string
  lastName: string
  firstName: string
  cc1: number | null
  cc2: number | null
  ex: number | null
}

function parseScoreCell(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') {
    if (Number.isNaN(raw)) return null
    return Math.round(raw * 100) / 100
  }
  const str = String(raw).trim().replace(',', '.')
  if (!str) return null
  const num = Number(str)
  if (Number.isNaN(num)) return null
  return Math.round(num * 100) / 100
}

function extractBetween(text: string, startLabel: string, endLabel?: string): string {
  const lower = text.toLowerCase()
  const startIdx = lower.indexOf(startLabel.toLowerCase())
  if (startIdx === -1) return ''
  const afterColon = text.indexOf(':', startIdx)
  if (afterColon === -1) return ''
  const sliceStart = afterColon + 1
  if (!endLabel) {
    return text.slice(sliceStart).trim()
  }
  const endIdx = lower.indexOf(endLabel.toLowerCase(), sliceStart)
  if (endIdx === -1) {
    return text.slice(sliceStart).trim()
  }
  return text.slice(sliceStart, endIdx).trim()
}

export async function parsePvSpreadsheet(file: File): Promise<ParsedPvResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  })

  const metadata: ParsedPvMetadata = {
    academicYear: '',
    session: '',
    filiere: '',
    groupe: '',
    niveau: '',
    semestre: '',
    option: 'NA',
    matiere: '',
  }

  // Locate the header row containing Matricule / CNE / Nom
  let headerRowIdx = -1
  let colMap = {
    matricule: 0,
    cne: 1,
    nom: 2,
    prenom: 3,
    cc1: 4,
    cc2: 5,
    ex: 6,
  }

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? []
    const normalized = row.map((cell) =>
      String(cell ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    )

    const hasNom = normalized.some((c) => c === 'nom' || c.startsWith('nom '))
    const hasMatriculeOrCne = normalized.some(
      (c) => c.includes('matricule') || c === 'cne'
    )

    if (hasNom && hasMatriculeOrCne) {
      headerRowIdx = r
      normalized.forEach((cell, idx) => {
        if (cell.includes('matricule')) colMap.matricule = idx
        else if (cell === 'cne') colMap.cne = idx
        else if (cell === 'nom' || cell.startsWith('nom')) colMap.nom = idx
        else if (cell.includes('prenom')) colMap.prenom = idx
        else if (cell === 'cc1' || cell === 'cc 1') colMap.cc1 = idx
        else if (cell === 'cc2' || cell === 'cc 2') colMap.cc2 = idx
        else if (cell === 'ex' || cell.includes('examen')) colMap.ex = idx
      })
      break
    }
  }

  // Parse metadata lines above headerRowIdx
  const metaLimit = headerRowIdx === -1 ? Math.min(matrix.length, 8) : headerRowIdx
  for (let r = 0; r < metaLimit; r++) {
    const line = (matrix[r] ?? [])
      .map((c) => String(c ?? '').trim())
      .filter(Boolean)
      .join(' ')
    if (!line) continue

    const lower = line.toLowerCase()
    if (lower.includes('année universitaire') || lower.includes('annee universitaire')) {
      metadata.academicYear = extractBetween(line, 'Universitaire', 'Session')
      metadata.session = extractBetween(line, 'Session')
    } else if (lower.includes('filière') || lower.includes('filiere')) {
      metadata.filiere = extractBetween(line, 'Fili', 'Groupe')
      metadata.groupe = extractBetween(line, 'Groupe')
    } else if (lower.includes('niveau')) {
      metadata.niveau = extractBetween(line, 'Niveau', 'Semestre')
      metadata.semestre = extractBetween(line, 'Semestre')
    } else if (lower.includes('option')) {
      metadata.option = extractBetween(line, 'Option') || 'NA'
    } else if (lower.includes('matière') || lower.includes('matiere')) {
      metadata.matiere = extractBetween(line, 'Mati')
    }
  }

  const rows: ParsedPvStudentRow[] = []
  const startRow = headerRowIdx === -1 ? 1 : headerRowIdx + 1

  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r] ?? []
    const matricule = String(row[colMap.matricule] ?? '').trim()
    const cne = String(row[colMap.cne] ?? '').trim()
    const lastName = String(row[colMap.nom] ?? '').trim()
    const firstName = String(row[colMap.prenom] ?? '').trim()

    if (!matricule && !cne && !lastName && !firstName) continue

    rows.push({
      matricule,
      cne,
      lastName,
      firstName,
      cc1: parseScoreCell(row[colMap.cc1]),
      cc2: parseScoreCell(row[colMap.cc2]),
      ex: parseScoreCell(row[colMap.ex]),
    })
  }

  return { metadata, rows }
}

export interface ComputedGradeSummary {
  average20: number | null
  percentage: number | null
  isComplete: boolean
  completedCount: number
}

export function computeWeightedAverage(
  cc1: number | null,
  cc2: number | null,
  ex: number | null,
  weights = { cc1: 25, cc2: 25, ex: 50 }
): ComputedGradeSummary {
  const parts: { score: number; weight: number }[] = []

  if (cc1 !== null && !Number.isNaN(cc1)) {
    parts.push({ score: cc1, weight: weights.cc1 })
  }
  if (cc2 !== null && !Number.isNaN(cc2)) {
    parts.push({ score: cc2, weight: weights.cc2 })
  }
  if (ex !== null && !Number.isNaN(ex)) {
    parts.push({ score: ex, weight: weights.ex })
  }

  if (parts.length === 0) {
    return {
      average20: null,
      percentage: null,
      isComplete: false,
      completedCount: 0,
    }
  }

  const totalWeight = parts.reduce((acc, p) => acc + p.weight, 0)
  if (totalWeight <= 0) {
    return {
      average20: null,
      percentage: null,
      isComplete: parts.length === 3,
      completedCount: parts.length,
    }
  }

  const weightedSum = parts.reduce((acc, p) => acc + p.score * p.weight, 0)
  const avg = Math.round((weightedSum / totalWeight) * 100) / 100
  const pct = Math.round((avg / 20) * 1000) / 10

  return {
    average20: avg,
    percentage: pct,
    isComplete: parts.length === 3,
    completedCount: parts.length,
  }
}

export function exportPvSpreadsheet(
  meta: ExportPvMetadata,
  students: ExportPvStudentRow[]
) {
  const aoa: (string | number | null)[][] = [
    ['', '', `Année Universitaire : ${meta.academicYear}   Session :  ${meta.session}`],
    ['', '', `Filière             : ${meta.filiere}   Groupe   : ${meta.groupe}`],
    ['', '', `Niveau              : ${meta.niveau}    Semestre   : ${meta.semestre}`],
    ['', '', `Option              : ${meta.option || 'NA'}`],
    ['', '', `Matière  : ${meta.matiere}`],
    [],
    ['Matricule ', 'CNE', 'Nom    ', 'Prénom    ', 'CC1', 'CC2', 'EX'],
  ]

  for (const st of students) {
    aoa.push([
      st.matricule,
      st.cne,
      st.lastName.toUpperCase(),
      st.firstName.toUpperCase(),
      st.cc1 !== null ? st.cc1 : '',
      st.cc2 !== null ? st.cc2 : '',
      st.ex !== null ? st.ex : '',
    ])
  }

  const worksheet = XLSX.utils.aoa_to_sheet(aoa)

  worksheet['!cols'] = [
    { wch: 16 }, // Matricule
    { wch: 14 }, // CNE
    { wch: 18 }, // Nom
    { wch: 18 }, // Prénom
    { wch: 8 },  // CC1
    { wch: 8 },  // CC2
    { wch: 8 },  // EX
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

  const safeProf = (meta.professorName || 'UPF')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
  const safeCode = (meta.departmentCode || 'PV')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  const safeSem = String(meta.semestre || '1').replace(/[^0-9]/g, '') || '1'

  const filename = `${safeProf}_${safeCode}_${safeSem}.xlsx`
  XLSX.writeFile(workbook, filename)
}