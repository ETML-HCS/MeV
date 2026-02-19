# Description des Objectifs ICT - Module C216 IoT

## Vue d'ensemble

Le module C216 "Intégrer les terminaux IoE dans une plateforme existante" se décompose en 4 objectifs principaux évalués par l'épreuve sommative.

---

## O1 : Sélectionner des terminaux IoE (30%)

**Description complète :**
Conformément aux exigences du mandant (topologie, protocoles, fréquences)

**Compétences évaluées :**
- Choisir une topologie réseau adaptée au contexte (étoile, maillage, point-à-point)
- Sélectionner un protocole radio approprié (LoRaWAN, Zigbee, BLE, WiFi)
- Justifier les choix techniques par des critères mesurables (portée, consommation, débit)
- Comparer différentes fréquences radio (433 MHz, 868 MHz, 2.4 GHz)
- Comprendre les contraintes physiques (pénétration murs, distances, autonomie)
- Maîtriser les théories fondamentales (Shannon, architectures processeurs)
- Définir les systèmes cyber-physiques et boucles de rétroaction

**Questions associées (Version A) :** Q1, Q2, Q10, Q13, Q14
**Questions associées (Version B) :** Q5, Q3, Q6, Q7, Q4

**Indicateurs clés :**
- Capacité à analyser un contexte opérationnel (bâtiments, capteurs, contraintes)
- Justification technique basée sur des critères quantifiables
- Compréhension des compromis techniques (théorème de Shannon)
- Connaissances théoriques en architecture embarquée

---

## O2 : Configurer les terminaux IoE (40%)

**Description complète :**
Selon les consignes techniques (bus, adressage, interfaçage)

**Compétences évaluées :**
- Identifier les phénomènes physiques de dysfonctionnement (atténuation, interférences EM)
- Comparer et choisir les protocoles filaires (SPI, I2C, UART)
- Analyser l'adressage I2C et calculer le nombre maximal de dispositifs
- Comprendre les bus de communication série (fils, signaux, topologie)
- Maîtriser la conversion analogique-numérique (ADC/CAN)
- Calculer des températures à partir de capteurs analogiques (LM35, TMP36)
- Valider la plausibilité des résultats obtenus

**Questions associées (Version A) :** Q5, Q6, Q7, Q9, Q11
**Questions associées (Version B) :** Q14, Q12, Q11, Q10, Q9

**Indicateurs clés :**
- Diagnostic de problèmes techniques sur support filaire
- Choix approprié du protocole selon le contexte (débit, nombre d'esclaves)
- Calculs mathématiques (puissances de 2, règle de 3, formules capteurs)
- Application de formules physiques avec offsets et sensibilités
- Pensée critique pour valider des mesures

---

## O3 : Garantir l'exploitation sécurisée (15%)

**Description complète :**
Conformément aux directives de l'entreprise

**Compétences évaluées :**
- Calculer des circuits électriques en régime mixte (série-parallèle)
- Appliquer les lois de l'électricité (Ohm, Kirchhoff)
- Identifier et réduire les résistances équivalentes
- Calculer tensions et courants dans des circuits complexes
- Comprendre l'overhead dans les trames réseau
- Expliquer l'encapsulation des données (préambule, entête, CRC)
- Schématiser la structure des trames de communication

**Questions associées (Version A) :** Q16, Q3
**Questions associées (Version B) :** Q16, Q8

**Indicateurs clés :**
- Maîtrise des calculs électriques étape par étape
- Justification rigoureuse des étapes de résolution
- Compréhension de la structure des protocoles réseau
- Capacité à expliquer les éléments de sécurité (CRC, adressage)

---

## O4 : Intégrer dans le réseau / plateforme (30%)

**Description complète :**
Dans la plateforme existante (protocoles, codage, modes duplex)

**Compétences évaluées :**
- Distinguer les modes d'accès au support (contention vs planifié)
- Justifier le besoin de codage en ligne pour les transmissions
- Connaître les différents types de codage (NRZ, NRZI, Manchester)
- Identifier les types de communication (parallèle vs série)
- Justifier la domination de la communication série dans l'IoT
- Classifier les protocoles par mode duplex (Half-Duplex vs Full-Duplex)
- Comprendre les avantages techniques de chaque architecture

**Questions associées (Version A) :** Q4, Q8, Q12, Q15
**Questions associées (Version B) :** Q2, Q1, Q13, Q15

**Indicateurs clés :**
- Compréhension des méthodes d'accès au médium (CSMA/CA, TDMA)
- Connaissance des protocoles standards (WiFi, GSM, I2C, SPI, Ethernet)
- Capacité à justifier les choix architecturaux (coût, fiabilité, immunité)
- Classification correcte selon les caractéristiques de communication

---

## Répartition des poids

| Objectif | Poids | Focus principal |
|----------|-------|-----------------|
| O1 | 30% | **Sélection et conception** - Choix stratégiques selon contexte |
| O2 | 40% | **Configuration technique** - Mise en œuvre et calculs pratiques |
| O3 | 15% | **Sécurité et fiabilité** - Électricité et intégrité des données |
| O4 | 30% | **Intégration réseau** - Protocoles et architectures communication |

---

## Taxonomie de Bloom utilisée

- **Connaissance** : Nommer, identifier, lister (Q1, Q4, Q9, Q10, Q14)
- **Compréhension** : Expliquer, reformuler, décrire (Q2, Q3, Q5, Q8, Q12, Q13)
- **Application** : Calculer, comparer, classifier (Q6, Q7, Q11, Q15, Q16)
- **Analyse critique** : Évaluer, valider (Q11c, Q9c)

---

## Correspondance avec le référentiel ICT

Ces 4 objectifs couvrent les 5 objectifs opérationnels du module C216 :

1. **Sélectionner des terminaux IoE** → O1
2. **Configurer les terminaux IoE** → O2
3. **Garantir l'exploitation sécurisée** → O3
4. **Intégrer les terminaux dans le réseau** → O4
5. **Tester les terminaux intégrés** → Intégré dans O2 (validation, plausibilité)

---

## Utilisation dans le système MEV

Ces objectifs sont structurés pour être importés directement dans le Module d'Évaluation via le format pipe :

```
O# | Titre objectif | Description
Q# | Taxonomie | Comportement | Conditions | Résultats | Poids | Critère 3pts | Critère 2pts | Critère 1pt | Critère 0pt
```

Chaque question est associée à un objectif et pondérée pour refléter son importance dans l'évaluation globale des compétences ICT du module C216.
