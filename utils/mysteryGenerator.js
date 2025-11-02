const OpenAI = require('openai');

class MysteryGenerator {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateDailyMystery() {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert puzzle designer creating clever, fair mystery games.

CRITICAL RULES:
1. Choose subjects that 60-70% of educated adults would know
2. Generate EXACTLY 8 clues that progressively reveal the answer
3. NEVER use the most famous/iconic fact about the subject
4. Use concrete, verifiable facts - NOT vague metaphors
5. Answer must be 1-4 words maximum

BANNED PHRASES (never use these iconic facts):
- Van Gogh: "cut his ear", "lost an ear", "ear incident"
- Einstein: "tongue out", "stuck tongue", "E=mc²" (too early)
- Mona Lisa: "no eyebrows"
- Shakespeare: "to be or not to be"
- Any instantly recognizable catchphrase

CLUE PROGRESSION (8 clues):
Clue 1: Time period OR geographic region (indirect)
  Example: "Active during Europe's industrial transformation" NOT "lived in 1800s"
  
Clue 2: Professional field OR medium (cryptic)
  Example: "Worked with pigment and canvas under southern sun" NOT "was a painter"
  
Clue 3: Cultural impact (vague but concrete)
  Example: "Influenced a generation of artists who followed" NOT "changed art forever"
  
Clue 4: Associated location OR context (specific but not obvious)
  Example: "Spent significant time in Provence asylum" NOT "lived in Arles"
  
Clue 5: Working style OR method (concrete detail)
  Example: "Applied paint thickly, sometimes directly from tube" NOT "used impasto"
  
Clue 6: Related achievement (lesser-known)
  Example: "Created over 900 paintings in just 10 years" NOT "painted Starry Night"
  
Clue 7: Personal detail (specific but requires deduction)
  Example: "Brother Theo financially supported his career" NOT "was poor"
  
Clue 8: Final strong hint (very specific, almost there)
  Example: "Dutch post-impressionist who worked in France" NOT "painted sunflowers"

GOOD vs BAD EXAMPLES:

BAD: "Prismatic transformation" "lived in blue" "lost an ear"
GOOD: "Moved to southern France in 1888" "hospitalized in Saint-Rémy" "brother was art dealer"

BAD: "Master of relativity" "E=mc²" "tongue photo"
GOOD: "Patent clerk in Bern" "published groundbreaking papers in 1905" "won Nobel for photoelectric effect"

Return ONLY valid JSON:
{
  "answer": "exact answer (1-4 words)",
  "category": "person/place/thing/event",
  "clues": ["clue1", "clue2", "clue3", "clue4", "clue5", "clue6", "clue7", "clue8"],
  "funFact": "surprising lesser-known fact",
  "difficulty": "medium",
  "hiddenClues": ["bonus clue 1", "bonus clue 2"]
}`
          },
          {
            role: "user",
            content: "Generate a medium difficulty mystery puzzle with 8 progressive clues. Use concrete facts, avoid iconic catchphrases."
          }
        ],
        temperature: 0.8,
        max_tokens: 800
      });

      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from OpenAI');
      }

      const mystery = JSON.parse(jsonMatch[0]);
      
      if (!mystery.answer || !mystery.clues || mystery.clues.length !== 8) {
        throw new Error('Invalid mystery structure');
      }

      // Validate no banned phrases
      const bannedPhrases = [
        'ear', 'tongue', 'eyebrow', 'to be or not',
        'E=mc', 'relativity equation'
      ];
      
      const allText = mystery.clues.join(' ').toLowerCase();
      for (const banned of bannedPhrases) {
        if (allText.includes(banned.toLowerCase())) {
          console.log('⚠️ Rejected puzzle containing banned phrase:', banned);
          return this.getFallbackMystery();
        }
      }

      return {
        ...mystery,
        hiddenClues: mystery.hiddenClues || [],
        puzzleStructure: { name: 'Daily Cipher Hunt', clueCount: 8, interval: 0 },
        date: new Date().toISOString().split('T')[0],
        id: Date.now()
      };

    } catch (error) {
      console.error('Error generating mystery:', error);
      return this.getFallbackMystery();
    }
  }

  getFallbackMysteryByCategory(category) {
    const fallbacks = this.getAllFallbacks();
    const filtered = fallbacks.filter(m => m.category === category);
    
    if (filtered.length === 0) {
      console.log(`⚠️ No fallback for category ${category}, using random`);
      return this.getFallbackMystery();
    }
    
    const randomIndex = Math.floor(Math.random() * filtered.length);
    return filtered[randomIndex];
  }

  getFallbackMystery() {
    const fallbacks = this.getAllFallbacks();
    const randomIndex = Math.floor(Math.random() * fallbacks.length);
    return fallbacks[randomIndex];
  }

  getAllFallbacks() {
    return [
      {
        answer: "The Beatles",
        category: "thing",
        clues: [
          "Formed in a northern English port city in 1960",
          "Originally five members, though most famous as four",
          "Manager Brian Epstein discovered them at Cavern Club",
          "First hit 'Love Me Do' reached only #17 in UK",
          "Conquered America on Ed Sullivan Show with 73 million viewers",
          "Abbey Road Studios became their creative laboratory",
          "Broke up in 1970 after Apple Corps financial disputes",
          "Ringo, Paul, George, and John - the Fab Four"
        ],
        funFact: "The Beatles were rejected by Decca Records who said 'guitar groups are on the way out.'",
        difficulty: "medium",
        hiddenClues: [
          "Their final live performance was on a London rooftop",
          "They were awarded MBEs by Queen Elizabeth II in 1965"
        ],
        puzzleStructure: { name: 'Daily Cipher Hunt', clueCount: 8, interval: 0 },
        date: new Date().toISOString().split('T')[0],
        id: Date.now()
      },
      {
        answer: "Mount Everest",
        category: "place",
        clues: [
          "Known locally as 'Sagarmatha' and 'Chomolungma'",
          "Located on the border between two Asian nations",
          "First measured by Survey of India in 1856",
          "Named after a British surveyor general",
          "Sits in the 'death zone' above 26,000 feet",
          "Edmund Hillary and Tenzing Norgay reached summit in 1953",
          "Over 300 bodies remain on its slopes",
          "Earth's highest point at 29,032 feet above sea level"
        ],
        funFact: "Mount Everest grows about 4 millimeters taller every year due to tectonic plate movement.",
        difficulty: "medium",
        hiddenClues: [
          "Costs $30,000-85,000 to attempt a climb",
          "The summit is roughly the size of two ping pong tables"
        ],
        puzzleStructure: { name: 'Daily Cipher Hunt', clueCount: 8, interval: 0 },
        date: new Date().toISOString().split('T')[0],
        id: Date.now()
      },
      {
        answer: "Marie Curie",
        category: "person",
        clues: [
          "Born in Warsaw when Poland was under Russian control",
          "Worked as a governess to fund sister's medical education",
          "Moved to Paris to study at the Sorbonne in 1891",
          "Met husband Pierre while researching magnetism",
          "Discovered two new elements in uranium ore",
          "First woman to win a Nobel Prize in 1903",
          "Only person to win Nobel Prizes in two sciences",
          "Pioneer in radioactivity research, discovered polonium and radium"
        ],
        funFact: "Marie Curie's papers are still radioactive and stored in lead boxes; researchers must sign a waiver to view them.",
        difficulty: "medium",
        hiddenClues: [
          "Her daughter Irène also won a Nobel Prize",
          "Died from aplastic anemia caused by radiation exposure"
        ],
        puzzleStructure: { name: 'Daily Cipher Hunt', clueCount: 8, interval: 0 },
        date: new Date().toISOString().split('T')[0],
        id: Date.now()
      },
      {
        answer: "Great Barrier Reef",
        category: "place",
        clues: [
          "Visible from outer space, spans over 1,400 miles",
          "Home to 1,500 species of fish and 400 types of coral",
          "Located off the coast of Queensland",
          "Formed over 20 million years through coral polyp accumulation",
          "Captain Cook's ship ran aground here in 1770",
          "Comprises nearly 3,000 individual reef systems",
          "Supports green sea turtles, dolphins, and dugongs",
          "World's largest coral reef system in the Coral Sea"
        ],
        funFact: "The Great Barrier Reef produces its own 'clouds' that help protect it from sun damage.",
        difficulty: "medium",
        hiddenClues: [
          "Has lost over 50% of its coral since 1995",
          "Generates $6.4 billion annually for Australian economy"
        ],
        puzzleStructure: { name: 'Daily Cipher Hunt', clueCount: 8, interval: 0 },
        date: new Date().toISOString().split('T')[0],
        id: Date.now()
      },
      {
        answer: "Apollo 11",
        category: "event",
        clues: [
          "Launched from Kennedy Space Center in July 1969",
          "Three-person crew spent 8 days in space",
          "Mission Control in Houston coordinated the operation",
          "Saturn V rocket provided the thrust for launch",
          "Command module named Columbia, lunar module named Eagle",
          "Famous transmission: 'The Eagle has landed'",
          "Fulfilled President Kennedy's 1961 challenge",
          "First manned mission to land on the Moon"
        ],
        funFact: "The Apollo 11 computer had less processing power than a modern smartphone.",
        difficulty: "medium",
        hiddenClues: [
          "Neil Armstrong's heartrate reached 150 bpm during landing",
          "They left behind a plaque reading 'We came in peace for all mankind'"
        ],
        puzzleStructure: { name: 'Daily Cipher Hunt', clueCount: 8, interval: 0 },
        date: new Date().toISOString().split('T')[0],
        id: Date.now()
      },
      {
        answer: "Sistine Chapel",
        category: "place",
        clues: [
          "Construction completed in 1481 under Pope Sixtus IV",
          "Measures 134 feet long and 44 feet wide",
          "Floor pattern follows ancient Roman tradition",
          "Originally featured star-studded blue ceiling",
          "Michelangelo painted while standing on scaffolding",
          "Took four years to complete the ceiling frescoes",
          "Features nine scenes from the Book of Genesis",
          "Vatican chapel famous for ceiling and The Last Judgment"
        ],
        funFact: "Michelangelo didn't want to paint the Sistine Chapel and considered himself a sculptor, not a painter.",
        difficulty: "medium",
        hiddenClues: [
          "Papal conclaves are held here to elect new popes",
          "The ceiling covers over 5,000 square feet"
        ],
        puzzleStructure: { name: 'Daily Cipher Hunt', clueCount: 8, interval: 0 },
        date: new Date().toISOString().split('T')[0],
        id: Date.now()
      }
    ];
  }
}

module.exports = MysteryGenerator;