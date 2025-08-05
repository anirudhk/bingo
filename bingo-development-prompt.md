# Math Puzzle Game - Development Implementation Prompt

## Project Setup Instructions

You are tasked with building a math puzzle game web application. Follow this comprehensive prompt to implement the core features systematically.

## Phase 1: Initial Setup & Core Architecture

### 1. Project Initialization
Create a new React + TypeScript project with the following structure:

```
math-puzzle-game/
├── src/
│   ├── components/
│   │   ├── GameBoard/
│   │   ├── UI/
│   │   └── Layout/
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   ├── constants/
│   └── App.tsx
├── public/
└── package.json
```

**Required Dependencies:**
- React 18+ with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Zustand or Redux Toolkit for state management
- Framer Motion for animations (optional)

### 2. Core Type Definitions
Create comprehensive TypeScript interfaces in `src/types/game.ts`:

```typescript
interface Tile {
  id: number;
  value: number;
  position: { row: number; col: number };
  selected: boolean;
}

interface GameState {
  grid: Tile[];
  targetNumbers: number[];
  currentTarget: number;
  currentRound: number;
  selectedPath: Tile[];
  selectedOperators: string[];
  score: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface SwipeState {
  isActive: boolean;
  startTile: Tile | null;
  currentPath: Tile[];
  operators: string[];
  result: number | null;
}
```

### 3. Game Logic Implementation

#### A. Grid Generation (`src/utils/gridGenerator.ts`)
Implement these core functions:

```typescript
// Generate 4x4 grid with random numbers 1-9
export const generateGrid = (): Tile[] => {
  // Implementation required
}

// Calculate all possible 3-tile combinations
export const getAllCombinations = (grid: Tile[]): Array<{tiles: Tile[], operators: string[], result: number}> => {
  // Implementation required
}

// Generate 25-30 target numbers ensuring solvability
export const generateTargets = (combinations: Array<{tiles: Tile[], operators: string[], result: number}>): number[] => {
  // Prioritize mixed operators (+-, +*, -*, etc.)
  // Ensure results are under 50, no negatives
  // Implementation required
}
```

#### B. Mathematical Calculation (`src/utils/calculator.ts`)
```typescript
// Calculate result from 3 numbers and 2 operators (left to right)
export const calculateResult = (num1: number, op1: string, num2: number, op2: string, num3: number): number => {
  // Implementation required
}

// Validate if tiles are adjacent and form valid path
export const isValidPath = (tiles: Tile[]): boolean => {
  // Check horizontal or vertical adjacency only
  // No diagonals, no L-shapes
  // Implementation required
}
```

### 4. Core Components Implementation

#### A. Game Board Component (`src/components/GameBoard/GameBoard.tsx`)
```typescript
interface GameBoardProps {
  difficulty: 'easy' | 'medium' | 'hard';
}

export const GameBoard: React.FC<GameBoardProps> = ({ difficulty }) => {
  // State management for grid, targets, current game
  // Swipe detection logic
  // Real-time calculation display
  // Success/failure feedback
  // Implementation required
}
```

#### B. Grid Component (`src/components/GameBoard/Grid.tsx`)
```typescript
export const Grid: React.FC<{
  tiles: Tile[];
  onSwipeStart: (tile: Tile) => void;
  onSwipeMove: (tile: Tile) => void;
  onSwipeEnd: () => void;
  selectedPath: Tile[];
}> = ({ tiles, onSwipeStart, onSwipeMove, onSwipeEnd, selectedPath }) => {
  // Render 4x4 grid with tiles and operator icons
  // Handle touch events for swipe detection
  // Visual feedback for selected path
  // Implementation required
}
```

#### C. Number Tile Component (`src/components/GameBoard/NumberTile.tsx`)
```typescript
export const NumberTile: React.FC<{
  tile: Tile;
  isSelected: boolean;
  isInPath: boolean;
}> = ({ tile, isSelected, isInPath }) => {
  // Render individual number tile
  // Apply selection and path highlighting styles
  // Large touch targets for mobile
  // Implementation required
}
```

#### D. Operator Icon Component (`src/components/GameBoard/OperatorIcon.tsx`)
```typescript
export const OperatorIcon: React.FC<{
  operator: '+' | '-' | '*';
  position: 'horizontal' | 'vertical';
  isSelected: boolean;
}> = ({ operator, position, isSelected }) => {
  // Render operator icons between tiles
  // Handle selection highlighting
  // Proper positioning and sizing
  // Implementation required
}
```

### 5. Swipe Detection System

#### Touch Event Handling (`src/hooks/useSwipeDetection.ts`)
```typescript
export const useSwipeDetection = (
  grid: Tile[],
  onValidSwipe: (tiles: Tile[], operators: string[], result: number) => void
) => {
  // Handle touchstart, touchmove, touchend events
  // Track finger position and determine tiles/operators in path
  // Validate path constraints (straight lines only)
  // Calculate real-time result during swipe
  // Implementation required
}
```

### 6. Game State Management

