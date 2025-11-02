# CIPHER HUNT - PROJECT HANDOFF DOCUMENT

## 🎯 PROJECT OVERVIEW
Building a daily mystery game called "Cipher Hunt" - like Wordle but with clues that reveal progressively.

## 📊 CURRENT STATUS
We were implementing **Version 3: 3 Daily Mysteries** with category selection.

### What Works Now:
✅ Basic game with 6 attempts and progressive clue reveals
✅ OpenAI mystery generation
✅ Stats tracking and achievements
✅ Category selection UI (person, place, thing)

### What We're Adding:
🔄 **3 daily mysteries** - Server generates ONE of each category daily (person, place, thing)
🔄 **Back button** - Return to menu after completing a category
🔄 **Completion tracking** - Mark categories as complete, show "✓ Completed" badge
🔄 **"Play Another"** button - After finishing, go back and try another category

---

## 📁 FILES GENERATED (Ready to Use)

### 1. **server.js** - REPLACE ENTIRE FILE
[View server_3mysteries.js](computer:///mnt/user-data/outputs/server_3mysteries.js)

**Key Changes:**
- Stores 3 mysteries: `{ person: {...}, place: {...}, thing: {...} }`
- Endpoint changed to: `/api/mystery/:category` (not query param)
- Endpoint changed to: `/api/clue/:category/:index`
- Endpoint changed to: `/api/guess/:category`
- Endpoint changed to: `/api/reveal/:category`
- Generates all 3 mysteries at midnight
- Auto-regenerates if date is old

### 2. **public/game.js** - REPLACE ENTIRE FILE
[View game_v3.js](computer:///mnt/user-data/outputs/game_v3.js)

**Key Changes:**
- Tracks `completedCategories` in localStorage
- `selectCategory()` function
- `backToMenu()` function - returns to category selection
- `updateCategoryButtons()` - shows "✓ Completed" badges
- Shows "Play Another (X left)" button after completing
- Shows "🎉 All Mysteries Solved!" when all 3 done

### 3. **public/index.html** - NEEDS UPDATES
[View index_with_categories.html](computer:///mnt/user-data/outputs/index_with_categories.html)

**Key Additions Needed:**
- Add `<button id="backToMenuBtn">◀ BACK TO MENU</button>` in game area header
- Add `<button id="playAnotherBtn">🎮 PLAY ANOTHER</button>` in results area
- Category selection already exists in this file

### 4. **public/styles.css** - ADD TO END OF FILE
[View category-styles.css](computer:///mnt/user-data/outputs/category-styles.css)

**Key Additions:**
- `.category-selection` styles
- `.category-btn` styles
- `.category-btn.selected` styles
- `.category-btn.completed` styles (needs to be added)
- `.completion-badge` styles (needs to be added)
- Back button styles (needs to be added)

### 5. **utils/mysteryGenerator.js** - REPLACE ENTIRE FILE
[View mysteryGenerator.js](computer:///mnt/user-data/outputs/mysteryGenerator.js)

**Key Changes:**
- New method: `generateMysteryByCategory(targetCategory)`
- New method: `getFallbackMysteryByCategory(category)`
- New method: `getAllFallbacks()`
- AI prompt now enforces specific category
- Falls back to category-specific fallback if AI fails

---

## 🔧 WHAT STILL NEEDS TO BE DONE

### 1. **Add Missing CSS for Completion Badges**
Add to `public/styles.css`:

```css
.category-btn.completed {
    opacity: 0.7;
    border-color: var(--success);
}

.completion-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background: var(--success);
    color: white;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 0.75em;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.back-to-menu-btn {
    position: absolute;
    top: 20px;
    left: 20px;
    background: var(--bg-elevated);
    border: 2px solid var(--border);
    color: var(--text);
    padding: 10px 20px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 700;
    transition: all 0.3s;
}

.back-to-menu-btn:hover {
    background: var(--border);
    transform: translateX(-3px);
}
```

### 2. **Update index.html with Back Button**
In the game area, add after opening `<div id="gameArea">`:

```html
<button id="backToMenuBtn" class="back-to-menu-btn">◀ BACK</button>
```

In the results area, add before the "VIEW PROFILE" button:

```html
<button id="playAnotherBtn" style="background: var(--accent); color: white; width: 100%; margin-bottom: 15px; display: none;">
    🎮 PLAY ANOTHER
</button>
```

### 3. **Test Flow**
1. Start server: `npm start`
2. Open http://localhost:3000
3. Should see 3 category buttons
4. Select PERSON → Start → Play game → Complete
5. Should see "✓ Completed" on PERSON button
6. Click "PLAY ANOTHER" → Back to menu
7. Select PLACE → Play → Complete
8. Both PERSON and PLACE should show "✓ Completed"
9. Complete THING → Should see "🎉 All Mysteries Solved!"

---

## 🐛 KNOWN ISSUES TO FIX

1. **localStorage dates** - Needs to reset at midnight
2. **OpenAI category matching** - Sometimes returns wrong category, needs retry logic
3. **"Play Another" button** - Might not hide when all 3 complete
4. **Position of back button** - Might overlap with stats on mobile

---

## 🎮 GAME MECHANICS

**3 Daily Mysteries:**
- Server generates 3 puzzles at midnight: PERSON, PLACE, THING
- Player chooses which category to play
- Each has 8 clues, starts with 3 visible
- 6 attempts max
- Wrong guess = reveal next clue
- Score: 1000 - (167 × wrong_attempts)

**User Flow:**
1. See 3 category buttons
2. Click one (highlights)
3. Click "START HUNT"
4. Play game (6 attempts, progressive clues)
5. Win/Lose → Results screen
6. Click "PLAY ANOTHER (2 left)"
7. Back to category screen (completed category shows ✓)
8. Repeat until all 3 done
9. See "All Mysteries Solved!" message

---

## 📦 PROJECT STRUCTURE

```
cipher-hunt/
├── server.js (REPLACE WITH server_3mysteries.js)
├── package.json
├── .env (OpenAI key)
├── public/
│   ├── index.html (UPDATE with buttons)
│   ├── game.js (REPLACE with game_v3.js)
│   └── styles.css (ADD category-styles.css to end + completion styles)
├── utils/
│   ├── mysteryGenerator.js (REPLACE)
│   ├── statsTracker.js (no changes needed)
│   └── achievementSystem.js (no changes needed)
└── data/
    ├── daily-mysteries.json (created by server)
    ├── stats.json
    └── profiles.json
```

---

## 🚀 NEXT STEPS FOR NEW CLAUDE

1. Read this handoff document
2. Replace server.js with server_3mysteries.js
3. Replace game.js with game_v3.js
4. Replace mysteryGenerator.js with the updated one
5. Add completion badge CSS to styles.css
6. Add category selection CSS to styles.css
7. Update index.html with back button and play another button
8. Test the full flow
9. Fix any issues that come up

---

## 💡 USER'S REQUEST

> "I want 3 daily mysteries (person, place, thing) loaded by AI daily. Players choose which to play. After completing one, they get a back button to return to menu and play another category."

**Status:** 90% complete, just needs CSS and HTML button additions

---

## 🔗 ALL FILES TO DOWNLOAD

1. [server_3mysteries.js](computer:///mnt/user-data/outputs/server_3mysteries.js) → Replace server.js
2. [game_v3.js](computer:///mnt/user-data/outputs/game_v3.js) → Replace public/game.js
3. [mysteryGenerator.js](computer:///mnt/user-data/outputs/mysteryGenerator.js) → Replace utils/mysteryGenerator.js
4. [index_with_categories.html](computer:///mnt/user-data/outputs/index_with_categories.html) → Reference for index.html updates
5. [category-styles.css](computer:///mnt/user-data/outputs/category-styles.css) → Add to public/styles.css

---

## ✅ TESTING CHECKLIST

- [ ] Server starts without errors
- [ ] Console shows "✓ PERSON: [answer]" "✓ PLACE: [answer]" "✓ THING: [answer]"
- [ ] Category selection screen appears
- [ ] Can select and deselect categories
- [ ] START HUNT button enables only when category selected
- [ ] Game loads with correct category
- [ ] Back button works during game
- [ ] Completing game marks category as complete
- [ ] "PLAY ANOTHER" button appears
- [ ] Can play all 3 categories
- [ ] After all 3, shows "All Mysteries Solved!"
- [ ] Next day, resets and generates 3 new mysteries

---

## 🎯 END GOAL

A daily game where:
- Players see 3 mystery types
- Can play all 3 in any order
- Each is generated by AI
- Progress is tracked
- Resets at midnight

**Current blocker:** Just needs final CSS and HTML button additions, then it's ready to test!

---

Good luck! 🚀
