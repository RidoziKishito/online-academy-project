drop view if exists "public"."top_week_courses";

drop view if exists "public"."vw_course_reviews";

drop view if exists "public"."vw_most_view_courses";

drop view if exists "public"."vw_newest_courses";

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


create or replace view "public"."vw_course_reviews" as  SELECT r.review_id,
    r.rating,
    r.comment,
    r.created_at,
    u.user_id,
    u.full_name AS user_name,
    u.avatar_url AS user_avatar,
    c.course_id,
    c.title AS course_title
   FROM ((public.reviews r
     LEFT JOIN public.users u ON ((r.user_id = u.user_id)))
     LEFT JOIN public.courses c ON ((r.course_id = c.course_id)))
  ORDER BY r.created_at DESC
 LIMIT 10;


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



