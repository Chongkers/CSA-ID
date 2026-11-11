ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT 'Student assistant';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN picture_url TEXT;
--> statement-breakpoint
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Student assistant',
  bio TEXT NOT NULL DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '#B5121B',
  avatar_key TEXT,
  background_key TEXT,
  evaluation_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','suspended')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE draft_social_links (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK(service IN ('linkedin','instagram','facebook','github','youtube','tiktok','x','website')),
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL CHECK(display_order BETWEEN 0 AND 9),
  UNIQUE(profile_id, service),
  UNIQUE(profile_id, display_order)
);
--> statement-breakpoint
CREATE TABLE published_profiles (
  profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  avatar_key TEXT,
  background_key TEXT,
  evaluation_url TEXT NOT NULL,
  published_at INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE published_social_links (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES published_profiles(profile_id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  UNIQUE(profile_id, service),
  UNIQUE(profile_id, display_order)
);
--> statement-breakpoint
CREATE TABLE abuse_reports (
  id TEXT PRIMARY KEY,
  profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK(reason IN ('impersonation','malicious-link','prohibited-content')),
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','dismissed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE reserved_slugs (
  slug TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TRIGGER profiles_updated_at AFTER UPDATE ON profiles
BEGIN
  UPDATE profiles SET updated_at = unixepoch() WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER profiles_slug_immutable BEFORE UPDATE OF slug ON profiles
WHEN OLD.slug IS NOT NULL AND NEW.slug != OLD.slug
BEGIN
  SELECT RAISE(ABORT, 'profile slug is permanent');
END;
