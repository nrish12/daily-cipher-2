# Cipher Hunt - Daily Mystery Game

A Supabase-powered daily mystery game where players solve puzzles by progressively revealing clues.

## Features

- **Category Selection**: Choose between Person, Place, or Thing mysteries
- **Progressive Clue System**: Start with 3 clues, reveal more with wrong guesses
- **User Profiles**: Track your stats, streaks, and achievements
- **Hint System**: Use hints to help solve mysteries
- **Achievements**: Earn badges for various accomplishments
- **Daily Stats**: See how you compare to other players
- **Cognitive Style**: Get categorized based on your solving patterns

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Hosting**: Works with any static hosting (Vercel, Netlify, etc.)

## Database Structure

### Tables

1. **mysteries**: Daily puzzles with clues and answers
2. **user_profiles**: Player statistics and achievements
3. **daily_stats**: Aggregate daily game statistics

### Edge Functions

1. **generate-mystery**: Creates/fetches daily mystery by category
2. **game-api**: Handles all game operations (guesses, stats, profiles, hints)

## Setup

Your Supabase database and Edge Functions are already configured! The environment variables are automatically set.

## Running the App

Development:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## How to Play

1. Select a mystery category (Person, Place, or Thing)
2. Start with 3 initial clues
3. Make a guess - if wrong, another clue is revealed
4. Solve within 6 attempts to earn points
5. Use hints strategically (costs vary by hint type)
6. Track your achievements and compete with others

## Game Mechanics

- **Starting Clues**: 3
- **Max Attempts**: 6
- **Max Score**: 1000 points
- **Penalty**: ~167 points per wrong attempt
- **Hints**: Start with 3, earn more through gameplay

## Achievements

- First Blood: Solve your first mystery
- Speed Demon: Solve in under 60 seconds
- Perfectionist: Solve with only 3 clues
- On Fire: 3-day solve streak
- Hot Streak: 7-day solve streak
- Veteran: Play 10 games
- Expert: Play 50 games

## Future Enhancements

- OpenAI integration for dynamic mystery generation
- Leaderboards
- Multiplayer modes
- Custom mystery creation
- More achievement types

## Original Project

Based on the Daily Cipher game by [@nrish12](https://github.com/nrish12/daily-cipher)

## License

MIT
