


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."course_status" AS ENUM (
    'pending',
    'approved',
    'hidden',
    'rejected'
);


ALTER TYPE "public"."course_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role_enum" AS ENUM (
    'student',
    'instructor',
    'admin'
);


ALTER TYPE "public"."user_role_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_user_enrollments_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Cập nhật enrollment_count cho course được enroll
  update public.courses
  set enrollment_count = (
    select count(*) 
    from public.user_enrollments 
    where course_id = new.course_id
  )
  where course_id = new.course_id;

  -- Cập nhật top 7 bestseller
  perform public.update_bestseller_courses();

  return null;
end;
$$;


ALTER FUNCTION "public"."trg_user_enrollments_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_bestseller_courses"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Reset toàn bộ
  update public.courses
  set is_bestseller = false;

  -- Đặt true cho top 7 course có enrollment_count cao nhất
  update public.courses
  set is_bestseller = true
  where course_id in (
    select course_id
    from public.courses
    order by enrollment_count desc, view_count desc, rating_avg desc
    limit 4
  );
end;
$$;


ALTER FUNCTION "public"."update_bestseller_courses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chat_session_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE chat_sessions 
  SET last_activity = CURRENT_TIMESTAMP 
  WHERE session_id = NEW.session_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_chat_session_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_course_fts_document"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.fts_document :=
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.short_description, ''))), 'B');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_course_fts_document"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "category_id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "parent_category_id" integer,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."categories_category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."categories_category_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."categories_category_id_seq" OWNED BY "public"."categories"."category_id";



