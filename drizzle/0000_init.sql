CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"role" text NOT NULL,
	"action" text NOT NULL,
	"details" text NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracking_number" text NOT NULL,
	"reference_number" text NOT NULL,
	"carrier" text NOT NULL,
	"service_level" text NOT NULL,
	"status" text NOT NULL,
	"shipper_name" text NOT NULL,
	"shipper_company" text,
	"shipper_street1" text NOT NULL,
	"shipper_city" text NOT NULL,
	"shipper_state" text NOT NULL,
	"shipper_zip" text NOT NULL,
	"shipper_country" text NOT NULL,
	"shipper_email" text,
	"recipient_name" text NOT NULL,
	"recipient_company" text,
	"recipient_street1" text NOT NULL,
	"recipient_city" text NOT NULL,
	"recipient_state" text NOT NULL,
	"recipient_zip" text NOT NULL,
	"recipient_country" text NOT NULL,
	"recipient_email" text,
	"weight_kg" real NOT NULL,
	"length_cm" integer NOT NULL,
	"width_cm" integer NOT NULL,
	"height_cm" integer NOT NULL,
	"declared_value_usd" real NOT NULL,
	"is_fragile" boolean DEFAULT false NOT NULL,
	"is_cold_chain" boolean DEFAULT false NOT NULL,
	"requires_signature" boolean DEFAULT false NOT NULL,
	"base_cost" real NOT NULL,
	"fuel_surcharge" real NOT NULL,
	"total_cost" real NOT NULL,
	"current_checkpoint_index" integer DEFAULT 0 NOT NULL,
	"checkpoints_json" text NOT NULL,
	"proof_of_delivery_json" text,
	"special_instructions" text,
	"created_at" timestamp DEFAULT now(),
	"estimated_delivery" timestamp NOT NULL,
	CONSTRAINT "shipments_tracking_number_unique" UNIQUE("tracking_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"company" text,
	"phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_login" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
	--> statement-breakpoint
	ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
	ALTER TABLE "shipments" ENABLE ROW LEVEL SECURITY;
	ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
