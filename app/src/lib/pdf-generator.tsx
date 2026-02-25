/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import JSZip from 'jszip'
import type { Objective, Student, StudentGrid } from '../types'
import { calculateIndicatorPoints } from './calculations'

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const COLORS = {
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    orange: '#f97316',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  emerald: {
    100: '#d1fae5',
    800: '#065f46',
  },
} as const

const SCORE_THRESHOLDS = {
  RED: 0,
  ORANGE: 1,
  AMBER: 2,
  EMERALD: 3,
} as const

// ============================================================================
// STYLES - Organisés par domaine fonctionnel
// ============================================================================

const styles = StyleSheet.create({
  // Layout de base
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: '#fafafa',
  },

  // Header Section
  header: {
    position: 'relative',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    borderTopWidth: 4,
    borderTopColor: COLORS.slate[800],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  schoolLogo: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  schoolLogoEtml: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[800],
    letterSpacing: 1,
  },
  schoolLogoDivider: {
    fontSize: 16,
    color: COLORS.slate[300],
  },
  schoolLogoCfpv: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[800],
  },
  studentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    marginBottom: 6,
  },
  headerInfo: {
    fontSize: 11,
    color: COLORS.slate[600],
    marginBottom: 4,
  },
  descriptionLabel: {
    fontSize: 11,
    color: COLORS.slate[700],
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 8,
  },
  descriptionItem: {
    fontSize: 10,
    color: COLORS.slate[600],
    marginBottom: 4,
    paddingLeft: 10,
    lineHeight: 1.5,
  },

  // Summary Box
  summaryBox: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.slate[50],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
  },
  summaryItem: {
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 8,
    color: COLORS.slate[500],
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[800],
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.slate[200],
    marginVertical: 4,
  },

  // Objective Blocks
  objectiveBlock: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  objectiveHeader: {
    backgroundColor: COLORS.slate[800],
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  objectiveTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  objectiveTotal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.slate[200],
    marginLeft: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  // Indicator Rows
  indicatorRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
    alignItems: 'center',
    minHeight: 32,
  },
  indicatorRowAlt: {
    backgroundColor: COLORS.slate[50],
  },

  // Badges
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
    width: '6%',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  badgeObjective: {
    backgroundColor: COLORS.slate[100],
    color: COLORS.slate[700],
    borderWidth: 1,
    borderColor: COLORS.slate[200],
  },
  badgeQuestion: {
    backgroundColor: COLORS.emerald[100],
    color: COLORS.emerald[800],
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },

  // Content Columns
  behavior: {
    width: '40%',
    fontSize: 10,
    color: COLORS.slate[800],
    paddingRight: 12,
    lineHeight: 1.4,
  },
  points: {
    width: '13%',
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.slate[700],
    textAlign: 'center',
    backgroundColor: COLORS.slate[50],
    paddingVertical: 4,
    borderRadius: 4,
  },
  remark: {
    width: '31%',
    fontSize: 9,
    color: COLORS.slate[600],
    fontStyle: 'italic',
    lineHeight: 1.4,
    paddingLeft: 8,
  },

  // Score Display
  scoreBox: {
    width: '10%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Score Colors
  scoreRed: { backgroundColor: COLORS.semantic.danger },
  scoreOrange: { backgroundColor: COLORS.semantic.orange },
  scoreAmber: { backgroundColor: COLORS.semantic.warning },
  scoreEmerald: { backgroundColor: COLORS.semantic.success },
  scoreGray: { backgroundColor: COLORS.slate[400] },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    padding: 8,
    backgroundColor: COLORS.slate[50],
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
  },
  footerText: {
    fontSize: 7,
    color: COLORS.slate[400],
    textAlign: 'center',
  },

  // Content wrapper for pagination
  content: {
    flex: 1,
    marginBottom: 50,
  },

  // Section separator
  pageBreak: {
    marginTop: 15,
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.slate[300],
    borderStyle: 'dashed',
  },
})

// ============================================================================
// UTILITAIRES & HELPERS
// ============================================================================

