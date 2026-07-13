// Zusammengesetzte Bot-Namen aus Adjektiv + Nomen, z. B. "CrazyRacoon", "SigmaWaffle".
// Bewusst große Wortlisten (inkl. einzelner Jugendwörter), damit sich Namen
// praktisch nie wiederholen – auch bei mehreren Bots in einer Runde.
const ADJECTIVES = [
  // Klassiker
  'Crazy', 'Strange', 'Happy', 'Sneaky', 'Brave', 'Clever', 'Lazy', 'Grumpy',
  'Witty', 'Shiny', 'Fuzzy', 'Mighty', 'Silly', 'Spooky', 'Jolly', 'Cosmic',
  'Turbo', 'Wild', 'Frosty', 'Golden', 'Rapid', 'Quiet', 'Funky', 'Royal',
  'Cheeky', 'Dizzy', 'Epic', 'Glowing', 'Hidden', 'Lucky', 'Noble', 'Swift',
  'Chunky', 'Wonky', 'Snazzy', 'Peppy', 'Zany', 'Bouncy', 'Sleepy', 'Hangry',
  'Fancy', 'Grimy', 'Zesty', 'Sparkly', 'Feral', 'Sassy', 'Vibey', 'Chaotic',
  'Dapper', 'Rusty', 'Salty', 'Spicy', 'Breezy', 'Nifty', 'Plucky', 'Groovy',
  // Jugendwörter / Internet-Slang (vereinzelt, jugendfrei)
  'Sus', 'Lit', 'Based', 'Goofy', 'Sigma', 'Cursed', 'Wholesome', 'Cringe',
  'Drippy', 'Legendary', 'Cracked', 'Dank', 'Mega', 'Ultra',
]

const NOUNS = [
  // Tiere
  'Racoon', 'Tiger', 'Falcon', 'Panda', 'Otter', 'Badger', 'Lemur', 'Hedgehog',
  'Narwhal', 'Koala', 'Sloth', 'Llama', 'Beaver', 'Raptor', 'Goose', 'Toucan',
  'Wombat', 'Capybara', 'Axolotl', 'Quokka', 'Platypus', 'Meerkat', 'Ferret',
  'Chinchilla', 'Alpaca', 'Gecko', 'Newt', 'Hamster', 'Duckling', 'Penguin',
  'Walrus', 'Dragon', 'Phoenix', 'Kraken', 'Griffin', 'Wyvern', 'Basilisk',
  // Essen / Snacks
  'Apple', 'Pancake', 'Cactus', 'Muffin', 'Pickle', 'Mango', 'Pretzel', 'Waffle',
  'Donut', 'Bagel', 'Croissant', 'Taco', 'Burrito', 'Ravioli', 'Noodle', 'Nugget',
  'Toast', 'Cookie', 'Brezel', 'Kebab',
  // Figuren / Rollen
  'Wizard', 'Comet', 'Yeti', 'Golem', 'Gnome', 'Goblin', 'Gremlin', 'Ninja',
  'Samurai', 'Viking', 'Pirate', 'Cyborg', 'Robot', 'Alien', 'Ghost', 'Legend',
  'Champ', 'Boss', 'Rizzler', 'Chad', 'Gigachad', 'Unicorn', 'Mammoth',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Returns a composite name not already in `taken` (falls back to a numbered name). */
export function generateBotName(taken: string[]): string {
  const used = new Set(taken)
  for (let i = 0; i < 80; i++) {
    const name = `${pick(ADJECTIVES)}${pick(NOUNS)}`
    if (!used.has(name)) return name
  }
  // Extremely unlikely fallback.
  let n = 1
  while (used.has(`Bot${n}`)) n++
  return `Bot${n}`
}
