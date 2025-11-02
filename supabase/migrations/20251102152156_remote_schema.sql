drop extension if exists "pg_net";

alter table "public"."courses" drop constraint "courses_check";

drop view if exists "public"."top3_week_courses";

drop view if exists "public"."vw_root_categories";


  create table "public"."session" (
    "sid" character varying not null,
    "sess" json not null,
    "expire" timestamp(6) without time zone not null
      );


alter table "public"."users" add column "ban_reason" text;

alter table "public"."users" add column "banned_at" timestamp with time zone;

alter table "public"."users" add column "banned_by" integer;

alter table "public"."users" add column "banned_until" timestamp with time zone;

alter table "public"."users" add column "is_banned" boolean not null default false;

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);

CREATE INDEX idx_users_banned_until ON public.users USING btree (banned_until);

CREATE INDEX idx_users_is_banned ON public.users USING btree (is_banned);

CREATE UNIQUE INDEX session_pkey ON public.session USING btree (sid);

alter table "public"."session" add constraint "session_pkey" PRIMARY KEY using index "session_pkey";

alter table "public"."users" add constraint "users_banned_by_fkey" FOREIGN KEY (banned_by) REFERENCES public.users(user_id) ON DELETE SET NULL not valid;

alter table "public"."users" validate constraint "users_banned_by_fkey";

alter table "public"."courses" add constraint "courses_check" CHECK (((price >= (0)::numeric) AND ((sale_price IS NULL) OR (sale_price <= price)))) not valid;

alter table "public"."courses" validate constraint "courses_check";

set check_function_bodies = off;

create or replace view "public"."top_week_courses" as  SELECT c.course_id,
    c.title,
    c.short_description,
    c.full_description,
    c.image_url,
    c.large_image_url,
    (c.price)::integer AS price,
    (c.sale_price)::integer AS sale_price,
    c.is_bestseller,
    c.is_complete,
    c.view_count,
    c.enrollment_count,
    c.requirements,
    c.status,
    c.created_at,
    c.updated_at,
    round(avg(r.rating), 2) AS rating_avg_week,
    count(r.review_id) AS rating_count_week,
    cat.category_id,
    cat.name AS category_name,
    u.user_id AS instructor_id,
    u.full_name AS instructor_name,
    u.avatar_url AS instructor_avatar,
    count(DISTINCT e.enrollment_id) AS enroll_count_week
   FROM ((((public.courses c
     JOIN public.users u ON ((c.instructor_id = u.user_id)))
     JOIN public.categories cat ON ((c.category_id = cat.category_id)))
     LEFT JOIN public.reviews r ON (((r.course_id = c.course_id) AND (r.created_at >= (now() - '7 days'::interval)))))
     LEFT JOIN public.user_enrollments e ON (((e.course_id = c.course_id) AND (e.enrolled_at >= (now() - '7 days'::interval)))))
  GROUP BY c.course_id, c.title, c.short_description, c.full_description, c.image_url, c.large_image_url, c.price, c.sale_price, c.is_bestseller, c.is_complete, c.view_count, c.enrollment_count, c.requirements, c.status, c.created_at, c.updated_at, cat.category_id, cat.name, u.user_id, u.full_name, u.avatar_url
 HAVING (count(r.review_id) > 0)
  ORDER BY (round(avg(r.rating), 2)) DESC, (count(r.review_id)) DESC, (count(DISTINCT e.enrollment_id)) DESC
 LIMIT 3;


CREATE OR REPLACE FUNCTION public.trg_user_enrollments_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_bestseller_courses()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;

create or replace view "public"."vw_top_categories" as  SELECT cat.category_id,
    cat.name AS category_name,
    count(c.course_id) AS total_courses,
    sum(COALESCE(c.enrollment_count, 0)) AS total_enrollments
   FROM (public.courses c
     JOIN public.categories cat ON ((c.category_id = cat.category_id)))
  GROUP BY cat.category_id, cat.name
  ORDER BY (sum(COALESCE(c.enrollment_count, 0))) DESC
 LIMIT 5;


create or replace view "public"."vw_most_view_courses" as  SELECT c.course_id,
    c.title,
    c.image_url,
    c.rating_avg,
    (c.sale_price)::integer AS sale_price,
    cat.name AS category_name,
    u.full_name AS instructor_name,
    u.avatar_url,
    COALESCE(count(e.enrollment_id), (0)::bigint) AS enroll_count
   FROM (((public.courses c
     LEFT JOIN public.user_enrollments e ON ((e.course_id = c.course_id)))
     JOIN public.users u ON ((c.instructor_id = u.user_id)))
     JOIN public.categories cat ON ((c.category_id = cat.category_id)))
  WHERE ((c.created_at IS NOT NULL) AND (c.status <> 'hidden'::public.course_status))
  GROUP BY c.course_id, c.title, c.image_url, c.rating_avg, c.sale_price, cat.name, u.full_name, u.avatar_url, c.created_at
  ORDER BY c.view_count DESC
 LIMIT 10;


create or replace view "public"."vw_newest_courses" as  SELECT c.course_id,
    c.title,
    c.image_url,
    c.rating_avg,
    (c.sale_price)::integer AS sale_price,
    cat.name AS category_name,
    u.full_name AS instructor_name,
    u.avatar_url,
    COALESCE(count(e.enrollment_id), (0)::bigint) AS enroll_count
   FROM (((public.courses c
     LEFT JOIN public.user_enrollments e ON ((e.course_id = c.course_id)))
     JOIN public.users u ON ((c.instructor_id = u.user_id)))
     JOIN public.categories cat ON ((c.category_id = cat.category_id)))
  WHERE ((c.created_at IS NOT NULL) AND (c.status <> 'hidden'::public.course_status))
  GROUP BY c.course_id, c.title, c.image_url, c.rating_avg, c.sale_price, cat.name, u.full_name, u.avatar_url, c.created_at
  ORDER BY c.created_at DESC
 LIMIT 10;


grant delete on table "public"."session" to "anon";

grant insert on table "public"."session" to "anon";

grant references on table "public"."session" to "anon";

grant select on table "public"."session" to "anon";

grant trigger on table "public"."session" to "anon";

grant truncate on table "public"."session" to "anon";

grant update on table "public"."session" to "anon";

grant delete on table "public"."session" to "authenticated";

grant insert on table "public"."session" to "authenticated";

grant references on table "public"."session" to "authenticated";

grant select on table "public"."session" to "authenticated";

grant trigger on table "public"."session" to "authenticated";

grant truncate on table "public"."session" to "authenticated";

grant update on table "public"."session" to "authenticated";

grant delete on table "public"."session" to "service_role";

grant insert on table "public"."session" to "service_role";

grant references on table "public"."session" to "service_role";

grant select on table "public"."session" to "service_role";

grant trigger on table "public"."session" to "service_role";

grant truncate on table "public"."session" to "service_role";

grant update on table "public"."session" to "service_role";

CREATE TRIGGER trg_update_enrollment_count AFTER INSERT ON public.user_enrollments FOR EACH ROW EXECUTE FUNCTION public.trg_user_enrollments_insert();