CREATE TABLE IF NOT EXISTS "public"."chapters" (
    "chapter_id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "title" character varying(500) NOT NULL,
    "order_index" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."chapters" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."chapters_chapter_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."chapters_chapter_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."chapters_chapter_id_seq" OWNED BY "public"."chapters"."chapter_id";



CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."contact_messages_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."contact_messages_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."contact_messages_id_seq" OWNED BY "public"."contact_messages"."id";



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user1_id" integer NOT NULL,
    "user2_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "course_id" integer NOT NULL,
    "title" character varying(500) NOT NULL,
    "short_description" "text",
    "full_description" "text",
    "image_url" character varying(1000),
    "large_image_url" character varying(1000),
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "sale_price" numeric(10,2),
    "instructor_id" integer NOT NULL,
    "category_id" integer NOT NULL,
    "is_bestseller" boolean DEFAULT false,
    "is_complete" boolean DEFAULT false,
    "view_count" integer DEFAULT 0,
    "enrollment_count" integer DEFAULT 0,
    "rating_avg" numeric(2,1) DEFAULT 0,
    "rating_count" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "fts_document" "tsvector",
    "requirements" "text",
    "status" "public"."course_status" DEFAULT 'pending'::"public"."course_status",
    CONSTRAINT "courses_check" CHECK ((("price" >= (0)::numeric) AND (("sale_price" IS NULL) OR ("sale_price" <= "price"))))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."courses_course_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."courses_course_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."courses_course_id_seq" OWNED BY "public"."courses"."course_id";



CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "lesson_id" integer NOT NULL,
    "chapter_id" integer NOT NULL,
    "title" character varying(500) NOT NULL,
    "video_url" character varying(1000),
    "duration_seconds" integer,
    "is_previewable" boolean DEFAULT false,
    "order_index" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "content" "text"
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."lessons_lesson_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."lessons_lesson_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."lessons_lesson_id_seq" OWNED BY "public"."lessons"."lesson_id";



CREATE TABLE IF NOT EXISTS "public"."message_storage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "messages" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_storage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "review_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reviews_review_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reviews_review_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reviews_review_id_seq" OWNED BY "public"."reviews"."review_id";



CREATE TABLE IF NOT EXISTS "public"."session" (
    "sid" character varying NOT NULL,
    "sess" json NOT NULL,
    "expire" timestamp(6) without time zone NOT NULL
);


ALTER TABLE "public"."session" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_enrollments" (
    "enrollment_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "enrolled_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "user_id" integer NOT NULL,
    "full_name" character varying(100) NOT NULL,
    "email" character varying(255) NOT NULL,
    "password_hash" character varying(255) NOT NULL,
    "role" "public"."user_role_enum" DEFAULT 'student'::"public"."user_role_enum" NOT NULL,
    "bio" "text",
    "avatar_url" character varying(1000),
    "is_verified" boolean DEFAULT false,
    "otp_secret" character varying(50),
    "otp_expires_at" timestamp without time zone,
    "oauth_provider" character varying(50),
    "oauth_id" character varying(255),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "is_banned" boolean DEFAULT false NOT NULL,
    "banned_until" timestamp with time zone,
    "ban_reason" "text",
    "banned_by" integer,
    "banned_at" timestamp with time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."top_week_courses" AS
 SELECT "c"."course_id",
    "c"."title",
    "c"."short_description",
    "c"."full_description",
    "c"."image_url",
    "c"."large_image_url",
    ("c"."price")::integer AS "price",
    ("c"."sale_price")::integer AS "sale_price",
    "c"."is_bestseller",
    "c"."is_complete",
    "c"."view_count",
    "c"."enrollment_count",
    "c"."requirements",
    "c"."status",
    "c"."created_at",
    "c"."updated_at",
    "round"("avg"("r"."rating"), 2) AS "rating_avg_week",
    "count"("r"."review_id") AS "rating_count_week",
    "cat"."category_id",
    "cat"."name" AS "category_name",
    "u"."user_id" AS "instructor_id",
    "u"."full_name" AS "instructor_name",
    "u"."avatar_url" AS "instructor_avatar",
    "count"(DISTINCT "e"."enrollment_id") AS "enroll_count_week"
   FROM (((("public"."courses" "c"
     JOIN "public"."users" "u" ON (("c"."instructor_id" = "u"."user_id")))
     JOIN "public"."categories" "cat" ON (("c"."category_id" = "cat"."category_id")))
     LEFT JOIN "public"."reviews" "r" ON ((("r"."course_id" = "c"."course_id") AND ("r"."created_at" >= ("now"() - '7 days'::interval)))))
     LEFT JOIN "public"."user_enrollments" "e" ON ((("e"."course_id" = "c"."course_id") AND ("e"."enrolled_at" >= ("now"() - '7 days'::interval)))))
  GROUP BY "c"."course_id", "c"."title", "c"."short_description", "c"."full_description", "c"."image_url", "c"."large_image_url", "c"."price", "c"."sale_price", "c"."is_bestseller", "c"."is_complete", "c"."view_count", "c"."enrollment_count", "c"."requirements", "c"."status", "c"."created_at", "c"."updated_at", "cat"."category_id", "cat"."name", "u"."user_id", "u"."full_name", "u"."avatar_url"
 HAVING ("count"("r"."review_id") > 0)
  ORDER BY ("round"("avg"("r"."rating"), 2)) DESC, ("count"("r"."review_id")) DESC, ("count"(DISTINCT "e"."enrollment_id")) DESC
 LIMIT 3;


ALTER VIEW "public"."top_week_courses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_enrollments_enrollment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_enrollments_enrollment_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_enrollments_enrollment_id_seq" OWNED BY "public"."user_enrollments"."enrollment_id";



CREATE TABLE IF NOT EXISTS "public"."user_lesson_progress" (
    "progress_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "lesson_id" integer NOT NULL,
    "is_completed" boolean DEFAULT true,
    "completed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_lesson_progress" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_lesson_progress_progress_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_lesson_progress_progress_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_lesson_progress_progress_id_seq" OWNED BY "public"."user_lesson_progress"."progress_id";



CREATE TABLE IF NOT EXISTS "public"."user_wishlist" (
    "wishlist_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "added_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_wishlist" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_wishlist_wishlist_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_wishlist_wishlist_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_wishlist_wishlist_id_seq" OWNED BY "public"."user_wishlist"."wishlist_id";



CREATE SEQUENCE IF NOT EXISTS "public"."users_user_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."users_user_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."users_user_id_seq" OWNED BY "public"."users"."user_id";



CREATE OR REPLACE VIEW "public"."vw_course_reviews" AS
 SELECT "r"."review_id",
    "r"."rating",
    "r"."comment",
    "r"."created_at",
    "u"."user_id",
    "u"."full_name" AS "user_name",
    "u"."avatar_url" AS "user_avatar",
    "c"."course_id",
    "c"."title" AS "course_title"
   FROM (("public"."reviews" "r"
     LEFT JOIN "public"."users" "u" ON (("r"."user_id" = "u"."user_id")))
     LEFT JOIN "public"."courses" "c" ON (("r"."course_id" = "c"."course_id")))
  ORDER BY "r"."created_at" DESC
 LIMIT 10;


ALTER VIEW "public"."vw_course_reviews" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_most_view_courses" AS
SELECT
    NULL::integer AS "course_id",
    NULL::character varying(500) AS "title",
    NULL::character varying(1000) AS "image_url",
    NULL::numeric(2,1) AS "rating_avg",
    NULL::integer AS "sale_price",
    NULL::character varying(255) AS "category_name",
    NULL::character varying(100) AS "instructor_name",
    NULL::character varying(1000) AS "avatar_url",
    NULL::bigint AS "enroll_count";


ALTER VIEW "public"."vw_most_view_courses" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_newest_courses" AS
 SELECT "c"."course_id",
    "c"."title",
    "c"."image_url",
    "c"."rating_avg",
    ("c"."sale_price")::integer AS "sale_price",
    "cat"."name" AS "category_name",
    "u"."full_name" AS "instructor_name",
    "u"."avatar_url",
    COALESCE("count"("e"."enrollment_id"), (0)::bigint) AS "enroll_count"
   FROM ((("public"."courses" "c"
     LEFT JOIN "public"."user_enrollments" "e" ON (("e"."course_id" = "c"."course_id")))
     JOIN "public"."users" "u" ON (("c"."instructor_id" = "u"."user_id")))
     JOIN "public"."categories" "cat" ON (("c"."category_id" = "cat"."category_id")))
  WHERE (("c"."created_at" IS NOT NULL) AND ("c"."status" <> 'hidden'::"public"."course_status"))
  GROUP BY "c"."course_id", "c"."title", "c"."image_url", "c"."rating_avg", "c"."sale_price", "cat"."name", "u"."full_name", "u"."avatar_url", "c"."created_at"
  ORDER BY "c"."created_at" DESC
 LIMIT 10;


ALTER VIEW "public"."vw_newest_courses" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_top_categories" AS
 SELECT "cat"."category_id",
    "cat"."name" AS "category_name",
    "count"("c"."course_id") AS "total_courses",
    "sum"(COALESCE("c"."enrollment_count", 0)) AS "total_enrollments"
   FROM ("public"."courses" "c"
     JOIN "public"."categories" "cat" ON (("c"."category_id" = "cat"."category_id")))
  GROUP BY "cat"."category_id", "cat"."name"
  ORDER BY ("sum"(COALESCE("c"."enrollment_count", 0))) DESC
 LIMIT 5;


ALTER VIEW "public"."vw_top_categories" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories" ALTER COLUMN "category_id" SET DEFAULT "nextval"('"public"."categories_category_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."chapters" ALTER COLUMN "chapter_id" SET DEFAULT "nextval"('"public"."chapters_chapter_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."contact_messages" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."contact_messages_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."courses" ALTER COLUMN "course_id" SET DEFAULT "nextval"('"public"."courses_course_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."lessons" ALTER COLUMN "lesson_id" SET DEFAULT "nextval"('"public"."lessons_lesson_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."reviews" ALTER COLUMN "review_id" SET DEFAULT "nextval"('"public"."reviews_review_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_enrollments" ALTER COLUMN "enrollment_id" SET DEFAULT "nextval"('"public"."user_enrollments_enrollment_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_lesson_progress" ALTER COLUMN "progress_id" SET DEFAULT "nextval"('"public"."user_lesson_progress_progress_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_wishlist" ALTER COLUMN "wishlist_id" SET DEFAULT "nextval"('"public"."user_wishlist_wishlist_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."users" ALTER COLUMN "user_id" SET DEFAULT "nextval"('"public"."users_user_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id");



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_course_id_order_index_key" UNIQUE ("course_id", "order_index");



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_pkey" PRIMARY KEY ("chapter_id");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_user1_id_user2_id_key" UNIQUE ("user1_id", "user2_id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("course_id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_chapter_id_order_index_key" UNIQUE ("chapter_id", "order_index");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("lesson_id");



ALTER TABLE ONLY "public"."message_storage"
    ADD CONSTRAINT "message_storage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("review_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."session"
    ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "uq_oauth" UNIQUE ("oauth_provider", "oauth_id");



ALTER TABLE ONLY "public"."user_enrollments"
    ADD CONSTRAINT "user_enrollments_pkey" PRIMARY KEY ("enrollment_id");



ALTER TABLE ONLY "public"."user_enrollments"
    ADD CONSTRAINT "user_enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."user_lesson_progress"
    ADD CONSTRAINT "user_lesson_progress_pkey" PRIMARY KEY ("progress_id");



ALTER TABLE ONLY "public"."user_lesson_progress"
    ADD CONSTRAINT "user_lesson_progress_user_id_lesson_id_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."user_wishlist"
    ADD CONSTRAINT "user_wishlist_pkey" PRIMARY KEY ("wishlist_id");



ALTER TABLE ONLY "public"."user_wishlist"
    ADD CONSTRAINT "user_wishlist_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "IDX_session_expire" ON "public"."session" USING "btree" ("expire");



CREATE INDEX "course_fts_idx" ON "public"."courses" USING "gin" ("fts_document");



CREATE INDEX "idx_conversations_user1_id" ON "public"."conversations" USING "btree" ("user1_id");



CREATE INDEX "idx_conversations_user2_id" ON "public"."conversations" USING "btree" ("user2_id");



CREATE INDEX "idx_message_storage_conversation_id" ON "public"."message_storage" USING "btree" ("conversation_id");



CREATE INDEX "idx_message_storage_created_at" ON "public"."message_storage" USING "btree" ("created_at");



CREATE INDEX "idx_message_storage_messages_gin" ON "public"."message_storage" USING "gin" ("messages");



CREATE INDEX "idx_users_banned_until" ON "public"."users" USING "btree" ("banned_until");



CREATE INDEX "idx_users_is_banned" ON "public"."users" USING "btree" ("is_banned");



CREATE OR REPLACE VIEW "public"."vw_most_view_courses" AS
 SELECT "c"."course_id",
    "c"."title",
    "c"."image_url",
    "c"."rating_avg",
    ("c"."sale_price")::integer AS "sale_price",
    "cat"."name" AS "category_name",
    "u"."full_name" AS "instructor_name",
    "u"."avatar_url",
    COALESCE("count"("e"."enrollment_id"), (0)::bigint) AS "enroll_count"
   FROM ((("public"."courses" "c"
     LEFT JOIN "public"."user_enrollments" "e" ON (("e"."course_id" = "c"."course_id")))
     JOIN "public"."users" "u" ON (("c"."instructor_id" = "u"."user_id")))
     JOIN "public"."categories" "cat" ON (("c"."category_id" = "cat"."category_id")))
  WHERE (("c"."created_at" IS NOT NULL) AND ("c"."status" <> 'hidden'::"public"."course_status"))
  GROUP BY "c"."course_id", "c"."title", "c"."image_url", "c"."rating_avg", "c"."sale_price", "cat"."name", "u"."full_name", "u"."avatar_url", "c"."created_at"
  ORDER BY "c"."view_count" DESC
 LIMIT 10;



CREATE OR REPLACE TRIGGER "course_fts_trigger" BEFORE INSERT OR UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_course_fts_document"();



CREATE OR REPLACE TRIGGER "trg_update_enrollment_count" AFTER INSERT ON "public"."user_enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."trg_user_enrollments_insert"();



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("category_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("chapter_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_storage"
    ADD CONSTRAINT "message_storage_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_enrollments"
    ADD CONSTRAINT "user_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_enrollments"
    ADD CONSTRAINT "user_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_lesson_progress"
    ADD CONSTRAINT "user_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("lesson_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_lesson_progress"
    ADD CONSTRAINT "user_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_wishlist"
    ADD CONSTRAINT "user_wishlist_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_wishlist"
    ADD CONSTRAINT "user_wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_banned_by_fkey" FOREIGN KEY ("banned_by") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;



CREATE POLICY "Users can create conversations" ON "public"."conversations" FOR INSERT WITH CHECK ((("user1_id" = ( SELECT "users"."user_id"
   FROM "public"."users"
  WHERE (("users"."email")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))) OR ("user2_id" = ( SELECT "users"."user_id"
   FROM "public"."users"
  WHERE (("users"."email")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text"))))));



CREATE POLICY "Users can insert messages in their conversations" ON "public"."message_storage" FOR INSERT WITH CHECK (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE (("conversations"."user1_id" = ( SELECT "users"."user_id"
           FROM "public"."users"
          WHERE (("users"."email")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))) OR ("conversations"."user2_id" = ( SELECT "users"."user_id"
           FROM "public"."users"
          WHERE (("users"."email")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text"))))))));



CREATE POLICY "Users can update messages in their conversations" ON "public"."message_storage" FOR UPDATE USING (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE (("conversations"."user1_id" = ( SELECT "users"."user_id"
           FROM "public"."users"
          WHERE (("users"."email")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))) OR ("conversations"."user2_id" = ( SELECT "users"."user_id"
           FROM "public"."users"
          WHERE (("users"."email")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text"))))))));



CREATE POLICY "Users can view messages in their conversations" ON "public"."message_storage" FOR SELECT USING (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE (("conversations"."user1_id" = ( SELECT "users"."user_id"
           FROM "public"."users"
          WHERE (("users"."email")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))) OR ("conversations"."user2_id" = ( SELECT "users"."user_id"
           FROM "public"."users"
          WHERE (("users"."email")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text"))))))));



CREATE POLICY "Users can view their own conversations" ON "public"."conversations" FOR SELECT USING ((("user1_id" = ( SELECT "users"."user_id"
   FROM "public"."users"
  WHERE (("users"."email")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))) OR ("user2_id" = ( SELECT "users"."user_id"
   FROM "public"."users"
  WHERE (("users"."email")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text"))))));



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_storage" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."trg_user_enrollments_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_user_enrollments_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_user_enrollments_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_bestseller_courses"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_bestseller_courses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_bestseller_courses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_chat_session_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_chat_session_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chat_session_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_course_fts_document"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_course_fts_document"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_course_fts_document"() TO "service_role";


















GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_category_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_category_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_category_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."chapters" TO "anon";
GRANT ALL ON TABLE "public"."chapters" TO "authenticated";
GRANT ALL ON TABLE "public"."chapters" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chapters_chapter_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chapters_chapter_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chapters_chapter_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contact_messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contact_messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contact_messages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."courses_course_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."courses_course_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."courses_course_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON SEQUENCE "public"."lessons_lesson_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."lessons_lesson_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."lessons_lesson_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."message_storage" TO "anon";
GRANT ALL ON TABLE "public"."message_storage" TO "authenticated";
GRANT ALL ON TABLE "public"."message_storage" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reviews_review_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reviews_review_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reviews_review_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."session" TO "anon";
GRANT ALL ON TABLE "public"."session" TO "authenticated";
GRANT ALL ON TABLE "public"."session" TO "service_role";



GRANT ALL ON TABLE "public"."user_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."user_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."top_week_courses" TO "anon";
GRANT ALL ON TABLE "public"."top_week_courses" TO "authenticated";
GRANT ALL ON TABLE "public"."top_week_courses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_enrollments_enrollment_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_enrollments_enrollment_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_enrollments_enrollment_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_lesson_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_lesson_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_lesson_progress" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_lesson_progress_progress_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_lesson_progress_progress_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_lesson_progress_progress_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_wishlist" TO "anon";
GRANT ALL ON TABLE "public"."user_wishlist" TO "authenticated";
GRANT ALL ON TABLE "public"."user_wishlist" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_wishlist_wishlist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_wishlist_wishlist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_wishlist_wishlist_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_user_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_user_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_user_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vw_course_reviews" TO "anon";
GRANT ALL ON TABLE "public"."vw_course_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_course_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."vw_most_view_courses" TO "anon";
GRANT ALL ON TABLE "public"."vw_most_view_courses" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_most_view_courses" TO "service_role";



GRANT ALL ON TABLE "public"."vw_newest_courses" TO "anon";
GRANT ALL ON TABLE "public"."vw_newest_courses" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_newest_courses" TO "service_role";



GRANT ALL ON TABLE "public"."vw_top_categories" TO "anon";
GRANT ALL ON TABLE "public"."vw_top_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_top_categories" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































