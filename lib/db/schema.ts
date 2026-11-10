import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").unique(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("Student assistant"),
  bio: text("bio").notNull().default(""),
  accentColor: text("accent_color").notNull().default("#B5121B"),
  avatarKey: text("avatar_key"),
  backgroundKey: text("background_key"),
  evaluationUrl: text("evaluation_url"),
  status: text("status", { enum: ["draft", "published", "suspended"] }).notNull().default("draft"),
  createdAt: integer("created_at").notNull().default(unixNow),
  updatedAt: integer("updated_at").notNull().default(unixNow),
}, (table) => [check("profiles_status_check", sql`${table.status} IN ('draft','published','suspended')`)]);

export const draftSocialLinks = sqliteTable("draft_social_links", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  service: text("service").notNull(),
  url: text("url").notNull(),
  displayOrder: integer("display_order").notNull(),
}, (table) => [
  uniqueIndex("draft_link_service_idx").on(table.profileId, table.service),
  uniqueIndex("draft_link_order_idx").on(table.profileId, table.displayOrder),
  check("draft_link_service_check", sql`${table.service} IN ('linkedin','instagram','facebook','github','youtube','tiktok','x','website')`),
  check("draft_link_order_check", sql`${table.displayOrder} BETWEEN 0 AND 9`),
]);

export const publishedProfiles = sqliteTable("published_profiles", {
  profileId: text("profile_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  bio: text("bio").notNull(),
  accentColor: text("accent_color").notNull(),
  avatarKey: text("avatar_key"),
  backgroundKey: text("background_key"),
  evaluationUrl: text("evaluation_url").notNull(),
  publishedAt: integer("published_at").notNull().default(unixNow),
});

export const publishedSocialLinks = sqliteTable("published_social_links", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => publishedProfiles.profileId, { onDelete: "cascade" }),
  service: text("service").notNull(),
  url: text("url").notNull(),
  displayOrder: integer("display_order").notNull(),
}, (table) => [
  uniqueIndex("published_link_service_idx").on(table.profileId, table.service),
  uniqueIndex("published_link_order_idx").on(table.profileId, table.displayOrder),
]);

export const abuseReports = sqliteTable("abuse_reports", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").references(() => profiles.id, { onDelete: "set null" }),
  reason: text("reason", { enum: ["impersonation", "malicious-link", "prohibited-content"] }).notNull(),
  details: text("details").notNull().default(""),
  status: text("status", { enum: ["open", "resolved", "dismissed"] }).notNull().default("open"),
  createdAt: integer("created_at").notNull().default(unixNow),
}, (table) => [
  check("abuse_reports_reason_check", sql`${table.reason} IN ('impersonation','malicious-link','prohibited-content')`),
  check("abuse_reports_status_check", sql`${table.status} IN ('open','resolved','dismissed')`),
]);

export const reservedSlugs = sqliteTable("reserved_slugs", {
  slug: text("slug").primaryKey(),
  profileId: text("profile_id").notNull().unique().references(() => profiles.id, { onDelete: "restrict" }),
  createdAt: integer("created_at").notNull().default(unixNow),
});

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
