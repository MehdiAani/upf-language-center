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
  email?: string
  levelTag?: string
  groupTag?: string
  cc1: number | null
  cc2: number | null
  ex: number | null
}

export interface ParsedPvResult {
  metadata: ParsedPvMetadata
  rows: ParsedPvStudentRow[]
  sheetName: string
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
  if (!str || str === '-' || str === '--') return null
  const num = Number(str)
  if (Number.isNaN(num)) return null
  return Math.round(num * 100) / 100
}

function normalizeHeader(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
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

function pickBestSheet(workbook: XLSX.WorkBook): string {
  const preferred = workbook.SheetNames.find((name) => {
    const n = normalizeHeader(name)
    return (
      n.includes('resultat') ||
      n.includes('roster') ||
      n.includes('liste') ||
      n.includes('pv')
    )
  })
  return preferred || workbook.SheetNames[0]
}

export async function parsePvSpreadsheet(file: File): Promise<ParsedPvResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = pickBestSheet(workbook)
  const sheet = workbook.Sheets[sheetName]

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

  let headerRowIdx = -1
  let colMap = {
    matricule: -1,
    cne: -1,
    nom: -1,
    prenom: -1,
    fullName: -1,
    email: -1,
    niveau: -1,
    groupe: -1,
    cc1: -1,
    cc2: -1,
    ex: -1,
  }

  for (let r = 0; r < Math.min(matrix.length, 20); r++) {
    const row = matrix[r] ?? []
    const normalized = row.map(normalizeHeader)

    const foundMatricule = normalized.findIndex(
      (c) => c.includes('matricule') || c.includes('student_code') || c === 'code'
    )
    const foundCne = normalized.findIndex((c) => c === 'cne')
    const foundFullName = normalized.findIndex(
      (c) =>
        c.includes('nom et prenom') ||
        c.includes('prenom et nom') ||
        c === 'full name' ||
        c === 'student name' ||
        c === 'etudiant'
    )
    const foundNom = normalized.findIndex(
      (c) => c === 'nom' || c.startsWith('nom ') || c === 'last_name'
    )
    const foundPrenom = normalized.findIndex(
      (c) => c.includes('prenom') || c === 'first_name'
    )
    const foundEmail = normalized.findIndex(
      (c) => c.includes('email') || c.includes('courriel')
    )
    const foundNiveau = normalized.findIndex(
      (c) => c === 'niveau' || c === 'level'
    )
    const foundGroupe = normalized.findIndex(
      (c) => c === 'groupe' || c === 'group'
    )
    const foundCc1 = normalized.findIndex(
      (c) => c === 'cc1' || c === 'cc 1' || c === 'midterm'
    )
    const foundCc2 = normalized.findIndex(
      (c) => c === 'cc2' || c === 'cc 2' || c === 'post_midterm'
    )
    const foundEx = normalized.findIndex(
      (c) => c === 'ex' || c.includes('examen') || c === 'final_exam'
    )

    const hasNameColumn =
      foundFullName !== -1 || foundNom !== -1 || foundPrenom !== -1
    if (hasNameColumn) {
      headerRowIdx = r
      colMap = {
        matricule: foundMatricule,
        cne: foundCne,
        nom: foundNom,
        prenom: foundPrenom,
        fullName: foundFullName,
        email: foundEmail,
        niveau: foundNiveau,
        groupe: foundGroupe,
        cc1: foundCc1,
        cc2: foundCc2,
        ex: foundEx,
      }
      break
    }
  }

  const metaLimit = headerRowIdx === -1 ? Math.min(matrix.length, 8) : headerRowIdx
  for (let r = 0; r < metaLimit; r++) {
    const line = (matrix[r] ?? [])
      .map((c) => String(c ?? '').trim())
      .filter(Boolean)
      .join(' ')
    if (!line) continue

    const lower = line.toLowerCase()
    if (lower.includes('annee universitaire') || lower.includes('universitaire')) {
      metadata.academicYear = extractBetween(line, 'Universitaire', 'Session')
      metadata.session = extractBetween(line, 'Session')
    } else if (lower.includes('filiere')) {
      metadata.filiere = extractBetween(line, 'Filiere', 'Groupe')
      metadata.groupe = extractBetween(line, 'Groupe')
    } else if (lower.includes('niveau')) {
      metadata.niveau = extractBetween(line, 'Niveau', 'Semestre')
      metadata.semestre = extractBetween(line, 'Semestre')
    } else if (lower.includes('option')) {
      metadata.option = extractBetween(line, 'Option') || 'NA'
    } else if (lower.includes('matiere')) {
      metadata.matiere = extractBetween(line, 'Matiere')
    }
  }

  const rows: ParsedPvStudentRow[] = []
  const startRow = headerRowIdx === -1 ? 0 : headerRowIdx + 1

  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r] ?? []
    const rawMatricule =
      colMap.matricule >= 0 ? String(row[colMap.matricule] ?? '').trim() : ''
    const rawCne = colMap.cne >= 0 ? String(row[colMap.cne] ?? '').trim() : ''
    const rawFullName =
      colMap.fullName >= 0
        ? String(row[colMap.fullName] ?? '').trim().replace(/\s+/g, ' ')
        : ''
    const rawNom =
      colMap.nom >= 0
        ? String(row[colMap.nom] ?? '').trim().replace(/\s+/g, ' ')
        : ''
    const rawPrenom =
      colMap.prenom >= 0
        ? String(row[colMap.prenom] ?? '').trim().replace(/\s+/g, ' ')
        : ''
    const rawEmail =
      colMap.email >= 0 ? String(row[colMap.email] ?? '').trim() : ''
    const rawNiveau =
      colMap.niveau >= 0 ? String(row[colMap.niveau] ?? '').trim() : ''
    const rawGroupe =
      colMap.groupe >= 0 ? String(row[colMap.groupe] ?? '').trim() : ''

    let firstName = rawPrenom
    let lastName = rawNom

    // If a combined "Nom et Prenom" column is used, put the full string in firstName
    // and keep lastName empty so UI rendering never repeats it.
    if (rawFullName && !rawNom && !rawPrenom) {
      firstName = rawFullName
      lastName = ''
    } else if (rawFullName) {
      if (!firstName) firstName = rawFullName
    }

    const cleanEmail = rawEmail && rawEmail !== '-' ? rawEmail : ''
    if (!rawMatricule && !rawCne && !firstName && !lastName && !cleanEmail) {
      continue
    }

    const generatedCode =
      rawMatricule ||
      rawCne ||
      'STU-' + String(rows.length + 1).padStart(3, '0')

    rows.push({
      matricule: generatedCode,
      cne: rawCne,
      firstName: firstName || 'Student',
      lastName,
      email: cleanEmail,
      levelTag: rawNiveau,
      groupTag: rawGroupe,
      cc1: colMap.cc1 >= 0 ? parseScoreCell(row[colMap.cc1]) : null,
      cc2: colMap.cc2 >= 0 ? parseScoreCell(row[colMap.cc2]) : null,
      ex: colMap.ex >= 0 ? parseScoreCell(row[colMap.ex]) : null,
    })
  }

  return { metadata, rows, sheetName }
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
    [
      '',
      '',
      'Annee Universitaire : ' +
        meta.academicYear +
        '   Session :  ' +
        meta.session,
    ],
    [
      '',
      '',
      'Filiere             : ' +
        meta.filiere +
        '   Groupe   : ' +
        meta.groupe,
    ],
    [
      '',
      '',
      'Niveau              : ' +
        meta.niveau +
        '    Semestre   : ' +
        meta.semestre,
    ],
    ['', '', 'Option              : ' + (meta.option || 'NA')],
    ['', '', 'Matiere  : ' + meta.matiere],
    [],
    ['Matricule ', 'CNE', 'Nom    ', 'Prenom    ', 'CC1', 'CC2', 'EX'],
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
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
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

  const filename = safeProf + '_' + safeCode + '_' + safeSem + '.xlsx'
  XLSX.writeFile(workbook, filename)
}