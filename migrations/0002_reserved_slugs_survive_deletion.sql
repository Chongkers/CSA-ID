PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reserved_slugs` (
	`slug` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_reserved_slugs`("slug", "profile_id", "created_at") SELECT "slug", "profile_id", "created_at" FROM `reserved_slugs`;--> statement-breakpoint
DROP TABLE `reserved_slugs`;--> statement-breakpoint
ALTER TABLE `__new_reserved_slugs` RENAME TO `reserved_slugs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `reserved_slugs_profile_id_unique` ON `reserved_slugs` (`profile_id`);