/**
 * Détermine le style de couleur basé sur le score
 */
const getScoreStyle = (score: number | null | undefined): { backgroundColor: string } => {
  if (score === null || score === undefined) return styles.scoreGray
  if (score === SCORE_THRESHOLDS.RED) return styles.scoreRed
  if (score === SCORE_THRESHOLDS.ORANGE) return styles.scoreOrange
  if (score === SCORE_THRESHOLDS.AMBER) return styles.scoreAmber
  if (score === SCORE_THRESHOLDS.EMERALD) return styles.scoreEmerald
  return styles.scoreGray
}

/**
 * Formate une date en français
 */
const formatDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Formate un nombre avec 2 décimales fixes
 */
const formatPoints = (points: number): string => points.toFixed(2)

/**
 * Formate un nombre en supprimant les décimales inutiles (.00 devient rien)
 */
const formatPointsClean = (points: number): string => {
  const formatted = points.toFixed(2)
  return formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted
}

/**
 * Parse les balises HTML simples et retourne un tableau de composants React PDF
 * Supporte: <strong>, <b>, <em>, <i>, <sub>, <sup>
 */

/**
 * Parse le texte markdown simple (gras avec **) et retourne un tableau d'éléments
 */
const parseMarkdownText = (text: string): Array<{ text: string; bold: boolean }> => {
  const parts: Array<{ text: string; bold: boolean }> = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // Ajouter le texte avant le gras
    if (match.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.index), bold: false })
    }
    // Ajouter le texte en gras
    parts.push({ text: match[1], bold: true })
    lastIndex = regex.lastIndex
  }

  // Ajouter le reste du texte
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), bold: false })
  }

  return parts.length > 0 ? parts : [{ text, bold: false }]
}

/**
 * Parse la description et respecte les retours à la ligne saisis par l'utilisateur
 */
const parseDescriptionItems = (description: string): string[] => {
  // Normaliser les sauts de ligne (Windows \r\n, Mac \r, Unix \n)
  const normalized = description
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  // Diviser par les sauts de ligne et conserver les lignes non vides
  const lines = normalized
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  // Si aucun saut de ligne, retourner la description entière
  return lines.length > 0 ? lines : [description]
}

// ============================================================================
// TYPES INTERNES
// ============================================================================

interface ObjectiveTotal {
  points: number
  maxPoints: number
}

type ObjectiveTotalsMap = Map<string, ObjectiveTotal>

interface PdfBatchZipResult {
  blob: Blob
  fileName: string
}

// ============================================================================
// COMPOSANTS INTERNES
// ============================================================================

/**
 * Composant pour afficher le score avec couleur conditionnelle
 */
const ScoreDisplay: React.FC<{ score: number | null | undefined }> = ({ score }) => {
  const scoreStyle = getScoreStyle(score)
  const displayValue = score ?? '—'

  return (
    <View style={styles.scoreBox}>
      <View style={[styles.scoreBadge, scoreStyle]}>
        <Text style={styles.scoreText}>{displayValue}</Text>
      </View>
    </View>
  )
}

/**
 * Composant pour les badges Objectif/Question
 */
const IndicatorBadges: React.FC<{
  questionNumber?: number
}> = ({ questionNumber }) => (
  <View style={styles.badgeContainer}>
    {questionNumber && (
      <Text style={[styles.badge, styles.badgeQuestion]}>Q{questionNumber}</Text>
    )}
  </View>
)

/**
 * Parse une chaîne contenant du HTML simple (ex: <span style="...">Texte</span>)
 * et la convertit en composants React-PDF (<Text>).
 * Supporte <span>, <strong>, <b>, <em>, <i> avec attribut style optionnel.
 */
