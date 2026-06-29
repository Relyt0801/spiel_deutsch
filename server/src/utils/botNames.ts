// Zusammengesetzte Bot-Namen aus Adjektiv + Nomen, z. B. "CrazyRacoon", "StrangeApple".
const ADJECTIVES = [
  'Crazy', 'Strange', 'Happy', 'Sneaky', 'Brave', 'Clever', 'Lazy', 'Grumpy',
  'Witty', 'Shiny', 'Fuzzy', 'Mighty', 'Silly', 'Spooky', 'Jolly', 'Cosmic',
  'Turbo', 'Wild', 'Frosty', 'Golden', 'Rapid', 'Quiet', 'Funky', 'Royal',
  'Cheeky', 'Dizzy', 'Epic', 'Glowing', 'Hidden', 'Lucky', 'Noble', 'Swift',
]

const NOUNS = [
  'Racoon', 'Apple', 'Tiger', 'Falcon', 'Panda', 'Comet', 'Wizard', 'Otter',
  'Dragon', 'Pancake', 'Penguin', 'Cactus', 'Walrus', 'Muffin', 'Badger',
  'Lemur', 'Pickle', 'Hedgehog', 'Mango', 'Narwhal', 'Pretzel', 'Koala',
  'Sloth', 'Waffle', 'Llama', 'Beaver', 'Donut', 'Raptor', 'Goose', 'Yeti',
  'Toucan', 'Bagel',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Returns a composite name not already in `taken` (falls back to a numbered name). */
export function generateBotName(taken: string[]): string {
  const used = new Set(taken)
  for (let i = 0; i < 60; i++) {
    const name = `${pick(ADJECTIVES)}${pick(NOUNS)}`
    if (!used.has(name)) return name
  }
  // Extremely unlikely fallback.
  let n = 1
  while (used.has(`Bot${n}`)) n++
  return `Bot${n}`
}
