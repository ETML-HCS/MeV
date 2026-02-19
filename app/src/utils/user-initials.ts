export const generateUserInitials = (fullName: string): string => {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)

  if (words.length === 0) return ''

  if (words.length === 1) {
    const word = words[0]
    return (word[0] + word[word.length - 1]).toUpperCase().slice(0, 3)
  }

  const firstLetters = words
    .slice(0, -1)
    .map((word) => word[0])
    .join('')

  const lastWord = words[words.length - 1]
  const lastLetter = lastWord[lastWord.length - 1]

  return (firstLetters + lastLetter).toUpperCase().slice(0, 3)
}