const parseHtmlToPdf = (htmlString: string | undefined, defaultStyle?: any): React.ReactElement | null => {
  if (!htmlString) return null

  // Si pas de balises HTML, retourner le texte brut
  if (!/<[a-z]/i.test(htmlString)) {
    return <Text style={defaultStyle}>{htmlString}</Text>
  }

  // Tokeniser la chaîne en segments: texte brut + balises HTML
   
  const tagRegex = /<(span|strong|b|em|i)(?:\s+style="([^"]*)")?>([^<]*)<\/\1>/gi
  const elements: React.ReactElement[] = []
  let lastIndex = 0
  let key = 0
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(htmlString)) !== null) {
    // Texte avant la balise
    if (match.index > lastIndex) {
      const textBefore = htmlString.substring(lastIndex, match.index)
      if (textBefore.trim()) {
        elements.push(<Text key={key++} style={defaultStyle}>{textBefore}</Text>)
      }
    }

    const tagName = match[1].toLowerCase()
    const inlineStyle = match[2] || ''
    const textContent = match[3]

    // Construire le style pour cette balise
    const computedStyle: Record<string, string | number> = { ...((defaultStyle as Record<string, string | number>) || {}) }

    // Appliquer les styles par défaut selon la balise
    if (tagName === 'strong' || tagName === 'b') {
      computedStyle.fontWeight = 'bold'
    } else if (tagName === 'em' || tagName === 'i') {
      computedStyle.fontStyle = 'italic'
    }

    // Parser les styles inline CSS
    if (inlineStyle) {
      inlineStyle.split(';').forEach((declaration) => {
        const colonIdx = declaration.indexOf(':')
        if (colonIdx === -1) return
        const prop = declaration.substring(0, colonIdx).trim()
        const val = declaration.substring(colonIdx + 1).trim().replace(/['"]/g, '')
        if (!prop || !val) return

        // Convertir CSS kebab-case → camelCase
        const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

        // Ignorer font-family (React-PDF crashe si la police n'est pas enregistrée)
        // Mais simuler le rendu si on détecte ETML L
        if (camelProp === 'fontFamily') {
          if (val.includes('ETML L')) {
            computedStyle.fontWeight = 'bold'
            computedStyle.letterSpacing = 1
          }
          return
        }

        // Convertir les valeurs numériques
        if (/^\d+(\.\d+)?(px|pt)?$/.test(val)) {
          computedStyle[camelProp] = parseFloat(val)
        } else {
          computedStyle[camelProp] = val
        }
      })
    }

    elements.push(<Text key={key++} style={computedStyle}>{textContent}</Text>)
    lastIndex = match.index + match[0].length
  }

  // Texte restant après la dernière balise
  if (lastIndex < htmlString.length) {
    const remaining = htmlString.substring(lastIndex).replace(/<[^>]+>/g, '')
    if (remaining.trim()) {
      elements.push(<Text key={key++} style={defaultStyle}>{remaining}</Text>)
    }
  }

  // Si aucun élément trouvé (regex n'a rien matché), retourner le texte nettoyé
  if (elements.length === 0) {
    const cleaned = htmlString.replace(/<[^>]+>/g, '')
    return <Text style={defaultStyle}>{cleaned}</Text>
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {elements}
    </View>
  )
}

/**
 * Composant Header avec résumé (première page seulement)
 */
const DocumentHeaderFull: React.FC<{
  student: Student
  grid: StudentGrid
  schoolName?: string
}> = ({ student, grid, schoolName }) => {
  const gradeColor = grid.finalGrade >= 4 ? COLORS.semantic.success : COLORS.semantic.danger
  const percentageSuccess = grid.maxPoints > 0
    ? ((grid.totalPoints / grid.maxPoints) * 100).toFixed(1)
    : '0.0'

  const descriptionItems = parseDescriptionItems(grid.moduleDescription)

  return (
    <View style={styles.header}>
      {/* Logo école en haut à droite */}
      <View style={styles.schoolLogo}>
        {schoolName ? (
          parseHtmlToPdf(schoolName, { fontSize: 16, color: COLORS.slate[800] })
        ) : (
          <>
            <Text style={styles.schoolLogoEtml}>ETML</Text>
            <Text style={styles.schoolLogoDivider}>/</Text>
            <Text style={styles.schoolLogoCfpv}>CFPV</Text>
          </>
        )}
      </View>

      <Text style={styles.studentName}>
        {student.lastname.toUpperCase()} {student.firstname}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.headerInfo}>Module: {grid.moduleName}</Text>
        {grid.correctedBy && (
          <Text style={styles.headerInfo}>
            <Text style={{ fontWeight: 'bold' }}>Correcteur: </Text>
            {grid.correctedBy}
          </Text>
        )}
      </View>
      <Text style={styles.descriptionLabel}>Description:</Text>
      {descriptionItems.map((item, itemIdx) => {
        const itemParts = parseMarkdownText(item)
        return (
          <Text key={itemIdx} style={styles.descriptionItem}>
            {itemParts.map((part, idx) => (
              <Text key={idx} style={part.bold ? { fontWeight: 'bold' } : {}}>
                {part.text}
              </Text>
            ))}
          </Text>
        )
      })}

      <View style={styles.summaryBox}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Points obtenus</Text>
          <Text style={styles.summaryValue}>
            {formatPoints(grid.totalPoints)} / {formatPoints(grid.maxPoints)}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Taux de réussite</Text>
          <Text style={styles.summaryValue}>
            {percentageSuccess}%
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Note finale</Text>
          <Text style={[styles.summaryValue, { color: gradeColor }]}>
            {grid.finalGrade.toFixed(1)} / 6
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Date du test</Text>
          <Text style={styles.summaryValue}>
            {(grid.testDateOverride || grid.testDate) ? new Date((grid.testDateOverride || grid.testDate) as string).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }) : '—'}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Date d'évaluation</Text>
          <Text style={styles.summaryValue}>
            {grid.completedAt ? formatDate(new Date(grid.completedAt)) : formatDate(grid.generatedAt)}
          </Text>
        </View>
      </View>
    </View>
  )
}

