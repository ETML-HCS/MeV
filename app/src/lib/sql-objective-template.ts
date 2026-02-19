import type { Objective } from '../types'
import { uid } from '../utils/helpers'

const remarkPerfect = 'La requête et le résultat affiché sont corrects'
const remarkSufficient = 'Il y a une petite erreur entre la requête et le résultat affiché'
const remarkInsufficient = 'Il y a une erreur grave entre la requête et le résultat affiché'
const remarkUnacceptable = 'Pas de requête ou complètement inutilisable'

export const createSqlObjectiveTemplate = (number: number): Objective => ({
  id: uid(),
  number,
  title:
    "Vérifie l'exhaustivité et l'exactitude des données via requêtes SQL simples/complexes et corrige les données erronées",
  description: 'Utilisation de requêtes SQL simples, complexes et de mise-à-jour',
  weight: 1,
  indicators: [
    {
      id: uid(),
      taxonomy: 'Appliquer',
      behavior: "Produit · Utilisation d'une requête SELECT simple",
      conditions: "Combien d'activités différentes sont proposées",
      expectedResults: 'SELECT COUNT(*) FROM t_activite; (résultat correct: 10)',
      weight: 0.1,
      remarks: { 3: remarkPerfect, 2: remarkSufficient, 1: remarkInsufficient, 0: remarkUnacceptable },
    },
    {
      id: uid(),
      taxonomy: 'Appliquer',
      behavior: "Produit · Utilisation d'une requête SELECT simple (avec condition)",
      conditions: 'Quels sont les noms et prénoms des entraîneurs qui vivent à Paris ?',
      expectedResults: "SELECT prenom, nom FROM t_entraineur WHERE ville = 'Paris';",
      weight: 0.1,
      remarks: { 3: remarkPerfect, 2: remarkSufficient, 1: remarkInsufficient, 0: remarkUnacceptable },
    },
    {
      id: uid(),
      taxonomy: 'Appliquer',
      behavior: "Produit · SELECT simple + fonction (avec condition)",
      conditions: 'Combien de membres sont nés avant 1990 ?',
      expectedResults: 'SELECT COUNT(*) FROM t_membre WHERE anneenaissance < 1990;',
      weight: 0.1,
      remarks: { 3: remarkPerfect, 2: remarkSufficient, 1: remarkInsufficient, 0: remarkUnacceptable },
    },
    {
      id: uid(),
      taxonomy: 'Analyser',
      behavior: 'Produit · SELECT de recherche de doublons',
      conditions:
        'Il semblerait que certaines salles ont été insérées plus qu\'une fois. Afficher lesquelles et combien de fois.',
      expectedResults: 'SELECT nom, COUNT(nom) FROM t_salle GROUP BY nom, ville HAVING COUNT(nom) > 1;',
      weight: 0.1,
      remarks: { 3: remarkPerfect, 2: remarkSufficient, 1: remarkInsufficient, 0: remarkUnacceptable },
    },
    {
      id: uid(),
      taxonomy: 'Analyser',
      behavior: 'Produit · SELECT simple avec requête imbriquée',
      conditions: 'Sélectionnez le nom et l\'année de naissance des membres inscrits après le 1er février 2023.',
      expectedResults:
        "SELECT prenom, nom, anneenaissance FROM t_membre WHERE membre_id IN (SELECT membre_fk FROM t_inscription WHERE dateinscription > '2023-02-01');",
      weight: 0.1,
      remarks: { 3: remarkPerfect, 2: remarkSufficient, 1: remarkInsufficient, 0: remarkUnacceptable },
    },
    {
      id: uid(),
      taxonomy: 'Analyser',
      behavior: 'Produit · SELECT avec fonction et regroupement',
      conditions: "Quel est le nombre moyen d'années d'expérience des membres pour chaque niveau ?",
      expectedResults:
        'SELECT nivlibelle, AVG(YEAR(CURRENT_DATE) - anneenaissance) as MoyenneExperience FROM t_membre GROUP BY nivlibelle;',
      weight: 0.1,
      remarks: { 3: remarkPerfect, 2: remarkSufficient, 1: remarkInsufficient, 0: remarkUnacceptable },
    },
    {
      id: uid(),
      taxonomy: 'Appliquer',
      behavior: "Produit · SELECT avec limitation de l'affichage",
      conditions: 'Affichez les 10 premiers membres avec leur âge calculé.',
      expectedResults: 'SELECT prenom, nom, (YEAR(CURDATE()) - anneenaissance) AS Age FROM t_membre LIMIT 10;',
      weight: 0.1,
      remarks: { 3: remarkPerfect, 2: remarkSufficient, 1: remarkInsufficient, 0: remarkUnacceptable },
    },
    {
      id: uid(),
      taxonomy: 'Analyser',
      behavior: 'Produit · SELECT avec fonction et regroupement',
      conditions: 'Combien de membres sont inscrits à chaque niveau de compétence ?',
      expectedResults: 'SELECT nivlibelle, COUNT(*) AS nombre_inscriptions FROM t_membre GROUP BY nivlibelle;',
      weight: 0.1,
      remarks: { 3: remarkPerfect, 2: remarkSufficient, 1: remarkInsufficient, 0: remarkUnacceptable },
    },
    {
      id: uid(),
      taxonomy: 'Évaluer',
      behavior: 'Produit · Correction des données (UPDATE)',
      conditions: 'Corriger les données de Louis Fournier pour lui attribuer un entraîneur à Bordeaux.',
      expectedResults:
        'UPDATE t_membre SET entraineur_fk = (SELECT entraineur_id FROM t_entraineur WHERE ville = "Bordeaux") WHERE prenom = "Louis" AND nom = "Fournier";',
      weight: 0.1,
      remarks: { 3: remarkPerfect, 2: remarkSufficient, 1: remarkInsufficient, 0: remarkUnacceptable },
    },
    {
      id: uid(),
      taxonomy: 'Évaluer',
      behavior: 'Produit · Correction des données (UPDATE horaire)',
      conditions: 'Le cours Pilates avancé est repoussé de 1h (20:00 à 21:00).',
      expectedResults: 'UPDATE t_cours SET heuredebut = "20:00:00", heurefin = "21:00:00" WHERE nom = "Pilates avancé";',
      weight: 0.1,
      remarks: { 3: remarkPerfect, 2: remarkSufficient, 1: remarkInsufficient, 0: remarkUnacceptable },
    },
  ],
})