#### Zustand Store (`src/store/gameStore.ts`)
```typescript
interface GameStore {
  // Game state properties
  grid: Tile[];
  targetNumbers: number[];
  currentTarget: number;
  currentRound: number;
  score: number;
  difficulty: 'easy' | 'medium' | 'hard';
  
  // Actions
  initializeGame: (difficulty: 'easy' | 'medium' | 'hard') => void;
  submitSolution: (tiles: Tile[], operators: string[]) => void;
  nextRound: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Implementation required
}));
```

### 7. UI Components

#### A. Target Display (`src/components/UI/TargetDisplay.tsx`)
```typescript
export const TargetDisplay: React.FC<{
  currentTarget: number;
  round: number;
  totalRounds: number;
}> = ({ currentTarget, round, totalRounds }) => {
  // Display current target number prominently
  // Show progress (Round X/30)
  // Implementation required
}
```

#### B. Calculation Feedback (`src/components/UI/CalculationFeedback.tsx`)
```typescript
export const CalculationFeedback: React.FC<{
  calculation: string;
  result: number | null;
  isCorrect?: boolean;
}> = ({ calculation, result, isCorrect }) => {
  // Show real-time calculation during swipe
  // Display result with success/failure styling
  // Implementation required
}
```

#### C. Difficulty Selector (`src/components/UI/DifficultySelector.tsx`)
```typescript
export const DifficultySelector: React.FC<{
  onSelect: (difficulty: 'easy' | 'medium' | 'hard') => void;
}> = ({ onSelect }) => {
  // Age-appropriate difficulty selection
  // Visual indicators for each level
  // Implementation required
}
```

### 8. Responsive Design Requirements

#### Mobile-First Styling
- **Grid Layout**: Use CSS Grid with proper spacing for touch interaction
- **Touch Targets**: Minimum 44px for all interactive elements
- **Operator Icons**: Position between tiles with adequate touch areas
- **Typography**: Large, readable fonts for numbers and targets
- **Animations**: Smooth transitions for selections and feedback

#### Breakpoint Strategy
```css
/* Mobile First: 320px+ */
.grid-container {
  /* 4x4 grid optimized for mobile screens */
}

/* Tablet: 768px+ */
@media (min-width: 768px) {
  .grid-container {
    /* Larger grid with more spacing */
  }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .grid-container {
    /* Centered layout with maximum width */
  }
}
```

### 9. PWA Implementation

#### Service Worker Setup (`public/sw.js`)
```javascript
// Cache game assets for offline play
// Background sync for score submission
// Push notification handling
// Implementation required
```

#### Web App Manifest (`public/manifest.json`)
```json
{
  "name": "Math Puzzle Game",
  "short_name": "MathPuzzle",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#4F46E5",
  "background_color": "#FFFFFF",
  "start_url": "/",
  "icons": [
    // Icon definitions
  ]
}
```

### 10. Testing Requirements

#### Unit Tests
- Grid generation and validation
- Mathematical calculations
- Path validation logic
- Target generation algorithms

#### Integration Tests
- Complete swipe gesture workflows
- Game state transitions
- Success/failure scenarios
- Difficulty level switching

#### E2E Tests
- Full game session completion
- Mobile touch interactions
- PWA installation flow
- Cross-browser compatibility

### 11. Development Checklist

#### Core Functionality
- [ ] 4x4 grid generation with random numbers 1-9
- [ ] Operator icons positioned between adjacent tiles
- [ ] Continuous swipe gesture detection
- [ ] Real-time calculation during swipe
- [ ] Target number generation (25-30 per session)
- [ ] Solution validation and scoring
- [ ] Session progression (same grid, new targets)

#### User Experience
- [ ] Mobile-responsive design
- [ ] Touch-optimized interface
- [ ] Visual feedback for selections
- [ ] Success/failure animations
- [ ] Progress indicators
- [ ] Difficulty level selection

#### Technical Requirements
- [ ] TypeScript implementation
- [ ] PWA features (offline, installable)
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Accessibility compliance
- [ ] Error handling and edge cases

### 12. Implementation Priority

#### Week 1-2: Foundation
1. Project setup and dependencies
2. Core type definitions
3. Grid generation and basic UI
4. Mathematical calculation utilities

#### Week 3-4: Interaction
1. Swipe detection system
2. Path validation logic
3. Real-time calculation feedback
4. Basic game flow implementation

#### Week 5-6: Polish
1. Visual design and animations
2. Responsive layout optimization
3. PWA features implementation
4. Testing and bug fixes

### 13. Code Quality Standards

#### TypeScript Guidelines
- Strict type checking enabled
- No implicit any types
- Comprehensive interface definitions
- Proper error handling with Result types

#### React Best Practices
- Functional components with hooks
- Proper state management patterns
- Memoization for performance optimization
- Clean component composition

#### Performance Considerations
- Efficient re-rendering patterns
- Touch event optimization
- Smooth 60fps animations
- Minimal bundle size

This prompt provides a comprehensive foundation for building the math puzzle game. Start with the core functionality and gradually add features according to the priority timeline.