/**
 * Composant pour une ligne d'indicateur
 */
const IndicatorRow: React.FC<{
  indicator: Objective['indicators'][number]
  objective: Objective
  evaluation: StudentGrid['evaluations'][number] | undefined
  isAlt: boolean
  scoringMode: '0-3' | 'points'
}> = ({ indicator, objective, evaluation, isAlt, scoringMode }) => {
  const weightFull = objective.weight * indicator.weight
  
  const maxPts = scoringMode === 'points' 
    ? indicator.weight 
    : weightFull * 3
    
  const earnedPts =
    evaluation?.score !== null && evaluation?.score !== undefined
      ? (scoringMode === 'points' ? evaluation.score : calculateIndicatorPoints(weightFull, evaluation.score))
      : 0

  const rowStyle = isAlt
    ? { ...styles.indicatorRow, ...styles.indicatorRowAlt }
    : styles.indicatorRow

  // Utiliser la remarque personnalisée ou la remarque par défaut selon le score
  let remark = evaluation?.customRemark || ''
  if (!remark && evaluation?.score !== null && evaluation?.score !== undefined && scoringMode === '0-3') {
    remark = indicator.remarks[evaluation.score as 0|1|2|3] || ''
  }
  // Tronquer les remarques trop longues pour éviter les débordements
  const truncatedRemark = remark.length > 150 ? remark.substring(0, 147) + '...' : remark

  return (
    <View style={rowStyle}>
      <IndicatorBadges
        questionNumber={indicator.questionNumber}
      />

      <Text style={styles.behavior}>{indicator.behavior}</Text>

      {scoringMode === '0-3' ? (
        <ScoreDisplay score={evaluation?.score} />
      ) : (
        <View style={styles.scoreBox}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.slate[700] }}>
            {evaluation?.score !== null && evaluation?.score !== undefined ? evaluation.score : '—'}
          </Text>
        </View>
      )}

      <Text style={styles.points}>
        {formatPointsClean(earnedPts)} / {formatPointsClean(maxPts)}
      </Text>

      <Text style={styles.remark}>{truncatedRemark}</Text>
    </View>
  )
}

/**
 * Composant pour un bloc objectif complet
 */
