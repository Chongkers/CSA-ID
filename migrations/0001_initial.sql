CREATE TABLE `abuse_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`reason` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "abuse_reports_reason_check" CHECK("abuse_reports"."reason" IN ('impersonation','malicious-link','prohibited-content')),
	CONSTRAINT "abuse_reports_status_check" CHECK("abuse_reports"."status" IN ('open','resolved','dismissed'))
);
--> statement-breakpoint
CREATE TABLE `draft_social_links` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`service` text NOT NULL,
	`url` text NOT NULL,
	`display_order` integer NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "draft_link_service_check" CHECK("draft_social_links"."service" IN ('linkedin','instagram','facebook','github','youtube','tiktok','x','website')),
	CONSTRAINT "draft_link_order_check" CHECK("draft_social_links"."display_order" BETWEEN 0 AND 9)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `draft_link_service_idx` ON `draft_social_links` (`profile_id`,`service`);--> statement-breakpoint
CREATE UNIQUE INDEX `draft_link_order_idx` ON `draft_social_links` (`profile_id`,`display_order`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slug` text,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'Student assistant' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`accent_color` text DEFAULT '#B5121B' NOT NULL,
	`avatar_key` text,
	`background_key` text,
	`evaluation_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "profiles_status_check" CHECK("profiles"."status" IN ('draft','published','suspended'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_user_id_unique` ON `profiles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_slug_unique` ON `profiles` (`slug`);--> statement-breakpoint
CREATE TABLE `published_profiles` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`bio` text NOT NULL,
	`accent_color` text NOT NULL,
	`avatar_key` text,
	`background_key` text,
	`evaluation_url` text NOT NULL,
	`published_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `published_profiles_slug_unique` ON `published_profiles` (`slug`);--> statement-breakpoint
CREATE TABLE `published_social_links` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`service` text NOT NULL,
	`url` text NOT NULL,
	`display_order` integer NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `published_profiles`(`profile_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `published_link_service_idx` ON `published_social_links` (`profile_id`,`service`);--> statement-breakpoint
CREATE UNIQUE INDEX `published_link_order_idx` ON `published_social_links` (`profile_id`,`display_order`);--> statement-breakpoint
CREATE TABLE `reserved_slugs` (
	`slug` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reserved_slugs_profile_id_unique` ON `reserved_slugs` (`profile_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `name` text DEFAULT 'Student assistant' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `picture_url` text;--> statement-breakpoint
CREATE TRIGGER `profiles_updated_at` AFTER UPDATE ON `profiles`
BEGIN
  UPDATE `profiles` SET `updated_at` = unixepoch() WHERE `id` = NEW.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `profiles_slug_immutable` BEFORE UPDATE OF `slug` ON `profiles`
WHEN OLD.`slug` IS NOT NULL AND NEW.`slug` IS NOT OLD.`slug`
BEGIN
  SELECT RAISE(ABORT, 'profile slug is permanent');
END;
