import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const unixNow = sql`(unixepoch())`;

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull().default("Student assistant"),
  pictureUrl: text("picture_url"),
  ageConfirmedAt: integer("age_confirmed_at"),
  createdAt: integer("created_at").notNull().default(unixNow),
});

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull().default(unixNow),
}, (table) => [index("sessions_user_id_idx").on(table.userId)]);

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }), slug: text("slug").unique(), displayName: text("display_name").notNull(), role: text("role").notNull(), bio: text("bio").notNull(), accentColor: text("accent_color").notNull(), avatarKey: text("avatar_key"), backgroundKey: text("background_key"), evaluationUrl: text("evaluation_url"), status: text("status").notNull(), createdAt: integer("created_at").notNull().default(unixNow), updatedAt: integer("updated_at").notNull().default(unixNow),
});
export const draftSocialLinks = sqliteTable("draft_social_links", {
  id: text("id").primaryKey(), profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }), service: text("service").notNull(), url: text("url").notNull(), displayOrder: integer("display_order").notNull(),
}, (table) => [uniqueIndex("draft_link_service_idx").on(table.profileId, table.service), uniqueIndex("draft_link_order_idx").on(table.profileId, table.displayOrder)]);
export const publishedProfiles = sqliteTable("published_profiles", {
  profileId: text("profile_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }), slug: text("slug").notNull().unique(), displayName: text("display_name").notNull(), role: text("role").notNull(), bio: text("bio").notNull(), accentColor: text("accent_color").notNull(), avatarKey: text("avatar_key"), backgroundKey: text("background_key"), evaluationUrl: text("evaluation_url").notNull(), publishedAt: integer("published_at").notNull().default(unixNow),
});
export const publishedSocialLinks = sqliteTable("published_social_links", {
  id: text("id").primaryKey(), profileId: text("profile_id").notNull().references(() => publishedProfiles.profileId, { onDelete: "cascade" }), service: text("service").notNull(), url: text("url").notNull(), displayOrder: integer("display_order").notNull(),
});
export const abuseReports = sqliteTable("abuse_reports", {
  id: text("id").primaryKey(), profileId: text("profile_id").references(() => profiles.id, { onDelete: "set null" }), reason: text("reason").notNull(), details: text("details").notNull(), status: text("status").notNull(), createdAt: integer("created_at").notNull().default(unixNow),
});
export const reservedSlugs = sqliteTable("reserved_slugs", {
  slug: text("slug").primaryKey(), profileId: text("profile_id").notNull().unique().references(() => profiles.id, { onDelete: "restrict" }), createdAt: integer("created_at").notNull().default(unixNow),
});

export type User = typeof users.$inferSelect;
