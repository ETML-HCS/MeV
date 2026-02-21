import type { ModuleTemplate } from '../../types'
import { dep164 } from './dep164'
import { dep106 } from './dep106'
import { dep107 } from './dep107'
import { dep109 } from './dep109'

export const defaultModuleTemplates: ModuleTemplate[] = [
  ...dep164,
  ...dep106,
  ...dep107,
  ...dep109,
  // Ajouter les autres DEP ici au fur et à mesure
]
