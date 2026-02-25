/**
 * Service Microsoft Teams / Graph API
 * Utilise le Device Code Flow MSAL pour l'authentification
 * (aucune configuration de redirect URI requise côté Azure AD)
 */
import { PublicClientApplication, LogLevel } from '@azure/msal-node'

export interface TeamsClass {
  id: string
  displayName: string
  description?: string
  isTeam: boolean
}

export interface TeamsMember {
  firstname: string
  lastname: string
}

let msalApp: PublicClientApplication | null = null
let accessToken: string | null = null
let currentClientId: string | null = null

const EDU_SCOPES = ['User.Read', 'EduRoster.ReadBasic']
const TEAM_SCOPES = ['User.Read', 'Team.ReadBasic.All', 'TeamMember.Read.All']

function createMsalApp(clientId: string) {
  return new PublicClientApplication({
    auth: {
      clientId,
      // 'organizations' = comptes d'école / entreprise Microsoft 365
      authority: 'https://login.microsoftonline.com/organizations',
    },
    system: {
      loggerOptions: {
        loggerCallback: () => undefined,
        piiLoggingEnabled: false,
        logLevel: LogLevel.Error,
      },
    },
  })
}

export async function startDeviceCodeAuth(
  clientId: string,
  onCode: (verificationUri: string, userCode: string, expiresIn: number) => void,
): Promise<void> {
  // Recréer l'app si le clientId change
  if (clientId !== currentClientId || !msalApp) {
    msalApp = createMsalApp(clientId)
    currentClientId = clientId
    accessToken = null
  }

  // Essayer d'abord avec les scopes Education
  let result = null
  let usedEdu = true
  try {
    result = await msalApp.acquireTokenByDeviceCode({
      deviceCodeCallback: (response) => {
        onCode(response.verificationUri, response.userCode, response.expiresIn)
      },
      scopes: EDU_SCOPES,
    })
  } catch {
    // Si Education API non disponible, utiliser Teams basique
    usedEdu = false
    result = await msalApp.acquireTokenByDeviceCode({
      deviceCodeCallback: (response) => {
        onCode(response.verificationUri, response.userCode, response.expiresIn)
      },
      scopes: TEAM_SCOPES,
    })
  }

  if (!result?.accessToken) throw new Error('Authentification échouée : aucun token reçu')
  accessToken = result.accessToken
}

export function isAuthenticated(): boolean {
  return !!accessToken
}

export function logout(): void {
  accessToken = null
  msalApp = null
  currentClientId = null
}

export async function getClasses(): Promise<TeamsClass[]> {
  if (!accessToken) throw new Error('Non authentifié')

  // Essayer Education API (pour les profs avec Teams Éducation)
  const eduRes = await fetch(
    'https://graph.microsoft.com/v1.0/education/me/classes?$select=id,displayName,description&$top=100',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (eduRes.ok) {
    const data = (await eduRes.json()) as {
      value: { id: string; displayName: string; description?: string }[]
    }
    return data.value.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      description: c.description,
      isTeam: false,
    }))
  }

  // Fallback : Teams classiques (groupes)
  const teamsRes = await fetch(
    'https://graph.microsoft.com/v1.0/me/joinedTeams?$select=id,displayName&$top=100',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!teamsRes.ok) {
    const err = await teamsRes.text()
    throw new Error(`Impossible de récupérer les cours : ${teamsRes.status} ${err}`)
  }

  const data = (await teamsRes.json()) as { value: { id: string; displayName: string }[] }
  return data.value.map((t) => ({
    id: t.id,
    displayName: t.displayName,
    isTeam: true,
  }))
}

export async function getClassMembers(
  classId: string,
  isTeam: boolean,
): Promise<TeamsMember[]> {
  if (!accessToken) throw new Error('Non authentifié')

  // Pour les groupes Teams, on filtre les membres de type "#microsoft.graph.user"
  const url = isTeam
    ? `https://graph.microsoft.com/v1.0/groups/${classId}/members?$select=displayName,givenName,surname&$top=200`
    : `https://graph.microsoft.com/v1.0/education/classes/${classId}/members?$select=displayName,givenName,surname&$top=200`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Impossible de récupérer les élèves : ${res.status} ${err}`)
  }

  const data = (await res.json()) as {
    value: { displayName?: string; givenName?: string; surname?: string }[]
  }

  return data.value
    .map((m) => ({
      firstname: m.givenName ?? (m.displayName ? m.displayName.split(' ').slice(0, -1).join(' ') : ''),
      lastname: m.surname ?? (m.displayName ? m.displayName.split(' ').slice(-1)[0] : ''),
    }))
    .filter((m) => m.firstname || m.lastname)
}
