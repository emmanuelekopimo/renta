CREATE TYPE "public"."payment_method" AS ENUM('transfer', 'cash', 'card', 'pos');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('apartment', 'house', 'duplex', 'studio', 'shop');--> statement-breakpoint
CREATE TYPE "public"."reminder_channel" AS ENUM('email', 'sms', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'moved_out');--> statement-breakpoint
CREATE TABLE "landlords" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(160) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"paid_on" date NOT NULL,
	"method" "payment_method" DEFAULT 'transfer' NOT NULL,
	"reference" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"landlord_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"address" varchar(200) NOT NULL,
	"city" varchar(80) NOT NULL,
	"type" "property_type" DEFAULT 'apartment' NOT NULL,
	"units" integer DEFAULT 1 NOT NULL,
	"image" varchar(40) DEFAULT 'home-1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"channel" "reminder_channel" DEFAULT 'email' NOT NULL,
	"message" text NOT NULL,
	"amount_due" integer NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"email" varchar(160) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"unit_label" varchar(40) NOT NULL,
	"rent_amount" integer NOT NULL,
	"due_day" integer DEFAULT 1 NOT NULL,
	"lease_start" date NOT NULL,
	"lease_end" date,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_landlord_id_landlords_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."landlords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "landlords_email_idx" ON "landlords" USING btree ("email");--> statement-breakpoint
CREATE INDEX "payments_tenant_period_idx" ON "payments" USING btree ("tenant_id","period");--> statement-breakpoint
CREATE INDEX "properties_landlord_idx" ON "properties" USING btree ("landlord_id");--> statement-breakpoint
CREATE INDEX "reminders_tenant_idx" ON "reminders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenants_property_idx" ON "tenants" USING btree ("property_id");