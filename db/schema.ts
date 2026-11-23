/**
 * Drizzle schema mirror for Phase 3 Postgres (Supabase).
 * Apply SQL from `supabase/migrations/` to the database; keep this in sync for typed scripts.
 */
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  doublePrecision,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    handle: varchar('handle', { length: 32 }).notNull(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    countryCode: varchar('country_code', { length: 2 }),
    bio: text('bio'),
    isPublic: boolean('is_public').notNull().default(true),
    isKidsAccount: boolean('is_kids_account').notNull().default(false),
    parentEmail: text('parent_email'),
    parentVerifiedAt: timestamp('parent_verified_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    scheduledHardDeleteAt: timestamp('scheduled_hard_delete_at', { withTimezone: true }),
    serverDailyStreakCount: integer('server_daily_streak_count').notNull().default(0),
    serverDailyStreakLastUtcDate: date('server_daily_streak_last_utc_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    handleUnique: uniqueIndex('profiles_handle_unique').on(t.handle),
  })
);

export const userProgress = pgTable('user_progress', {
  userId: uuid('user_id').primaryKey(),
  payload: jsonb('payload').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const themes = pgTable(
  'themes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 64 }).notNull(),
    name: text('name').notNull(),
  },
  (t) => ({
    slugUnique: uniqueIndex('themes_slug_unique').on(t.slug),
  })
);

export const puzzles = pgTable('puzzles', {
  id: text('id').primaryKey(),
  tiles: jsonb('tiles').notNull(),
  target: integer('target').notNull(),
  difficulty: varchar('difficulty', { length: 16 }).notNull(),
  rating: doublePrecision('rating').notNull().default(1500),
  ratingRd: doublePrecision('rating_rd').notNull().default(350),
  ratingVol: doublePrecision('rating_vol').notNull().default(0.06),
  optimalSolution: jsonb('optimal_solution').notNull(),
  retiredAt: timestamp('retired_at', { withTimezone: true }),
});

export const puzzleThemes = pgTable(
  'puzzle_themes',
  {
    puzzleId: text('puzzle_id')
      .notNull()
      .references(() => puzzles.id, { onDelete: 'cascade' }),
    themeId: uuid('theme_id')
      .notNull()
      .references(() => themes.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.puzzleId, t.themeId] }),
  })
);

export const userRatings = pgTable(
  'user_ratings',
  {
    userId: uuid('user_id').notNull(),
    mode: varchar('mode', { length: 32 }).notNull(),
    rating: doublePrecision('rating').notNull(),
    rd: doublePrecision('rd').notNull(),
    vol: doublePrecision('vol').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.mode] }),
  })
);

export const ratingHistory = pgTable('rating_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  mode: varchar('mode', { length: 32 }).notNull(),
  rating: doublePrecision('rating').notNull(),
  rd: doublePrecision('rd').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dailyLeaderboardEntries = pgTable(
  'daily_leaderboard_entries',
  {
    puzzleUtcDate: date('puzzle_utc_date', { mode: 'string' }).notNull(),
    userId: uuid('user_id').notNull(),
    puzzleId: text('puzzle_id').notNull(),
    seconds: integer('seconds').notNull(),
    wrongAttempts: integer('wrong_attempts').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.puzzleUtcDate, t.userId] }),
  })
);

export const reservedHandles = pgTable('reserved_handles', {
  handle: varchar('handle', { length: 32 }).primaryKey(),
  reason: text('reason'),
});
