export const TAXONOMY_LEVELS = ['Connaître', 'Comprendre', 'Appliquer', 'Analyser', 'Évaluer'] as const

export type TaxonomyLevel = (typeof TAXONOMY_LEVELS)[number]