const ObjectiveBlock: React.FC<{
  objective: Objective
  grid: StudentGrid
  total: ObjectiveTotal
  scoringMode: '0-3' | 'points'
}> = ({ objective, grid, total, scoringMode }) => {
  const percentageAchieved = total.maxPoints > 0
    ? ((total.points / total.maxPoints) * 100).toFixed(0)
    : '0'

  return (
    <View style={styles.objectiveBlock} wrap={false}>
      <View style={styles.objectiveHeader}>
        <Text style={styles.objectiveTitle}>
          Objectif {objective.number} - {objective.title}
        </Text>
        <Text style={styles.objectiveTotal}>
          {formatPointsClean(total.points)} / {formatPointsClean(total.maxPoints)} pts ({percentageAchieved}%)
        </Text>
      </View>

      {objective.indicators.length === 0 ? (
        <View style={styles.indicatorRow}>
          <Text style={{ fontSize: 9, color: COLORS.slate[400], fontStyle: 'italic' }}>
            Aucun indicateur défini pour cet objectif
          </Text>
        </View>
      ) : (
        objective.indicators.map((indicator, idx) => {
          const evaluation = grid.evaluations.find(
            (e) => e.objectiveId === objective.id && e.indicatorId === indicator.id
          )

          return (
            <IndicatorRow
              key={indicator.id}
              indicator={indicator}
              objective={objective}
              evaluation={evaluation}
              isAlt={idx % 2 === 1}
              scoringMode={scoringMode}
            />
          )
        })
      )}
    </View>
  )
}

// ============================================================================
// LOGIQUE MÉTIER & CALCULS
// ============================================================================

/**
 * Calcule les totaux pour tous les objectifs
 */
const calculateObjectiveTotals = (
  objectives: Objective[],
  grid: StudentGrid,
  scoringMode: '0-3' | 'points' = '0-3'
): ObjectiveTotalsMap => {
  const totals = new Map<string, ObjectiveTotal>()

  for (const objective of objectives) {
    let objPoints = 0
    let objMaxPoints = 0

    for (const indicator of objective.indicators) {
      const evaluation = grid.evaluations.find(
        (e) => e.objectiveId === objective.id && e.indicatorId === indicator.id
      )
      // HAUTE FIX #8: Check selected flag like calculateGridTotals does
      if (evaluation?.selected === false) continue
      
      const maxPts = scoringMode === 'points' 
        ? indicator.weight 
        : objective.weight * indicator.weight * 3
      
      objMaxPoints += maxPts

      if (evaluation?.score !== null && evaluation?.score !== undefined) {
        objPoints += scoringMode === 'points'
          ? evaluation.score
          : calculateIndicatorPoints(objective.weight * indicator.weight, evaluation.score)
      }
    }

    totals.set(objective.id, { points: objPoints, maxPoints: objMaxPoints })
  }

  return totals
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

interface StudentDocumentProps {
  student: Student
  grid: StudentGrid
  objectives: Objective[]
  testIdentifier?: string
  moduleName?: string
  schoolName?: string
  scoringMode?: '0-3' | 'points'
}

const StudentDocument: React.FC<StudentDocumentProps> = ({
  student,
  grid,
  objectives,
  testIdentifier = 'evaluation',
  moduleName = 'Module',
  schoolName,
  scoringMode = '0-3'
}) => {
  const objectiveTotals = calculateObjectiveTotals(objectives, grid, scoringMode)
  const modulePrefix = moduleName.substring(0, 4).toUpperCase()

  return (
    <Document
      title={`evaluation_${modulePrefix}_${testIdentifier}-${student.lastname}-${student.firstname}`}
      author="MeV"
      subject={`Résultats pour ${student.firstname} ${student.lastname}`}
      creator="MeV"
      producer="React-PDF"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* En-tête complet uniquement sur la première page */}
        <DocumentHeaderFull student={student} grid={grid} schoolName={schoolName} />

        <View style={styles.content}>
          {objectives.length === 0 ? (
            <View style={{
              padding: 20,
              backgroundColor: COLORS.slate[50],
              borderRadius: 6,
              borderWidth: 1,
              borderColor: COLORS.slate[200],
            }}>
              <Text style={{ fontSize: 10, color: COLORS.slate[500], textAlign: 'center' }}>
                Aucun objectif défini pour cette évaluation
              </Text>
            </View>
          ) : (
            objectives.map((objective, idx) => (
              <View key={objective.id}>
                <ObjectiveBlock
                  objective={objective}
                  grid={grid}
                  total={objectiveTotals.get(objective.id) ?? { points: 0, maxPoints: 0 }}
                  scoringMode={scoringMode}
                />
                {idx < objectives.length - 1 && <View style={{ marginBottom: 6 }} />}
              </View>
            ))
          )}
        </View>

        {/* Footer fixe sur toutes les pages sauf la première */}
        <View fixed render={({ pageNumber }) => (
          pageNumber > 1 ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {student.lastname} {student.firstname} • {grid.moduleName} • Note: {grid.finalGrade.toFixed(1)}/6 • Généré le {formatDate()}
              </Text>
            </View>
          ) : null
        )} />
      </Page>
    </Document>
  )
}

// ============================================================================
// FONCTIONS PUBLIQUES D'EXPORT
// ============================================================================

/**
 * Génère un PDF pour un étudiant spécifique
 */
export const generateStudentPdfBlob = async (
  student: Student,
  grid: StudentGrid,
  objectives: Objective[],
  testIdentifier?: string,
  moduleName?: string,
  correctedBy?: string,
  fallbackTestDate?: string,
  schoolName?: string,
  scoringMode: '0-3' | 'points' = '0-3'
): Promise<Blob> => {
  // Utiliser testDateOverride si définie (pour élèves absents), sinon la date de la grille, ou la date de fallback
  const gridWithDate = {
    ...grid,
    testDate: grid.testDateOverride || grid.testDate || fallbackTestDate,
    correctedBy: grid.correctedBy || correctedBy,
  }
  return pdf(<StudentDocument student={student} grid={gridWithDate} objectives={objectives} testIdentifier={testIdentifier} moduleName={moduleName} schoolName={schoolName} scoringMode={scoringMode} />).toBlob()
}

/**
 * Génère un ZIP contenant les PDF de plusieurs étudiants
 */
export const generateBatchZip = async (
  students: Student[],
  grids: StudentGrid[],
  objectives: Objective[],
  testIdentifier: string,
  moduleName: string,
  correctedBy?: string,
  fallbackTestDate?: string,
  schoolName?: string,
  scoringMode: '0-3' | 'points' = '0-3'
): Promise<PdfBatchZipResult> => {
  const zip = new JSZip()
  const errors: Array<{ student: string; error: string }> = []
  const successes: string[] = []
  const modulePrefix = moduleName.trim().substring(0, 4).toUpperCase() || 'MODU'

  // Création d'une Map pour un accès O(1) aux grilles
  const gridMap = new Map(grids.map((g) => [g.studentId, g]))

  const pdfPromises = students.map(async (student) => {
    const grid = gridMap.get(student.id)
    const studentName = `${student.lastname} ${student.firstname}`

    if (!grid) {
      errors.push({
        student: studentName,
        error: 'Grille non trouvée',
      })
      return null
    }

    try {
      const blob = await generateStudentPdfBlob(
        student,
        grid,
        objectives,
        testIdentifier,
        moduleName,
        correctedBy,
        fallbackTestDate,
        schoolName,
        scoringMode
      )
      const fileName = `evaluation_${modulePrefix}_${testIdentifier}-${student.lastname}-${student.firstname}.pdf`
      zip.file(fileName, blob)
      successes.push(studentName)
      return { student, success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push({
        student: studentName,
        error: errorMessage,
      })
      return { student, success: false, error }
    }
  })

  await Promise.all(pdfPromises)

  // Format : module_YYYYMMDD.zip
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')

  return {
    blob: await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    }),
    fileName: `${moduleName.replace(/\s+/g, '_')}_${dateStr}.zip`
  }
}

// Export du composant pour les tests ou utilisation directe
export { StudentDocument }