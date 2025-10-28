SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict s6FE26pQ6BJMZn5lOy5lbREnArBY31VBe5ehkcGAqa4zP5fNx1tw27whG8xtiJv

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."categories" ("category_id", "name", "parent_category_id", "created_at") VALUES
	(2, 'Design', NULL, '2025-10-21 17:29:42.849622'),
	(3, 'Data Science', NULL, '2025-05-16 01:19:44.671981'),
	(4, 'Digital Marketing', NULL, '2025-08-06 21:05:35.165225'),
	(5, 'Frontend Development', 1, '2025-10-08 16:29:16.717581'),
	(6, 'Backend Development', 1, '2025-09-30 18:04:45.901589'),
	(7, 'UI Design', 2, '2025-08-12 05:30:41.283551'),
	(8, 'UX Design', 2, '2025-08-23 08:10:42.122785'),
	(9, 'Data Analysis', 3, '2025-10-17 00:51:47.818034'),
	(10, 'Machine Learning', 3, '2025-08-26 07:48:27.141447'),
	(1, 'Development', NULL, '2025-06-13 03:16:56.607039'),
	(11, 'Social Media Marketing', 4, '2025-06-06 14:16:30.162556'),
	(12, 'Content Marketing', 4, '2025-10-05 11:57:36.442644');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."users" ("user_id", "full_name", "email", "password_hash", "role", "bio", "avatar_url", "is_verified", "otp_secret", "otp_expires_at", "oauth_provider", "oauth_id", "created_at") VALUES
	(44, 'Hu Tao', 'huytranquoc9900@gmail.com', '$2b$10$.YxOjc//b/eYd7wAPjcVZuVftKwW/iWsXk6s1Y.3giFuaRuu3Oyhm', 'student', NULL, 'https://lh3.googleusercontent.com/a/ACg8ocLXJqdyN-WQK9U3FQnbEuc2BQEH0h4QVB-hlfgWLOjLyK0Dk5A=s96-c', true, NULL, NULL, 'google', '109900067285514045454', '2025-10-25 13:36:01.146405'),
	(26, 'Nguyễn Văn An', 'an.nguyen@email.com', '$2b$10$02IAXn2UlYMcyKV99F9ojOH8Dtil8LfsqmHtAHbEzJ0.yrnaFNxuy', 'student', NULL, 'https://i.pravatar.cc/150?img=1', true, NULL, NULL, NULL, NULL, '2025-10-22 18:12:03.301701'),
	(27, 'Trần Thị Bình', 'binh.tran@email.com', '$2b$10$02IAXn2UlYMcyKV99F9ojOH8Dtil8LfsqmHtAHbEzJ0.yrnaFNxuy', 'student', NULL, 'https://i.pravatar.cc/150?img=2', true, NULL, NULL, NULL, NULL, '2025-10-22 18:12:03.301701'),
	(28, 'Lê Văn Cường', 'cuong.le@email.com', '$2b$10$02IAXn2UlYMcyKV99F9ojOH8Dtil8LfsqmHtAHbEzJ0.yrnaFNxuy', 'student', NULL, 'https://i.pravatar.cc/150?img=3', true, NULL, NULL, NULL, NULL, '2025-10-22 18:12:03.301701'),
	(30, 'Hoàng Văn Em', 'em.hoang@email.com', '$2b$10$02IAXn2UlYMcyKV99F9ojOH8Dtil8LfsqmHtAHbEzJ0.yrnaFNxuy', 'instructor', 'Giảng viên thiết kế đồ họa và UI/UX', 'https://i.pravatar.cc/150?img=5', true, NULL, NULL, NULL, NULL, '2025-10-22 18:12:03.301701'),
	(31, 'Vũ Thị Phương', 'phuong.vu@email.com', '$2b$10$02IAXn2UlYMcyKV99F9ojOH8Dtil8LfsqmHtAHbEzJ0.yrnaFNxuy', 'instructor', 'Chuyên gia marketing digital 8 năm kinh nghiệm', 'https://i.pravatar.cc/150?img=6', true, NULL, NULL, NULL, NULL, '2025-10-22 18:12:03.301701'),
	(32, 'Admin Hệ Thống', 'admin@academy.com', '$2b$10$02IAXn2UlYMcyKV99F9ojOH8Dtil8LfsqmHtAHbEzJ0.yrnaFNxuy', 'admin', NULL, 'https://i.pravatar.cc/150?img=7', true, NULL, NULL, NULL, NULL, '2025-10-22 18:12:03.301701'),
	(4, 'Huu Truc', 'truc@gmail.com', '$2b$10$02IAXn2UlYMcyKV99F9ojOH8Dtil8LfsqmHtAHbEzJ0.yrnaFNxuy', 'student', NULL, 'https://scontent.fsgn5-5.fna.fbcdn.net/v/t39.30808-6/416250677_3721380631472786_7354781055851705_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=aBdLulnD0tUQ7kNvwFlINlw&_nc_oc=AdntHrVJjxWeg4zs6GHZc6v560GT2CsaPgtqMpXafzT_Qj4woKuTuImN_x7VOJcRoppOZpzJ70-8KgXbmnd1yC1b&_nc_zt=23&_nc_ht=scontent.fsgn5-5.fna&_nc_gid=DiSJ8Ku7HNOfFI2iv-EbJA&oh=00_AffNKm9c_w4RfVQCBXvEyMu0o0xtotGg_t904GI8YlX-aQ&oe=6905247E', true, NULL, NULL, NULL, NULL, '2025-10-21 18:48:33.499894'),
	(34, 'BapVitHoang', '23110020@gmail.com', '$2b$10$vo.Y114zB2bpcakRdReoTOaKhqqbQ/aiXNI5vR3cyQ81MrppNgBsC', 'admin', NULL, NULL, false, NULL, NULL, NULL, NULL, '2025-10-23 07:30:56.480774'),
	(35, 'hoang', 'hoang@gmail.com', '$2b$10$QZQtUXO9dtCm.MlPoKcmp.AKWKTr8CzcSPBrPYqaW/wb/wJ6FjpvS', 'instructor', NULL, NULL, false, NULL, NULL, NULL, NULL, '2025-10-23 12:07:14.437398'),
	(47, 'Tuấn Hoàng', 'kentuanhoang1999@gmail.com', '$2b$10$d00U/u3MzLPmkq49uCj9w./QdQ.1IusMrCVv7ScopAqcR4gmUCvra', 'student', NULL, 'https://lh3.googleusercontent.com/a/ACg8ocJYkyhR0d9Spyi6hpFOxXX-ke8TwvOfDB2O_JHavckhfTN8HA=s96-c', true, NULL, NULL, 'google', '100454339658663355725', '2025-10-26 03:21:56.443048'),
	(38, 'Cristiano Ronaldo', 'Cr7@gmail.com', '$2b$10$6OuCIa9137VTiZ8ZROykN.Nkwi0/OLNM0pJojBHgG7/32RXpYZjn.', 'student', NULL, NULL, false, NULL, NULL, NULL, NULL, '2025-10-25 03:42:34.09733'),
	(36, 'RonaldoCr7', 'Ronaldo@gmail.com', '$2b$10$Xt4GTGWMTTt9kPGmC.KhXOKObJ3rnyx52jBk61PTsHaDDOnPbeapi', 'instructor', NULL, NULL, false, NULL, NULL, NULL, NULL, '2025-10-24 13:39:25.971932'),
	(5, 'hoangductuan', 'hdt@gmail.com', '$2b$10$6BoHDQ2/TcZBzAMa4Yc9neZNsvxnqoMopxr.KEO71ejTJLhAqhH2.', 'student', NULL, NULL, false, NULL, NULL, NULL, NULL, '2025-10-22 15:30:51.465454'),
	(33, 'Võ Trúc Hồ', 'votrucho@gmail.com', '$2b$10$1QJQFdP3Id1oiStHAlfr..9sGRdcHbFP.HFzh55cxBjSym/FXiOqi', 'admin', NULL, NULL, true, NULL, NULL, NULL, NULL, '2025-10-23 07:30:18.923443'),
	(1, 'Trần Quốc Huy', '23110026@gmail.com', '$2b$10$FrMmFFxTKmDVCb6MMBnh2eABVDpzkIih/KjNhJuMdUI00HN/In/ei', 'admin', NULL, NULL, false, NULL, NULL, NULL, NULL, '2025-10-19 13:52:14.424489'),
	(42, 'Trac Van Ngoc Phuc', '23110057@student.hcmute.edu.vn', '$2b$10$yC4JZk28rBdopcA4EaFDdu4JDs.EzmXeVoP/XUadSmVa0VSea5w/O', 'student', NULL, 'https://lh3.googleusercontent.com/a/ACg8ocIRWcGtzuSTK77CAd0lrUnSNleRUkK0aDMpYfrg1mjz4qD5hg1W=s96-c', true, NULL, NULL, 'google', '100679728662633426433', '2025-10-25 12:38:10.009134'),
	(43, 'Hu Tao', 'huytranquoc24@gmail.com', '$2b$10$wrsB/bV6fk/akJETAsSpB.n.ashwJc3BBHxMmrNCvR6cJWSPSS8si', 'admin', NULL, 'https://lh3.googleusercontent.com/a/ACg8ocKqmOib0mJsjv3eWisz54iXxFuWA1DvoXxJuD5WiuQ7LTA5OX4n=s96-c', true, NULL, NULL, 'google', '100440526355102749348', '2025-10-25 13:25:50.110078'),
	(45, 'Tuấn Hoàng', 'hoangductuan269@gmail.com', '$2b$10$aRorEP5XO/ut1T2rLZx7Ce9bYjNy/l3DvTPVcHo3Kig2MaFJG3SUS', 'student', NULL, 'https://lh3.googleusercontent.com/a/ACg8ocLNoVQD0t4dYTwVSe0hguNvgPAtac01Zl8EDLPRmshy878Rvg=s96-c', true, NULL, NULL, 'google', '117280251611306607479', '2025-10-25 14:36:20.591475'),
	(46, 'Trực Lê Hữu', 'lehuutruc281220056@gmail.com', '$2b$10$qqG0l6.Kd1kJyWZrA2GlIeRbvAylIXQKWs1uQiqy8TO08LFDeGmcy', 'student', NULL, 'https://lh3.googleusercontent.com/a/ACg8ocJ9_8ekjFOvn5vJv6yguUHXeRnr9ZZDqbKqY0BU6olLNlJORA=s96-c', true, NULL, NULL, 'google', '114454093411564960763', '2025-10-25 15:29:21.152512'),
	(3, 'Phúc Trác', 'tracphuc2005@gmail.com', '$2b$10$1EqGA/fLDsgoYVY5OOhrUue0/vAjHoZrML/zTvITrVigIW7LcKWe6', 'student', NULL, 'https://lh3.googleusercontent.com/a/ACg8ocLZZJJIkjDaFxmnl3guZue2cTarl19k9aS80aQKdlyJAY6YPrZe1w=s96-c', true, NULL, NULL, 'google', '114741286843200392763', '2025-10-21 10:47:14.607333'),
	(29, 'Phạm Thị Dung', 'dung.pham@email.com', '$2b$10$93wQCs2ZXk9OfVNTcMjelOPlYrqKZGvAeJ8C8OKEu4oiw/c4uwlb2', 'instructor', 'Chuyên gia lập trình web với 10 năm kinh nghiệm', 'https://i.pravatar.cc/150?img=4', true, NULL, NULL, NULL, NULL, '2025-10-22 18:12:03.301701'),
	(48, 'steve vo', '23110021@student.hcmute.edu.vn', '$2b$10$2IMy5BVT4b5CnB2jIOBnEeflELFv4NTSvxdfICs2UfuSOIOez5n2.', 'student', NULL, NULL, true, NULL, NULL, NULL, NULL, '2025-10-26 10:59:34.980191'),
	(49, 'Hữu Trực', 'lehuutruc2005@gmail.com', '$2b$10$Lg6y5cOTOf3aXPsq4kqHA.uS/3nSr5wFDxV/5SAZMmu5zTnJlZugG', 'student', NULL, 'https://lh3.googleusercontent.com/a/ACg8ocIvJiKY6Mo3KI0Bz96s5xU6nP0d2cebB-XC2GH_hd_iMQ1MOg2u=s96-c', true, 'BDXI98SS', '2025-10-27 00:03:59.448', 'google', '109843390115817550064', '2025-10-26 16:48:58.326782'),
	(51, 'Le Tran Minh', 'lehuutrucggdrive2@gmail.com', '$2b$10$EF8/rk9r0L00qku5EmOldu.DfrsZKyvSjRf3NJAdDtlo04AkXqv0u', 'student', NULL, NULL, true, NULL, NULL, NULL, NULL, '2025-10-27 18:27:58.633884'),
	(50, 'tvnpitow', 'phuctrac2005@gmail.com', '$2b$10$FyHXE.EbJkmms1NdlqYy9.XGo7wg2P6239W/ER9hg.RIDcJ0MepsW', 'student', NULL, NULL, true, NULL, NULL, NULL, NULL, '2025-10-27 11:37:05.350873');


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."courses" ("course_id", "title", "short_description", "full_description", "image_url", "large_image_url", "price", "sale_price", "instructor_id", "category_id", "is_bestseller", "is_complete", "view_count", "enrollment_count", "rating_avg", "rating_count", "created_at", "updated_at", "fts_document", "requirements", "status") VALUES
	(8, 'UX Strategy & Process', 'Master the UX design process from strategy to execution. Learn information architecture, wireframing, prototyping, and stakeholder management.', 'UX Strategy & Process is a comprehensive course that teaches you the end-to-end process of creating exceptional user experiences. Beginning with UX fundamentals like user-centered design and design thinking, you''ll learn the philosophy and frameworks that guide professional UX work. The course covers information architecture in depth, teaching you how to organize content and design navigation systems that users can intuitively understand. You''ll master wireframing and prototyping at various fidelity levels, learning when to use each approach and how to iterate effectively based on feedback. The final section focuses on UX leadership skills including stakeholder management, design advocacy, cross-functional collaboration, and measuring UX success through metrics. This course prepares you not just to design great experiences, but to lead UX initiatives and demonstrate their value to organizations.', 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&h=600&fit=crop', 1300000.00, 899000.00, 29, 8, false, true, 510, 167, 4.6, 54, '2025-07-15 07:17:36.893244', NULL, '''and'':18B ''architecture'':15B ''design'':7B ''execution'':12B ''from'':9B ''information'':14B ''learn'':13B ''management'':20B ''master'':4B ''process'':3A,8B ''prototyping'':17B ''stakeholder'':19B ''strategy'':2A,10B ''the'':5B ''to'':11B ''ux'':1A,6B ''wireframing'':16B', '
<ul>
  <li>Đã học qua JavaScript cơ bản</li>
  <li>Biết cách sử dụng Terminal hoặc CMD</li>
  <li>Có kiến thức về REST API là lợi thế</li>
</ul>
', 'approved'),
	(9, 'Excel for Data Analysis', 'Transform raw data into actionable insights using Excel. Master pivot tables, advanced formulas, Power Query, and create dynamic dashboards.', 'Excel for Data Analysis is a comprehensive course that transforms you from a basic Excel user into a data analysis expert. Starting with Excel fundamentals, you''ll learn proper data entry, formatting, and basic formulas before advancing to powerful analysis tools. The course extensively covers pivot tables, the cornerstone of Excel analysis, teaching you how to summarize, analyze, and present data dynamically. You''ll master advanced functions like VLOOKUP, XLOOKUP, INDEX-MATCH, and array formulas that enable complex data manipulation. The final section introduces modern Excel tools including Power Query for data transformation, Power Pivot for data modeling, VBA for automation, and dashboard creation for presenting insights visually. Whether you''re analyzing sales data, financial reports, or operational metrics, this course gives you the Excel skills to turn data into business intelligence.', 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=800&h=600&fit=crop', 1300000.00, 899000.00, 29, 9, false, true, 510, 167, 4.6, 54, '2025-05-07 00:19:58.80893', NULL, '''actionable'':9B ''advanced'':16B ''analysis'':4A ''and'':20B ''create'':21B ''dashboards'':23B ''data'':3A,7B ''dynamic'':22B ''excel'':1A,12B ''for'':2A ''formulas'':17B ''insights'':10B ''into'':8B ''master'':13B ''pivot'':14B ''power'':18B ''query'':19B ''raw'':6B ''tables'':15B ''transform'':5B ''using'':11B', NULL, 'approved'),
	(11, 'Python for Machine Learning', 'Build intelligent systems with machine learning algorithms. Learn supervised learning, model evaluation, and deploy ML models using Python and scikit-learn.', 'Python for Machine Learning is your gateway into artificial intelligence and predictive modeling. This course provides a comprehensive introduction to machine learning using Python''s powerful ecosystem. You''ll start with ML fundamentals, learning essential libraries like NumPy and Pandas for data manipulation, along with data preprocessing techniques and train-test splitting. The course extensively covers supervised learning algorithms including linear regression for continuous predictions and classification algorithms for categorical outcomes, with thorough coverage of model evaluation metrics and cross-validation techniques. You''ll then advance to more sophisticated algorithms like decision trees, random forests, support vector machines, and introduction to neural networks. The final section focuses on practical ML engineering: feature engineering to improve model performance, hyperparameter tuning for optimization, model deployment strategies, and working on real-world projects. This course prepares you to build, evaluate, and deploy machine learning solutions.', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=600&fit=crop', 1300000.00, 899000.00, 29, 10, false, true, 510, 167, 4.6, 54, '2025-10-01 22:40:52.018614', NULL, '''algorithms'':11B ''and'':17B,23B ''build'':5B ''deploy'':18B ''evaluation'':16B ''for'':2A ''intelligent'':6B ''learn'':12B,26B ''learning'':4A,10B,14B ''machine'':3A,9B ''ml'':19B ''model'':15B ''models'':20B ''python'':1A,22B ''scikit'':25B ''scikit-learn'':24B ''supervised'':13B ''systems'':7B ''using'':21B ''with'':8B', NULL, 'approved'),
	(12, 'Deep Learning Basics', 'Dive into neural networks and deep learning with TensorFlow and Keras. Build CNNs for image recognition and explore cutting-edge AI applications.', 'Deep Learning Basics introduces you to the revolutionary field of deep learning and neural networks. This course demystifies how modern AI systems work, starting with neural network fundamentals including perceptrons, activation functions, backpropagation, and gradient descent optimization. You''ll learn to implement neural networks using TensorFlow and Keras, the industry-standard frameworks, mastering how to build, train, validate, and save models. The course provides in-depth coverage of Convolutional Neural Networks (CNNs), the architecture powering computer vision applications, teaching you image classification, transfer learning techniques, and object detection. The advanced section explores Recurrent Neural Networks for sequential data, natural language processing applications, generative models, and strategies for deploying deep learning models to production. Through hands-on projects, you''ll build image classifiers, text processors, and other AI applications, gaining practical experience with the technology transforming industries worldwide.', 'https://images.unsplash.com/photo-1581091870627-3b6b97c3d3f1?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1581091870627-3b6b97c3d3f1?w=800&h=600&fit=crop', 1300000.00, 899000.00, 29, 10, false, true, 510, 167, 4.6, 54, '2025-09-09 19:27:56.993512', NULL, '''ai'':25B ''and'':8B,13B,20B ''applications'':26B ''basics'':3A ''build'':15B ''cnns'':16B ''cutting'':23B ''cutting-edge'':22B ''deep'':1A,9B ''dive'':4B ''edge'':24B ''explore'':21B ''for'':17B ''image'':18B ''into'':5B ''keras'':14B ''learning'':2A,10B ''networks'':7B ''neural'':6B ''recognition'':19B ''tensorflow'':12B ''with'':11B', NULL, 'approved'),
	(13, 'Instagram Marketing', 'Grow your brand on Instagram with proven strategies. Master content creation, Stories, Reels, advertising, and analytics to reach your target audience.', 'Instagram Marketing is a complete guide to building a successful presence on one of the world''s most influential social media platforms. This course teaches you everything from setting up and optimizing a business account to understanding Instagram''s algorithm and various content types. You''ll develop a comprehensive content strategy, learning visual branding principles, caption writing, hashtag research, and optimal posting schedules to maximize engagement. The course extensively covers Instagram''s features including Stories with Highlights for evergreen content, Reels for viral reach, IGTV for long-form video, and Live streaming for real-time engagement. You''ll learn proven growth tactics, Instagram advertising strategies, how to interpret analytics and insights, and influencer marketing collaboration techniques. Whether you''re a business owner, marketer, or aspiring influencer, this course provides the strategies and tactics to build an engaged Instagram community and achieve your marketing goals.', 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&h=600&fit=crop', 1300000.00, 899000.00, 29, 11, false, true, 510, 167, 4.6, 54, '2025-07-25 18:57:42.864571', NULL, '''advertising'':16B ''analytics'':18B ''and'':17B ''audience'':23B ''brand'':5B ''content'':12B ''creation'':13B ''grow'':3B ''instagram'':1A,7B ''marketing'':2A ''master'':11B ''on'':6B ''proven'':9B ''reach'':20B ''reels'':15B ''stories'':14B ''strategies'':10B ''target'':22B ''to'':19B ''with'':8B ''your'':4B,21B', NULL, 'approved'),
	(14, 'Facebook Advertising', 'Master Facebook''s powerful advertising platform. Create high-converting campaigns, target precise audiences, and optimize for maximum ROI.', 'Facebook Advertising provides comprehensive training on one of the most powerful and sophisticated advertising platforms available. This course takes you from Facebook Ads basics through advanced campaign optimization strategies. You''ll start by learning Ads Manager setup, campaign structure, various ad objectives, and Facebook''s robust audience targeting capabilities including demographic, interest, and behavioral targeting. The course teaches you how to create compelling ads across different formats, apply creative best practices, write persuasive copy, and design effective call-to-actions. You''ll master optimization techniques including bidding strategies, budget management, A/B testing methodologies, and conversion tracking using Facebook Pixel. Advanced sections cover retargeting strategies to re-engage website visitors, creating lookalike audiences to find new customers similar to your best ones, and scaling successful campaigns profitably. Whether you''re advertising for e-commerce, lead generation, or brand awareness, this course gives you the skills to run profitable Facebook advertising campaigns.', 'https://images.unsplash.com/photo-1551817958-20204d6ab7eb?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1551817958-20204d6ab7eb?w=800&h=600&fit=crop', 1300000.00, 899000.00, 29, 11, false, true, 510, 167, 4.6, 54, '2025-06-12 04:19:47.52389', NULL, '''advertising'':2A,7B ''and'':17B ''audiences'':16B ''campaigns'':13B ''converting'':12B ''create'':9B ''facebook'':1A,4B ''for'':19B ''high'':11B ''high-converting'':10B ''master'':3B ''maximum'':20B ''optimize'':18B ''platform'':8B ''powerful'':6B ''precise'':15B ''roi'':21B ''s'':5B ''target'':14B', NULL, 'approved'),
	(16, 'Content Writing & Strategy', 'Create compelling content that engages audiences and drives results. Master writing techniques, content planning, and distribution strategies.', 'Content Writing & Strategy teaches you how to create, plan, and distribute content that resonates with audiences and achieves business objectives. This course covers writing fundamentals specifically for digital media, including how to write for web readers, develop a consistent tone and voice, craft attention-grabbing headlines, and edit effectively. You''ll learn comprehensive content strategy, including content planning frameworks, creating editorial calendars, understanding different content types, and conducting audience research to understand what your readers want. The course explores various content formats including blog posts, case studies, whitepapers, and email newsletters, teaching you the unique requirements and best practices for each. The final section focuses on content marketing execution: choosing the right distribution channels, promoting content effectively across platforms, measuring content success with analytics, and repurposing content to maximize its value. Whether you''re a marketer, business owner, or aspiring content creator, this course gives you the skills to build a successful content marketing program.', 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&h=600&fit=crop', 1300000.00, 899000.00, 29, 12, false, true, 510, 167, 2.0, 54, '2025-06-06 21:23:44.912438', NULL, '''and'':10B,18B ''audiences'':9B ''compelling'':5B ''content'':1A,6B,16B ''create'':4B ''distribution'':19B ''drives'':11B ''engages'':8B ''master'':13B ''planning'':17B ''results'':12B ''strategies'':20B ''strategy'':3A ''techniques'':15B ''that'':7B ''writing'':2A,14B', NULL, 'approved'),
	(15, 'SEO Fundamentals', 'Rank higher on Google and drive organic traffic. Learn on-page, technical, and off-page SEO strategies to dominate search engine results.', 'SEO Fundamentals is your complete guide to search engine optimization and organic traffic generation. This course demystifies how search engines work and teaches you proven strategies to rank higher in search results. Starting with SEO basics, you''ll learn the difference between SEO and SEM, master keyword research techniques, and explore essential SEO tools. The course extensively covers on-page SEO, teaching you how to optimize title tags, meta descriptions, header tags, content, and internal linking structure for maximum search visibility. You''ll dive into technical SEO, learning how to optimize site speed, implement mobile-first design, improve site architecture, and use schema markup for rich snippets. The off-page SEO section covers link building strategies, local SEO for businesses with physical locations, analytics and tracking setup, and conducting comprehensive SEO audits. This course provides the knowledge to increase organic traffic, improve search rankings, and build sustainable online visibility for any website.', 'https://images.unsplash.com/photo-1508830524289-0adcbe822b40?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1508830524289-0adcbe822b40?w=800&h=600&fit=crop', 1300000.00, 899000.00, 29, 12, false, true, 510, 167, 0.0, 0, '2025-09-24 12:53:24.462809', NULL, '''and'':7B,16B ''dominate'':23B ''drive'':8B ''engine'':25B ''fundamentals'':2A ''google'':6B ''higher'':4B ''learn'':11B ''off'':18B ''off-page'':17B ''on'':5B,13B ''on-page'':12B ''organic'':9B ''page'':14B,19B ''rank'':3B ''results'':26B ''search'':24B ''seo'':1A,20B ''strategies'':21B ''technical'':15B ''to'':22B ''traffic'':10B', NULL, 'approved'),
	(10, 'SQL for Data Analysis', 'Query and analyze large datasets with SQL. Learn database fundamentals, complex joins, aggregations, and optimization techniques for data-driven insights.', 'SQL for Data Analysis teaches you the essential language of data: Structured Query Language. This course is designed for analysts, data scientists, and anyone who needs to extract insights from databases. Starting with database fundamentals and basic SELECT statements, you''ll progressively learn more complex queries involving filtering, sorting, and joining multiple tables. The course covers data manipulation operations (INSERT, UPDATE, DELETE) and powerful aggregation techniques using GROUP BY and HAVING clauses. You''ll master advanced SQL concepts including subqueries, window functions for complex analytics, Common Table Expressions (CTEs) for readable queries, and CASE statements for conditional logic. The final section covers database design, indexing for performance, creating views, and query optimization techniques. By the end, you''ll be able to efficiently extract, transform, and analyze data from any SQL database.', 'https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?w=800&h=600&fit=crop', 1300000.00, 899000.00, 29, 9, false, true, 510, 167, 4.6, 54, '2025-06-13 13:25:27.320633', NULL, '''aggregations'':17B ''analysis'':4A ''analyze'':7B ''and'':6B,18B ''complex'':15B ''data'':3A,23B ''data-driven'':22B ''database'':13B ''datasets'':9B ''driven'':24B ''for'':2A,21B ''fundamentals'':14B ''insights'':25B ''joins'':16B ''large'':8B ''learn'':12B ''optimization'':19B ''query'':5B ''sql'':1A,11B ''techniques'':20B ''with'':10B', NULL, 'approved'),
	(1, 'HTML Fundamentals', 'Master the foundation of web development by learning HTML from basics to advanced concepts, including semantic markup and modern HTML5 features.', '<p>HTML Fundamentals is a comprehensive course designed for beginners who want to start their web development journey. This course covers everything from the basic structure of HTML documents to advanced HTML5 APIs and best practices. You''ll learn how to create well-structured, semantic web pages that are accessible and SEO-friendly. Through hands-on exercises, you''ll master HTML elements, attributes, forms, and multimedia integration. By the end of this course, you''ll have the skills to build professional-grade HTML documents and understand how HTML serves as the backbone of every website on the internet.</p>', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop', 1200000.00, 799000.00, 30, 5, true, true, 980, 325, 4.9, 98, '2025-05-06 17:32:55.265736', '2025-10-26 18:09:50.85', '''advanced'':15B ''and'':20B ''basics'':13B ''by'':9B ''concepts'':16B ''development'':8B ''features'':23B ''foundation'':5B ''from'':12B ''fundamentals'':2A ''html'':1A,11B ''html5'':22B ''including'':17B ''learning'':10B ''markup'':19B ''master'':3B ''modern'':21B ''of'':6B ''semantic'':18B ''the'':4B ''to'':14B ''web'':7B', '
<ul>
  <li>Biết thao tác cơ bản trên máy tính</li>
  <li>Quan tâm đến thiết kế giao diện người dùng</li>
  <li>Không yêu cầu kinh nghiệm lập trình</li>
</ul>
', 'approved'),
	(2, 'CSS Styling & Layout', 'Transform plain HTML into beautiful, responsive websites with CSS. Learn modern layout techniques including Flexbox, Grid, animations, and responsive design principles.', 'CSS Styling & Layout takes you on a journey from CSS basics to advanced styling techniques used by professional web developers. This course teaches you how to style web pages, create sophisticated layouts, and build responsive designs that work seamlessly across all devices. You''ll master essential concepts like the box model, selectors, and specificity, then advance to modern layout systems including Flexbox and CSS Grid. The course also covers animations, transitions, CSS variables, and performance optimization. Whether you''re designing a simple landing page or a complex web application, this course provides the CSS skills you need to bring your designs to life with clean, maintainable code.', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop', 1800000.00, 1299000.00, 31, 5, true, true, 1580, 612, 4.7, 201, '2025-05-23 10:11:18.869363', NULL, '''and'':21B ''animations'':20B ''beautiful'':8B ''css'':1A,12B ''design'':23B ''flexbox'':18B ''grid'':19B ''html'':6B ''including'':17B ''into'':7B ''layout'':3A,15B ''learn'':13B ''modern'':14B ''plain'':5B ''principles'':24B ''responsive'':9B,22B ''styling'':2A ''techniques'':16B ''transform'':4B ''websites'':10B ''with'':11B', '
<ul>
  <li>Có kiến thức cơ bản về Internet và mạng xã hội</li>
  <li>Quan tâm đến quảng cáo online, SEO, content</li>
  <li>Không cần nền tảng kỹ thuật</li>
</ul>
', 'approved'),
	(17, 'Digital Marketing 2025: From Beginner to Pro', 'Master the complete Digital Marketing strategy — from SEO and content creation to paid ads and brand building. Perfect for beginners, freelancers, and small business owners.', '<p>The <strong>Digital Marketing 2025</strong> course is designed to give you a comprehensive understanding of online marketing in the age of AI and automation.</p><p>By the end of this course, you’ll be able to:</p><ol><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>Build a complete digital marketing strategy.</li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>Run and optimize Facebook, Google, and TikTok Ads.</li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>Write engaging, SEO-friendly content.</li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>Analyze marketing data using Google Analytics and Meta Business Suite.</li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>Create automated sales funnels to boost conversions and reduce costs.</li></ol><p>You’ll gain practical, hands-on experience and the confidence to launch real-world marketing campaigns for your own brand or clients.</p>', 'https://picsum.photos/seed/marketing450/450/300', 'https://picsum.photos/seed/marketingcover450/450/300', 390000.00, 279000.00, 29, 4, false, false, 0, 0, 0.0, 0, '2025-10-27 23:52:10.728265', '2025-10-27 23:52:10.728265', '''2025'':3A ''ads'':21B ''and'':16B,22B,29B ''beginner'':5A ''beginners'':27B ''brand'':23B ''building'':24B ''business'':31B ''complete'':10B ''content'':17B ''creation'':18B ''digital'':1A,11B ''for'':26B ''freelancers'':28B ''from'':4A,14B ''marketing'':2A,12B ''master'':8B ''owners'':32B ''paid'':20B ''perfect'':25B ''pro'':7A ''seo'':15B ''small'':30B ''strategy'':13B ''the'':9B ''to'':6A,19B', '<ol><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>A computer or smartphone with internet access.</li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>Basic understanding of social media platforms.</li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>No prior marketing experience required.</li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>Having a product or service to apply your learning is recommended.</li></ol><p><br></p>', 'pending'),
	(18, 'test', 'test', '<p><strong>test</strong></p>', 'https://plus.unsplash.com/premium_photo-1757423357777-eedac57abcbb?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwxfHx8ZW58MHx8fHx8&auto=format&fit=crop&q=60&w=600', 'https://plus.unsplash.com/premium_photo-1757423357777-eedac57abcbb?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwxfHx8ZW58MHx8fHx8&auto=format&fit=crop&q=60&w=600', 120000.00, 99000.00, 29, 2, false, false, 0, 0, 0.0, 0, '2025-10-28 00:07:42.956505', '2025-10-28 00:07:42.956505', '''test'':1A,2B', '<p>no requirement</p>', 'pending'),
	(3, 'Node.js & Express', 'Build powerful server-side applications with Node.js and Express. Learn to create RESTful APIs, handle databases, and deploy full-stack JavaScript applications.', 'Node.js & Express is a comprehensive backend development course that teaches you how to build scalable server-side applications using JavaScript. Starting with Node.js fundamentals, you''ll learn about the event-driven architecture, asynchronous programming, and the npm ecosystem. The course then dives deep into Express.js, the most popular Node.js web framework, where you''ll master routing, middleware, and API development. You''ll learn how to integrate databases (both SQL and NoSQL), implement authentication and authorization, handle errors effectively, and write tests for your applications. By the end of this course, you''ll be equipped to build and deploy production-ready backend applications, RESTful APIs, and full-stack web applications using the JavaScript ecosystem.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop', 1600000.00, 1299000.00, 29, 6, false, true, 650, 189, 4.6, 67, '2025-09-04 21:27:38.131372', NULL, '''and'':11B,20B ''apis'':17B ''applications'':8B,26B ''build'':3B ''create'':15B ''databases'':19B ''deploy'':21B ''express'':2A,12B ''full'':23B ''full-stack'':22B ''handle'':18B ''javascript'':25B ''learn'':13B ''node.js'':1A,10B ''powerful'':4B ''restful'':16B ''server'':6B ''server-side'':5B ''side'':7B ''stack'':24B ''to'':14B ''with'':9B', '
<ul>
  <li>Đã học qua JavaScript hoặc ReactJS cơ bản</li>
  <li>Có điện thoại Android/iOS để test app</li>
  <li>Biết sử dụng VS Code hoặc Android Studio</li>
</ul>
', 'approved'),
	(4, 'Python for Web Development', 'Create robust web applications using Python''s powerful frameworks Django and Flask. Learn full-stack development with one of the world''s most popular programming languages.', 'Python for Web Development introduces you to building modern web applications using Python, one of the most versatile and beginner-friendly programming languages. This course covers Python fundamentals before diving into two major web frameworks: Django and Flask. With Django, you''ll learn to build full-featured web applications quickly using its "batteries-included" approach, including built-in admin interfaces, ORM, and authentication systems. With Flask, you''ll explore the flexibility of a microframework perfect for smaller applications and APIs. Throughout the course, you''ll work with databases, create RESTful APIs, implement authentication systems, and learn deployment strategies. By completion, you''ll be able to choose the right framework for your project and build secure, scalable web applications from scratch.', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop', 1500000.00, 999000.00, 29, 6, true, true, 1250, 458, 4.8, 142, '2025-07-11 13:56:05.7514', NULL, '''and'':15B ''applications'':8B ''create'':5B ''development'':4A,21B ''django'':14B ''flask'':16B ''for'':2A ''frameworks'':13B ''full'':19B ''full-stack'':18B ''languages'':31B ''learn'':17B ''most'':28B ''of'':24B ''one'':23B ''popular'':29B ''powerful'':12B ''programming'':30B ''python'':1A,10B ''robust'':6B ''s'':11B,27B ''stack'':20B ''the'':25B ''using'':9B ''web'':3A,7B ''with'':22B ''world'':26B', '
<ul>
  <li>Kiến thức cơ bản về HTML, CSS, JavaScript</li>
  <li>Đã từng sử dụng VS Code hoặc IDE tương tự</li>
  <li>Có mong muốn học fullstack web thực tế</li>
</ul>
', 'approved'),
	(5, 'Figma for Designers', 'Master Figma, the industry-leading design tool. Learn to create stunning UI designs, interactive prototypes, and collaborate effectively with design teams.', 'Figma for Designers is a complete guide to mastering the most popular collaborative design tool in the industry. This course takes you from Figma basics to advanced features used by professional designers at top companies. You''ll learn the interface, frame creation, design tools, and typography before moving to powerful features like components, variants, and auto layout. The course extensively covers prototyping, teaching you how to create interactive, animated prototypes that bring your designs to life. You''ll also master team collaboration features, design systems, and developer handoff processes. Whether you''re designing mobile apps, websites, or complex design systems, this course will make you proficient in Figma and ready to work in professional design teams.', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop', 1400000.00, 999000.00, 29, 7, false, true, 420, 145, 4.5, 45, '2025-06-29 16:29:59.667138', NULL, '''and'':20B ''collaborate'':21B ''create'':14B ''design'':10B,24B ''designers'':3A ''designs'':17B ''effectively'':22B ''figma'':1A,5B ''for'':2A ''industry'':8B ''industry-leading'':7B ''interactive'':18B ''leading'':9B ''learn'':12B ''master'':4B ''prototypes'':19B ''stunning'':15B ''teams'':25B ''the'':6B ''to'':13B ''tool'':11B ''ui'':16B ''with'':23B', '
<ul>
  <li>Biết lập trình cơ bản bằng Python</li>
  <li>Kiến thức cơ bản về Toán hoặc Thống kê</li>
  <li>Đã cài Python hoặc Google Colab</li>
</ul>
', 'approved'),
	(6, 'UI Design Principles', 'Learn fundamental UI design principles including color theory, typography, layout, and design systems. Create beautiful, functional interfaces that users love.', 'UI Design Principles provides a comprehensive foundation in user interface design theory and practice. This course teaches you the fundamental principles that make interfaces beautiful, functional, and user-friendly. Starting with design fundamentals like color theory, typography, layout, and visual hierarchy, you''ll learn how to make informed design decisions. The course covers essential UI patterns for navigation, forms, cards, and call-to-actions, ensuring your designs follow industry best practices. You''ll master responsive design techniques and learn how to design for multiple screen sizes and touch interfaces. Finally, you''ll explore design systems, learning how to create, document, and maintain consistent design languages across products. This course transforms you from someone who can use design tools into a designer who understands why design decisions matter.', 'https://images.unsplash.com/photo-1487014679447-9f8336841d58?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1487014679447-9f8336841d58?w=800&h=600&fit=crop', 1000000.00, 699000.00, 30, 7, false, false, 380, 98, 4.7, 32, '2025-09-23 09:58:07.111499', NULL, '''and'':14B ''beautiful'':18B ''color'':10B ''create'':17B ''design'':2A,7B,15B ''functional'':19B ''fundamental'':5B ''including'':9B ''interfaces'':20B ''layout'':13B ''learn'':4B ''love'':23B ''principles'':3A,8B ''systems'':16B ''that'':21B ''theory'':11B ''typography'':12B ''ui'':1A,6B ''users'':22B', '
<ul>
  <li>Biết sử dụng máy tính cơ bản</li>
  <li>Yêu thích sáng tạo và mỹ thuật</li>
  <li>Không cần kinh nghiệm với Photoshop hoặc AI</li>
</ul>
', 'approved'),
	(7, 'UX Research Methods', 'Discover user needs through proven research methods. Learn to conduct interviews, usability tests, and translate insights into actionable design decisions.', 'UX Research Methods equips you with the scientific approach to understanding users and making data-driven design decisions. This course covers the complete spectrum of UX research methodologies, from planning research projects to delivering actionable insights. You''ll learn qualitative methods like user interviews and ethnographic studies, mastering how to prepare questions, conduct sessions, and analyze responses to create detailed user personas. The course extensively covers usability testing, both moderated and unmoderated, teaching you how to design effective tests, observe user behavior, and identify usability issues. You''ll also explore quantitative methods including A/B testing, analytics interpretation, and journey mapping. By the end of this course, you''ll be able to advocate for users with concrete research evidence and guide design decisions with confidence.', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop', 1100000.00, 899000.00, 31, 8, false, true, 720, 234, 4.8, 78, '2025-07-19 20:32:41.367501', NULL, '''actionable'':21B ''and'':17B ''conduct'':13B ''decisions'':23B ''design'':22B ''discover'':4B ''insights'':19B ''interviews'':14B ''into'':20B ''learn'':11B ''methods'':3A,10B ''needs'':6B ''proven'':8B ''research'':2A,9B ''tests'':16B ''through'':7B ''to'':12B ''translate'':18B ''usability'':15B ''user'':5B ''ux'':1A', '
<ul>
  <li>Có tài khoản Facebook hoặc Instagram</li>
  <li>Quan tâm đến xây dựng thương hiệu cá nhân</li>
  <li>Không cần kiến thức marketing chuyên sâu</li>
</ul>
', 'approved');


--
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."chapters" ("chapter_id", "course_id", "title", "order_index", "created_at") VALUES
	(1, 1, 'Introduction to HTML', 1, NULL),
	(2, 1, 'HTML Elements & Structure', 2, NULL),
	(3, 1, 'Forms & Input', 3, NULL),
	(4, 1, 'Advanced HTML', 4, NULL),
	(5, 2, 'CSS Basics', 1, NULL),
	(6, 2, 'Layout Techniques', 2, NULL),
	(7, 2, 'Advanced CSS', 3, NULL),
	(8, 2, 'Modern CSS', 4, NULL),
	(9, 3, 'Node.js Fundamentals', 1, NULL),
	(10, 3, 'Express Framework', 2, NULL),
	(11, 3, 'Database Integration', 3, NULL),
	(12, 3, 'Advanced Backend', 4, NULL),
	(13, 4, 'Python Basics', 1, NULL),
	(14, 4, 'Django Framework', 2, NULL),
	(15, 4, 'Flask Microframework', 3, NULL),
	(16, 4, 'Web APIs & Deployment', 4, NULL),
	(17, 5, 'Getting Started with Figma', 1, NULL),
	(18, 5, 'Prototyping', 2, NULL),
	(19, 5, 'Components & Variants', 3, NULL),
	(20, 5, 'Collaboration & Handoff', 4, NULL),
	(21, 6, 'Design Fundamentals', 1, NULL),
	(22, 6, 'User Interface Patterns', 2, NULL),
	(23, 6, 'Responsive Design', 3, NULL),
	(24, 6, 'Design Systems', 4, NULL),
	(25, 7, 'Introduction to UX Research', 1, NULL),
	(26, 7, 'User Interviews', 2, NULL),
	(27, 7, 'Usability Testing', 3, NULL),
	(28, 7, 'Advanced Research', 4, NULL),
	(29, 8, 'UX Fundamentals', 1, NULL),
	(30, 8, 'Information Architecture', 2, NULL),
	(31, 8, 'Wireframing & Prototyping', 3, NULL),
	(32, 8, 'UX Leadership', 4, NULL),
	(33, 9, 'Excel Basics', 1, NULL),
	(34, 9, 'Data Analysis Tools', 2, NULL),
	(35, 9, 'Advanced Functions', 3, NULL),
	(36, 9, 'Advanced Analysis', 4, NULL),
	(37, 10, 'SQL Fundamentals', 1, NULL),
	(38, 10, 'SQL Fundamentals', 2, NULL),
	(39, 10, 'Advanced SQL', 3, NULL),
	(40, 10, 'Database Design', 4, NULL),
	(41, 11, 'ML Fundamentals', 1, NULL),
	(42, 11, 'Supervised Learning', 2, NULL),
	(43, 11, 'Advanced Algorithms', 3, NULL),
	(44, 11, 'ML Projects', 4, NULL),
	(45, 12, 'Neural Networks', 1, NULL),
	(46, 12, 'TensorFlow & Keras', 2, NULL),
	(47, 12, 'Convolutional Networks', 3, NULL),
	(48, 12, 'Advanced Deep Learning', 4, NULL),
	(49, 13, 'Instagram Basics', 1, NULL),
	(50, 13, 'Content Strategy', 2, NULL),
	(51, 13, 'Instagram Features', 3, NULL),
	(52, 13, 'Growth & Analytics', 4, NULL),
	(53, 14, 'Facebook Ads Basics', 1, NULL),
	(54, 14, 'Ad Creation', 2, NULL),
	(55, 14, 'Optimization', 3, NULL),
	(56, 14, 'Advanced Strategies', 4, NULL),
	(57, 15, 'Introduction to SEO', 1, NULL),
	(58, 15, 'On-Page SEO', 2, NULL),
	(59, 15, 'Technical SEO', 3, NULL),
	(60, 15, 'Off-Page SEO', 4, NULL),
	(61, 16, 'Writing Fundamentals', 1, NULL),
	(62, 16, 'Content Strategy', 2, NULL),
	(63, 16, 'Content Formats', 3, NULL),
	(64, 16, 'Content Marketing', 4, NULL);


--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."contact_messages" ("id", "name", "email", "message", "created_at") VALUES
	(1, 'Lionel Messi', 'M10@gmail.com', 'SIUUUUUUUUU', '2025-10-20 08:21:01.511768');


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."conversations" ("id", "user1_id", "user2_id", "created_at", "updated_at") VALUES
	('4cb3a216-6092-4215-952a-184523afffa4', 33, 35, '2025-10-26 22:15:10.428023+00', '2025-10-26 22:15:23.162+00'),
	('1ecd9f52-443d-4ccd-982c-234fd55881c6', 4, 26, '2025-10-27 11:57:59.768583+00', '2025-10-27 11:58:03.536+00'),
	('3d43e262-28be-457b-a8a6-185c807e4adc', 4, 28, '2025-10-27 11:58:25.856908+00', '2025-10-27 11:58:25.856908+00'),
	('b9cc15ad-f05c-4778-b208-1479975075e2', 26, 30, '2025-10-27 13:35:07.673235+00', '2025-10-27 13:35:07.673235+00'),
	('4f58aaea-4e77-421b-affa-4c540df11da9', 30, 32, '2025-10-27 13:37:35.219533+00', '2025-10-27 13:37:35.219533+00'),
	('b2e98915-edd1-4139-9d45-a6d4412a4867', 30, 31, '2025-10-27 13:37:43.734207+00', '2025-10-27 13:37:43.734207+00'),
	('d61858e2-1ea4-4a4b-abf2-e02c94797ef5', 29, 30, '2025-10-27 13:37:43.935941+00', '2025-10-27 13:38:00.029+00'),
	('62141355-14bc-4d0e-8ab5-7f8216a03672', 26, 48, '2025-10-27 13:48:37.132165+00', '2025-10-27 13:48:37.132165+00'),
	('f61ad3f2-9371-4b1a-9c24-3fcdcf031876', 27, 48, '2025-10-27 13:48:42.741861+00', '2025-10-27 13:48:42.741861+00'),
	('cb01023c-d8e7-488a-b5d5-97ff131b63a2', 31, 48, '2025-10-27 13:48:50.389266+00', '2025-10-27 13:48:50.389266+00'),
	('3f1e506f-ac9d-4d45-a5b1-24f74366f896', 35, 48, '2025-10-27 14:02:55.629407+00', '2025-10-27 14:03:02.428+00'),
	('90c48e98-42f4-4e5a-b121-e9b39fa9ba10', 4, 29, '2025-10-27 11:58:14.228567+00', '2025-10-27 18:23:11.71+00'),
	('798cf401-e9ae-4dde-8aca-29db2ebb8bf6', 4, 30, '2025-10-27 13:36:54.819147+00', '2025-10-27 18:24:22.109+00'),
	('7ad307c0-56eb-4c0c-b7ce-6b840ee2233d', 27, 30, '2025-10-27 19:56:59.357372+00', '2025-10-27 19:56:59.357372+00'),
	('66bd047f-a7c7-48ad-9d9c-c14c9ded1358', 30, 48, '2025-10-27 13:49:05.561205+00', '2025-10-27 20:21:26.874+00'),
	('b960b5d0-1722-4388-ae90-339172cae30b', 29, 48, '2025-10-27 13:48:48.033141+00', '2025-10-27 22:35:44.817+00'),
	('7e6ac20d-3b83-4212-aff8-37b26a23f19d', 32, 48, '2025-10-27 13:48:50.871957+00', '2025-10-27 22:35:56.447+00');


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."lessons" ("lesson_id", "chapter_id", "title", "video_url", "duration_seconds", "is_previewable", "order_index", "created_at", "content") VALUES
	(21, 6, 'Flexbox Fundamentals', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 680, true, 1, NULL, NULL),
	(25, 7, 'Animations & Transitions', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 620, true, 1, NULL, NULL),
	(29, 8, 'CSS Architecture', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 720, true, 1, NULL, NULL),
	(33, 9, 'What is Node.js?', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 890, true, 1, NULL, NULL),
	(37, 10, 'Setting Up Express', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 980, true, 1, NULL, NULL),
	(41, 11, 'Connecting to Databases', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 920, true, 1, NULL, NULL),
	(45, 12, 'Authentication & Authorization', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 920, true, 1, NULL, NULL),
	(49, 13, 'Python Syntax', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1180, true, 1, NULL, NULL),
	(53, 14, 'Django Introduction', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1080, true, 1, NULL, NULL),
	(57, 15, 'Flask Basics', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 980, true, 1, NULL, NULL),
	(61, 16, 'Building RESTful APIs', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1180, true, 1, NULL, NULL),
	(69, 18, 'Creating Components', NULL, NULL, true, 1, NULL, NULL),
	(73, 19, 'Interactive Prototypes', NULL, NULL, true, 1, NULL, NULL),
	(77, 20, 'Design Systems in Figma', NULL, NULL, true, 1, NULL, NULL),
	(81, 21, 'Color Theory', NULL, NULL, true, 1, NULL, NULL),
	(85, 22, 'Navigation Patterns', NULL, NULL, true, 1, NULL, NULL),
	(89, 23, 'Mobile-First Design', NULL, NULL, true, 1, NULL, NULL),
	(93, 24, 'Building Design Systems', NULL, NULL, true, 1, NULL, NULL),
	(97, 25, 'What is UX Research?', NULL, NULL, true, 1, NULL, NULL),
	(101, 26, 'Preparing for Interviews', NULL, NULL, true, 1, NULL, NULL),
	(105, 27, 'Test Planning', NULL, NULL, true, 1, NULL, NULL),
	(109, 28, 'A/B Testing', NULL, NULL, true, 1, NULL, NULL),
	(113, 29, 'User-Centered Design', NULL, NULL, true, 1, NULL, NULL),
	(117, 30, 'Site Structure', NULL, NULL, true, 1, NULL, NULL),
	(121, 31, 'Low-Fidelity Wireframes', NULL, NULL, true, 1, NULL, NULL),
	(125, 32, 'Stakeholder Management', NULL, NULL, true, 1, NULL, NULL),
	(129, 33, 'Excel Interface', NULL, NULL, true, 1, NULL, NULL),
	(133, 34, 'Pivot Tables', NULL, NULL, true, 1, NULL, NULL),
	(137, 35, 'VLOOKUP & XLOOKUP', NULL, NULL, true, 1, NULL, NULL),
	(141, 36, 'Power Query', NULL, NULL, true, 1, NULL, NULL),
	(145, 37, 'Introduction to Databases', NULL, NULL, true, 1, NULL, NULL),
	(149, 38, 'INSERT, UPDATE, DELETE', NULL, NULL, true, 1, NULL, NULL),
	(153, 39, 'Subqueries', NULL, NULL, true, 1, NULL, NULL),
	(157, 40, 'Creating Tables', NULL, NULL, true, 1, NULL, NULL),
	(161, 41, 'Introduction to ML', NULL, NULL, true, 1, NULL, NULL),
	(165, 42, 'Linear Regression', NULL, NULL, true, 1, NULL, NULL),
	(169, 43, 'Decision Trees', NULL, NULL, true, 1, NULL, NULL),
	(173, 44, 'Feature Engineering', NULL, NULL, true, 1, NULL, NULL),
	(177, 45, 'Perceptrons', NULL, NULL, true, 1, NULL, NULL),
	(181, 46, 'Setting Up TensorFlow', NULL, NULL, true, 1, NULL, NULL),
	(185, 47, 'CNN Architecture', NULL, NULL, true, 1, NULL, NULL),
	(189, 48, 'Recurrent Networks', NULL, NULL, true, 1, NULL, NULL),
	(193, 49, 'Setting Up Business Account', NULL, NULL, true, 1, NULL, NULL),
	(182, 46, 'Building Models with Keras', NULL, NULL, NULL, 2, NULL, NULL),
	(183, 46, 'Training & Validation', NULL, NULL, NULL, 3, NULL, NULL),
	(184, 46, 'Model Saving', NULL, NULL, NULL, 4, NULL, NULL),
	(186, 47, 'Image Classification', NULL, NULL, NULL, 2, NULL, NULL),
	(187, 47, 'Transfer Learning', NULL, NULL, NULL, 3, NULL, NULL),
	(188, 47, 'Object Detection', NULL, NULL, NULL, 4, NULL, NULL),
	(190, 48, 'Natural Language Processing', NULL, NULL, NULL, 2, NULL, NULL),
	(191, 48, 'Generative Models', NULL, NULL, NULL, 3, NULL, NULL),
	(192, 48, 'Production Deployment', NULL, NULL, NULL, 4, NULL, NULL),
	(194, 49, 'Profile Optimization', NULL, NULL, NULL, 2, NULL, NULL),
	(195, 49, 'Instagram Algorithm', NULL, NULL, NULL, 3, NULL, NULL),
	(196, 49, 'Content Types', NULL, NULL, NULL, 4, NULL, NULL),
	(198, 50, 'Visual Branding', NULL, NULL, NULL, 2, NULL, NULL),
	(199, 50, 'Captions & Hashtags', NULL, NULL, NULL, 3, NULL, NULL),
	(200, 50, 'Posting Schedule', NULL, NULL, NULL, 4, NULL, NULL),
	(202, 51, 'Reels', NULL, NULL, NULL, 2, NULL, NULL),
	(203, 51, 'IGTV', NULL, NULL, NULL, 3, NULL, NULL),
	(204, 51, 'Live Streaming', NULL, NULL, NULL, 4, NULL, NULL),
	(206, 52, 'Instagram Ads', NULL, NULL, NULL, 2, NULL, NULL),
	(207, 52, 'Analytics & Insights', NULL, NULL, NULL, 3, NULL, NULL),
	(208, 52, 'Influencer Marketing', NULL, NULL, NULL, 4, NULL, NULL),
	(210, 53, 'Campaign Structure', NULL, NULL, NULL, 2, NULL, NULL),
	(211, 53, 'Ad Objectives', NULL, NULL, NULL, 3, NULL, NULL),
	(212, 53, 'Audience Targeting', NULL, NULL, NULL, 4, NULL, NULL),
	(214, 54, 'Creative Best Practices', NULL, NULL, NULL, 2, NULL, NULL),
	(215, 54, 'Copywriting', NULL, NULL, NULL, 3, NULL, NULL),
	(216, 54, 'Call-to-Actions', NULL, NULL, NULL, 4, NULL, NULL),
	(218, 55, 'Budget Management', NULL, NULL, NULL, 2, NULL, NULL),
	(219, 55, 'A/B Testing', NULL, NULL, NULL, 3, NULL, NULL),
	(220, 55, 'Conversion Tracking', NULL, NULL, NULL, 4, NULL, NULL),
	(222, 56, 'Lookalike Audiences', NULL, NULL, NULL, 2, NULL, NULL),
	(223, 56, 'Facebook Pixel', NULL, NULL, NULL, 3, NULL, NULL),
	(224, 56, 'Scaling Campaigns', NULL, NULL, NULL, 4, NULL, NULL),
	(226, 57, 'SEO vs SEM', NULL, NULL, NULL, 2, NULL, NULL),
	(227, 57, 'Keyword Research', NULL, NULL, NULL, 3, NULL, NULL),
	(228, 57, 'SEO Tools', NULL, NULL, NULL, 4, NULL, NULL),
	(230, 58, 'Header Tags', NULL, NULL, NULL, 2, NULL, NULL),
	(231, 58, 'Content Optimization', NULL, NULL, NULL, 3, NULL, NULL),
	(232, 58, 'Internal Linking', NULL, NULL, NULL, 4, NULL, NULL),
	(234, 59, 'Mobile Optimization', NULL, NULL, NULL, 2, NULL, NULL),
	(235, 59, 'Site Structure', NULL, NULL, NULL, 3, NULL, NULL),
	(236, 59, 'Schema Markup', NULL, NULL, NULL, 4, NULL, NULL),
	(238, 60, 'Local SEO', NULL, NULL, NULL, 2, NULL, NULL),
	(239, 60, 'Analytics & Tracking', NULL, NULL, NULL, 3, NULL, NULL),
	(240, 60, 'SEO Audits', NULL, NULL, NULL, 4, NULL, NULL),
	(242, 61, 'Tone & Voice', NULL, NULL, NULL, 2, NULL, NULL),
	(243, 61, 'Headline Writing', NULL, NULL, NULL, 3, NULL, NULL),
	(244, 61, 'Editing & Proofreading', NULL, NULL, NULL, 4, NULL, NULL),
	(246, 62, 'Editorial Calendar', NULL, NULL, NULL, 2, NULL, NULL),
	(247, 62, 'Content Types', NULL, NULL, NULL, 3, NULL, NULL),
	(248, 62, 'Audience Research', NULL, NULL, NULL, 4, NULL, NULL),
	(250, 63, 'Case Studies', NULL, NULL, NULL, 2, NULL, NULL),
	(251, 63, 'Whitepapers', NULL, NULL, NULL, 3, NULL, NULL),
	(252, 63, 'Email Newsletters', NULL, NULL, NULL, 4, NULL, NULL),
	(254, 64, 'Content Promotion', NULL, NULL, NULL, 2, NULL, NULL),
	(255, 64, 'Measuring Success', NULL, NULL, NULL, 3, NULL, NULL),
	(256, 64, 'Content Repurposing', NULL, NULL, NULL, 4, NULL, NULL),
	(1, 1, 'What is HTML?', 'https://www.youtube.com/embed/it1rTvBcfRg', 540, true, 1, NULL, NULL),
	(3, 1, 'Setting Up Your Environment', 'https://www.youtube.com/watch?v=mL1IcxIUd5Y', 1200, false, 3, NULL, NULL),
	(2, 1, 'HTML History & Evolution', 'https://www.youtube.com/watch?v=_lO1b_5lWHI', 780, false, 2, NULL, NULL),
	(4, 1, 'Your First HTML Page', 'https://www.youtube.com/watch?v=2O8pkybH6po', 890, false, 4, NULL, NULL),
	(6, 2, 'Attributes', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1050, false, 2, NULL, NULL),
	(7, 2, 'Document Structure', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1180, false, 3, NULL, NULL),
	(8, 2, 'Semantic HTML', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 980, false, 4, NULL, NULL),
	(10, 3, 'Input Types', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 890, false, 2, NULL, NULL),
	(11, 3, 'Form Validation', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1120, false, 3, NULL, NULL),
	(12, 3, 'Accessibility in Forms', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 780, false, 4, NULL, NULL),
	(14, 4, 'Meta Tags & SEO', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 950, false, 2, NULL, NULL),
	(15, 4, 'HTML5 APIs', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1340, false, 3, NULL, NULL),
	(16, 4, 'Best Practices', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1080, false, 4, NULL, NULL),
	(18, 5, 'Selectors & Specificity', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 840, false, 2, NULL, NULL),
	(19, 5, 'Colors & Typography', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 980, false, 3, NULL, NULL),
	(20, 5, 'The Box Model', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1020, false, 4, NULL, NULL),
	(22, 6, 'CSS Grid', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1240, false, 2, NULL, NULL),
	(23, 6, 'Positioning', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 980, false, 3, NULL, NULL),
	(24, 6, 'Responsive Design', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 890, false, 4, NULL, NULL),
	(26, 7, 'CSS Variables', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 840, true, 2, NULL, NULL),
	(27, 7, 'Pseudo-classes & Pseudo-elements', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 920, false, 3, NULL, NULL),
	(28, 7, 'CSS Preprocessors', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1050, false, 4, NULL, NULL),
	(30, 8, 'CSS-in-JS', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 680, false, 2, NULL, NULL),
	(31, 8, 'Performance Optimization', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1100, false, 3, NULL, NULL),
	(32, 8, 'Design Systems', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 980, false, 4, NULL, NULL),
	(34, 9, 'NPM & Package Management', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1020, false, 2, NULL, NULL),
	(35, 9, 'Modules & Exports', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 950, false, 3, NULL, NULL),
	(36, 9, 'Asynchronous JavaScript', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1240, false, 4, NULL, NULL),
	(38, 10, 'Routing', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1180, false, 2, NULL, NULL),
	(39, 10, 'Middleware', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 840, false, 3, NULL, NULL),
	(40, 10, 'Request & Response', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1050, false, 4, NULL, NULL),
	(42, 11, 'MongoDB & Mongoose', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1120, false, 2, NULL, NULL),
	(43, 11, 'SQL Databases', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 780, false, 3, NULL, NULL),
	(44, 11, 'ORMs', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 580, true, 4, NULL, NULL),
	(46, 12, 'RESTful APIs', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 840, false, 2, NULL, NULL),
	(47, 12, 'Error Handling', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1050, false, 3, NULL, NULL),
	(48, 12, 'Testing & Deployment', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 980, false, 4, NULL, NULL),
	(50, 13, 'Data Types & Variables', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 920, false, 2, NULL, NULL),
	(51, 13, 'Control Flow', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 720, false, 3, NULL, NULL),
	(52, 13, 'Functions & Modules', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1240, false, 4, NULL, NULL),
	(54, 14, 'Models & Databases', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 950, false, 2, NULL, NULL),
	(55, 14, 'Views & Templates', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 890, false, 3, NULL, NULL),
	(56, 14, 'Forms & Validation', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1120, false, 4, NULL, NULL),
	(5, 2, 'HTML Tags & Elements', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 920, true, 1, NULL, NULL),
	(9, 3, 'Form Basics', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 650, true, 1, NULL, NULL),
	(13, 4, 'Multimedia Elements', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 720, true, 1, NULL, NULL),
	(17, 5, 'Introduction to CSS', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1150, true, 1, NULL, NULL),
	(197, 50, 'Content Planning', NULL, NULL, true, 1, NULL, NULL),
	(58, 15, 'Routing & Views', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 840, false, 2, NULL, NULL),
	(59, 15, 'Templates with Jinja2', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 780, false, 3, NULL, NULL),
	(60, 15, 'Flask Extensions', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 1050, false, 4, NULL, NULL),
	(62, 16, 'Authentication', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 920, false, 2, NULL, NULL),
	(63, 16, 'Testing Python Applications', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 680, false, 3, NULL, NULL),
	(64, 16, 'Deployment Strategies', 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=N52BQYwaWJhRSNeW', 890, false, 4, NULL, NULL),
	(66, 17, 'Creating Frames', NULL, NULL, NULL, 2, NULL, NULL),
	(67, 17, 'Basic Shapes & Tools', NULL, NULL, NULL, 3, NULL, NULL),
	(68, 17, 'Text & Typography', NULL, NULL, NULL, 4, NULL, NULL),
	(70, 18, 'Component Variants', NULL, NULL, NULL, 2, NULL, NULL),
	(71, 18, 'Auto Layout', NULL, NULL, NULL, 3, NULL, NULL),
	(72, 18, 'Constraints', NULL, NULL, NULL, 4, NULL, NULL),
	(74, 19, 'Animations & Transitions', NULL, NULL, NULL, 2, NULL, NULL),
	(75, 19, 'User Flow', NULL, NULL, NULL, 3, NULL, NULL),
	(76, 19, 'Testing Prototypes', NULL, NULL, NULL, 4, NULL, NULL),
	(78, 20, 'Team Collaboration', NULL, NULL, NULL, 2, NULL, NULL),
	(79, 20, 'Developer Handoff', NULL, NULL, NULL, 3, NULL, NULL),
	(80, 20, 'Figma Plugins', NULL, NULL, NULL, 4, NULL, NULL),
	(82, 21, 'Typography', NULL, NULL, NULL, 2, NULL, NULL),
	(83, 21, 'Layout & Composition', NULL, NULL, NULL, 3, NULL, NULL),
	(84, 21, 'Visual Hierarchy', NULL, NULL, NULL, 4, NULL, NULL),
	(86, 22, 'Form Design', NULL, NULL, NULL, 2, NULL, NULL),
	(87, 22, 'Cards & Lists', NULL, NULL, NULL, 3, NULL, NULL),
	(88, 22, 'Buttons & CTAs', NULL, NULL, NULL, 4, NULL, NULL),
	(90, 23, 'Breakpoints', NULL, NULL, NULL, 2, NULL, NULL),
	(91, 23, 'Adaptive vs Responsive', NULL, NULL, NULL, 3, NULL, NULL),
	(92, 23, 'Touch Interfaces', NULL, NULL, NULL, 4, NULL, NULL),
	(94, 24, 'Component Libraries', NULL, NULL, NULL, 2, NULL, NULL),
	(95, 24, 'Documentation', NULL, NULL, NULL, 3, NULL, NULL),
	(96, 24, 'Maintaining Consistency', NULL, NULL, NULL, 4, NULL, NULL),
	(98, 25, 'Research Methods Overview', NULL, NULL, NULL, 2, NULL, NULL),
	(99, 25, 'Planning Research', NULL, NULL, NULL, 3, NULL, NULL),
	(100, 25, 'Ethics in Research', NULL, NULL, NULL, 4, NULL, NULL),
	(102, 26, 'Conducting Interviews', NULL, NULL, NULL, 2, NULL, NULL),
	(103, 26, 'Analyzing Interview Data', NULL, NULL, NULL, 3, NULL, NULL),
	(104, 26, 'Creating Personas', NULL, NULL, NULL, 4, NULL, NULL),
	(106, 27, 'Moderated vs Unmoderated', NULL, NULL, NULL, 2, NULL, NULL),
	(107, 27, 'Task Design', NULL, NULL, NULL, 3, NULL, NULL),
	(108, 27, 'Analyzing Results', NULL, NULL, NULL, 4, NULL, NULL),
	(110, 28, 'Analytics & Metrics', NULL, NULL, NULL, 2, NULL, NULL),
	(111, 28, 'Journey Mapping', NULL, NULL, NULL, 3, NULL, NULL),
	(112, 28, 'Research Reports', NULL, NULL, NULL, 4, NULL, NULL),
	(114, 29, 'Design Thinking', NULL, NULL, NULL, 2, NULL, NULL),
	(115, 29, 'UX vs UI', NULL, NULL, NULL, 3, NULL, NULL),
	(116, 29, 'The UX Process', NULL, NULL, NULL, 4, NULL, NULL),
	(118, 30, 'Navigation Design', NULL, NULL, NULL, 2, NULL, NULL),
	(119, 30, 'Content Organization', NULL, NULL, NULL, 3, NULL, NULL),
	(120, 30, 'Card Sorting', NULL, NULL, NULL, 4, NULL, NULL),
	(122, 31, 'High-Fidelity Mockups', NULL, NULL, NULL, 2, NULL, NULL),
	(123, 31, 'Interactive Prototypes', NULL, NULL, NULL, 3, NULL, NULL),
	(124, 31, 'Design Iteration', NULL, NULL, NULL, 4, NULL, NULL),
	(126, 32, 'Design Advocacy', NULL, NULL, NULL, 2, NULL, NULL),
	(127, 32, 'Team Collaboration', NULL, NULL, NULL, 3, NULL, NULL),
	(128, 32, 'Measuring UX Success', NULL, NULL, NULL, 4, NULL, NULL),
	(130, 33, 'Data Entry & Formatting', NULL, NULL, NULL, 2, NULL, NULL),
	(131, 33, 'Basic Formulas', NULL, NULL, NULL, 3, NULL, NULL),
	(132, 33, 'Cell References', NULL, NULL, NULL, 4, NULL, NULL),
	(134, 34, 'Charts & Visualizations', NULL, NULL, NULL, 2, NULL, NULL),
	(135, 34, 'Conditional Formatting', NULL, NULL, NULL, 3, NULL, NULL),
	(136, 34, 'Data Validation', NULL, NULL, NULL, 4, NULL, NULL),
	(138, 35, 'INDEX & MATCH', NULL, NULL, NULL, 2, NULL, NULL),
	(139, 35, 'Array Formulas', NULL, NULL, NULL, 3, NULL, NULL),
	(140, 35, 'Date & Time Functions', NULL, NULL, NULL, 4, NULL, NULL),
	(142, 36, 'Power Pivot', NULL, NULL, NULL, 2, NULL, NULL),
	(143, 36, 'Macros & VBA', NULL, NULL, NULL, 3, NULL, NULL),
	(144, 36, 'Dashboard Creation', NULL, NULL, NULL, 4, NULL, NULL),
	(146, 37, 'SELECT Statements', NULL, NULL, NULL, 2, NULL, NULL),
	(147, 37, 'Filtering with WHERE', NULL, NULL, NULL, 3, NULL, NULL),
	(148, 37, 'Sorting Data', NULL, NULL, NULL, 4, NULL, NULL),
	(150, 38, 'Joins', NULL, NULL, NULL, 2, NULL, NULL),
	(151, 38, 'Aggregation Functions', NULL, NULL, NULL, 3, NULL, NULL),
	(152, 38, 'GROUP BY & HAVING', NULL, NULL, NULL, 4, NULL, NULL),
	(154, 39, 'Window Functions', NULL, NULL, NULL, 2, NULL, NULL),
	(155, 39, 'CTEs', NULL, NULL, NULL, 3, NULL, NULL),
	(156, 39, 'Case Statements', NULL, NULL, NULL, 4, NULL, NULL),
	(158, 40, 'Indexes', NULL, NULL, NULL, 2, NULL, NULL),
	(159, 40, 'Views', NULL, NULL, NULL, 3, NULL, NULL),
	(160, 40, 'Query Optimization', NULL, NULL, NULL, 4, NULL, NULL),
	(162, 41, 'Python Libraries (NumPy, Pandas)', NULL, NULL, NULL, 2, NULL, NULL),
	(163, 41, 'Data Preprocessing', NULL, NULL, NULL, 3, NULL, NULL),
	(164, 41, 'Train/Test Split', NULL, NULL, NULL, 4, NULL, NULL),
	(166, 42, 'Classification Algorithms', NULL, NULL, NULL, 2, NULL, NULL),
	(167, 42, 'Model Evaluation', NULL, NULL, NULL, 3, NULL, NULL),
	(168, 42, 'Cross-Validation', NULL, NULL, NULL, 4, NULL, NULL),
	(170, 43, 'Random Forests', NULL, NULL, NULL, 2, NULL, NULL),
	(171, 43, 'Support Vector Machines', NULL, NULL, NULL, 3, NULL, NULL),
	(172, 43, 'Neural Networks', NULL, NULL, NULL, 4, NULL, NULL),
	(174, 44, 'Hyperparameter Tuning', NULL, NULL, NULL, 2, NULL, NULL),
	(175, 44, 'Model Deployment', NULL, NULL, NULL, 3, NULL, NULL),
	(176, 44, 'Real-World Projects', NULL, NULL, NULL, 4, NULL, NULL),
	(178, 45, 'Activation Functions', NULL, NULL, NULL, 2, NULL, NULL),
	(179, 45, 'Backpropagation', NULL, NULL, NULL, 3, NULL, NULL),
	(180, 45, 'Gradient Descent', NULL, NULL, NULL, 4, NULL, NULL),
	(65, 17, 'Figma Interface', NULL, NULL, true, 1, NULL, NULL),
	(201, 51, 'Stories & Highlights', NULL, NULL, true, 1, NULL, NULL),
	(205, 52, 'Growing Your Audience', NULL, NULL, true, 1, NULL, NULL),
	(209, 53, 'Ads Manager Setup', NULL, NULL, true, 1, NULL, NULL),
	(213, 54, 'Ad Formats', NULL, NULL, true, 1, NULL, NULL),
	(217, 55, 'Bidding Strategies', NULL, NULL, true, 1, NULL, NULL),
	(221, 56, 'Retargeting', NULL, NULL, true, 1, NULL, NULL),
	(225, 57, 'How Search Engines Work', NULL, NULL, true, 1, NULL, NULL),
	(229, 58, 'Title Tags & Meta Descriptions', NULL, NULL, true, 1, NULL, NULL),
	(233, 59, 'Site Speed', NULL, NULL, true, 1, NULL, NULL),
	(237, 60, 'Link Building', NULL, NULL, true, 1, NULL, NULL),
	(241, 61, 'Writing for Web', NULL, NULL, true, 1, NULL, NULL),
	(245, 62, 'Content Planning', NULL, NULL, true, 1, NULL, NULL),
	(249, 63, 'Blog Posts', NULL, NULL, true, 1, NULL, NULL),
	(253, 64, 'Distribution Channels', NULL, NULL, true, 1, NULL, NULL);


--
-- Data for Name: message_storage; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."message_storage" ("id", "conversation_id", "messages", "created_at", "updated_at") VALUES
	('28de65bb-e04c-4d3d-9de9-d7b7a61107b2', '4cb3a216-6092-4215-952a-184523afffa4', '[{"id": "09163c57-0197-48ab-9a02-100bcad5c39f", "content": "alo", "sender_id": 33, "timestamp": "2025-10-26T22:15:13.890Z", "message_type": "text"}, {"id": "f4e901b2-d6a2-4083-8dc3-3313fff5c2e1", "content": "binh gold day", "sender_id": 33, "timestamp": "2025-10-26T22:15:23.066Z", "message_type": "text"}]', '2025-10-26 22:15:14.669947+00', '2025-10-26 22:15:23.097+00'),
	('c5d38dd3-c6b3-47b6-b04b-a6204635edcb', '1ecd9f52-443d-4ccd-982c-234fd55881c6', '[{"id": "4d57ec2d-f581-4098-b421-5a6d782ab3aa", "content": "hi", "sender_id": 4, "timestamp": "2025-10-27T11:58:03.382Z", "message_type": "text"}]', '2025-10-27 11:58:02.674083+00', '2025-10-27 11:58:02.674083+00'),
	('bc6d3899-b051-4518-9fba-87b1b50c90a1', 'd61858e2-1ea4-4a4b-abf2-e02c94797ef5', '[{"id": "1e884e97-4b15-4978-ac48-3af5e5aab88a", "content": "hi", "sender_id": 30, "timestamp": "2025-10-27T13:37:47.929Z", "message_type": "text"}, {"id": "f8367fd6-5676-4c40-80f3-9bf773edcabe", "content": "hi", "sender_id": 30, "timestamp": "2025-10-27T13:37:48.594Z", "message_type": "text"}, {"id": "2cfaceee-5202-407e-ab24-b6c7b63e5add", "content": "hi", "sender_id": 30, "timestamp": "2025-10-27T13:37:59.733Z", "message_type": "text"}]', '2025-10-27 13:37:47.899607+00', '2025-10-27 13:37:59.826+00'),
	('544b671b-bbfb-4d0c-92c8-9476e96cac19', '3f1e506f-ac9d-4d45-a5b1-24f74366f896', '[{"id": "6b9f33fb-bf88-44a4-8061-57f565426d53", "content": "hello", "sender_id": 48, "timestamp": "2025-10-27T14:03:00.976Z", "message_type": "text"}]', '2025-10-27 14:03:00.956944+00', '2025-10-27 14:03:00.956944+00'),
	('01a604f3-d453-4ede-b649-e81e0a682c6a', '90c48e98-42f4-4e5a-b121-e9b39fa9ba10', '[{"id": "f160ee15-2d99-481e-b472-e0e9a00cb796", "content": "chào cô", "sender_id": 4, "timestamp": "2025-10-27T11:58:20.400Z", "message_type": "text"}, {"id": "48234580-2672-440f-9ae0-083d699acd28", "content": "ùm chào em", "sender_id": 29, "timestamp": "2025-10-27T11:58:51.442Z", "message_type": "text"}, {"id": "4ac3c767-a8b0-4c87-93e3-24868a5eba58", "content": "hi there", "sender_id": 4, "timestamp": "2025-10-27T18:23:11.555Z", "message_type": "text"}]', '2025-10-27 11:58:19.690046+00', '2025-10-27 18:23:11.607+00'),
	('7a353b3b-15df-4f84-8937-ed78f6cf28da', '798cf401-e9ae-4dde-8aca-29db2ebb8bf6', '[{"id": "2ec69497-c499-4039-8c9b-e9bb1ca4509f", "content": "hieu thu hai", "sender_id": 30, "timestamp": "2025-10-27T13:37:13.615Z", "message_type": "text"}, {"id": "551eebe3-e198-46a7-a5c8-7cdaf17834ac", "content": "hieu thu 3 thi co", "sender_id": 4, "timestamp": "2025-10-27T18:24:21.959Z", "message_type": "text"}]', '2025-10-27 13:37:13.582776+00', '2025-10-27 18:24:22.008+00'),
	('8151185c-652a-408b-bd22-5959d20a6ae2', 'b960b5d0-1722-4388-ae90-339172cae30b', '[{"id": "92aca945-d670-4081-bf31-a0bfd2c3d588", "content": "dsadas", "sender_id": 29, "timestamp": "2025-10-27T18:23:19.447Z", "message_type": "text"}, {"id": "cba0acc5-4842-40d2-822c-3753cd23879f", "content": "dsadsad", "sender_id": 48, "timestamp": "2025-10-27T22:35:44.720Z", "message_type": "text"}]', '2025-10-27 18:23:14.575812+00', '2025-10-27 22:35:44.749+00'),
	('016bc59a-81d3-4f9f-8a35-53c6f77bb15d', '7e6ac20d-3b83-4212-aff8-37b26a23f19d', '[{"id": "1a809524-64f9-4b5f-8fb4-7f23bdfca757", "content": "hi", "sender_id": 48, "timestamp": "2025-10-27T13:58:44.920Z", "message_type": "text"}, {"id": "7f9dcd30-f5c7-43d3-9b9e-47455f21d9e7", "content": "😭", "sender_id": 32, "timestamp": "2025-10-27T18:36:48.556Z", "message_type": "text"}, {"id": "b2c1e46b-1a7b-46c6-816e-e77403414f15", "content": "mac gi khoc ba", "sender_id": 48, "timestamp": "2025-10-27T22:35:56.242Z", "message_type": "text"}]', '2025-10-27 13:58:44.84486+00', '2025-10-27 22:35:56.273+00'),
	('06e70a11-8019-422e-92d4-88d3acfc1ab6', '66bd047f-a7c7-48ad-9d9c-c14c9ded1358', '[{"id": "8c74abec-fbbe-4a75-ae8a-12f7ef76a659", "content": "hi", "sender_id": 48, "timestamp": "2025-10-27T13:49:16.865Z", "message_type": "text"}, {"id": "9d1dc0e0-30a0-4233-97ef-26704db9a74e", "content": "hello", "sender_id": 48, "timestamp": "2025-10-27T13:57:12.164Z", "message_type": "text"}, {"id": "3933d624-a403-4b31-bd2e-47cf90fe73f3", "content": "how are u", "sender_id": 48, "timestamp": "2025-10-27T13:58:21.818Z", "message_type": "text"}, {"id": "87ebfaa4-0476-463b-a67a-c3065466d957", "content": "im good thank you and you 2 ?", "sender_id": 30, "timestamp": "2025-10-27T14:17:14.917Z", "message_type": "text"}, {"id": "4b0a4b52-4995-4a94-a267-a4f5a7f17a55", "content": "helllo please reply", "sender_id": 30, "timestamp": "2025-10-27T18:19:49.415Z", "message_type": "text"}, {"id": "e25c01a6-b31a-4493-9aa7-8342176b7a6c", "content": "yo hello im replying right now", "sender_id": 48, "timestamp": "2025-10-27T18:20:15.950Z", "message_type": "text"}, {"id": "f4ed1423-f7a2-494f-92b5-13a26312e63a", "content": "thank you", "sender_id": 30, "timestamp": "2025-10-27T18:20:36.535Z", "message_type": "text"}, {"id": "510fbfed-817a-48a2-9e4a-69cf37c182b1", "content": "hi", "sender_id": 30, "timestamp": "2025-10-27T19:51:44.844Z", "message_type": "text"}, {"id": "fab8ce31-ee6d-455a-a439-5c980554c4da", "content": "hello", "sender_id": 30, "timestamp": "2025-10-27T19:51:49.931Z", "message_type": "text"}, {"id": "e030f3b5-2deb-4e8f-b29f-42ab88350e5f", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T19:51:52.754Z", "message_type": "text"}, {"id": "49c11c0a-4b1b-43d9-8ac4-b7a121fd4b4b", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T19:51:54.717Z", "message_type": "text"}, {"id": "974b9a79-919b-47e5-a263-c1d1aa5534e2", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T19:51:56.214Z", "message_type": "text"}, {"id": "5eb3ff82-41b8-432e-b0bb-edf5c0e93a36", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T19:51:57.805Z", "message_type": "text"}, {"id": "06421d28-f103-4204-8890-27d8cd2b32d6", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T19:52:04.590Z", "message_type": "text"}, {"id": "19c0906c-5477-4cc7-9c5f-26a5bbc05fe1", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T19:52:06.035Z", "message_type": "text"}, {"id": "afdd8fe7-ada5-4d92-a6dc-bf042ee07edc", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T19:52:06.379Z", "message_type": "text"}, {"id": "88390a02-0f5f-4a09-a3f7-72755a1861eb", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T19:52:06.467Z", "message_type": "text"}, {"id": "72dad700-a885-4313-93a4-1b9af16bc777", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T19:52:06.602Z", "message_type": "text"}, {"id": "8579b267-3863-4f53-bfc3-8dde6abbdd07", "content": "d", "sender_id": 30, "timestamp": "2025-10-27T19:52:07.305Z", "message_type": "text"}, {"id": "465fc6ba-280c-4a79-bc30-0565d624b178", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T20:21:14.769Z", "message_type": "text"}, {"id": "6758ce73-6c62-4878-9672-700c16f716eb", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T20:21:18.433Z", "message_type": "text"}, {"id": "67d400e1-547c-47c4-96ab-c7ca68ef80ad", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T20:21:21.218Z", "message_type": "text"}, {"id": "228033e3-7205-4d5f-8b23-0756183a4f02", "content": "dd", "sender_id": 30, "timestamp": "2025-10-27T20:21:22.968Z", "message_type": "text"}, {"id": "8f2dc47c-3183-47d3-80d8-6e34b1371d2d", "content": "sadsa", "sender_id": 30, "timestamp": "2025-10-27T20:21:24.047Z", "message_type": "text"}, {"id": "57f5e20e-fe5b-43c6-a483-a8ca2255b8d9", "content": "dsadasdsa", "sender_id": 30, "timestamp": "2025-10-27T20:21:26.573Z", "message_type": "text"}]', '2025-10-27 13:49:16.865103+00', '2025-10-27 20:21:26.711+00');


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."reviews" ("review_id", "user_id", "course_id", "rating", "comment", "created_at") VALUES
	(29, 45, 11, 1, 'dsa', '2025-10-28 01:21:15.839'),
	(30, 4, 16, 5, 'good', '2025-10-28 03:56:12.583'),
	(33, 4, 13, 5, 'hi bao nhieu lau chua gap', '2025-10-28 04:42:39.031');


--
-- Data for Name: user_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_enrollments" ("enrollment_id", "user_id", "course_id", "enrolled_at") VALUES
	(27, 33, 5, '2025-10-25 00:00:09.34982'),
	(28, 33, 13, '2025-10-25 00:00:45.191421'),
	(29, 33, 7, '2025-10-25 00:36:53.730672'),
	(30, 33, 6, '2025-10-25 00:39:05.731315'),
	(31, 33, 1, '2025-10-25 01:24:41.990305'),
	(32, 46, 3, '2025-10-25 15:29:36.062099'),
	(33, 45, 10, '2025-10-26 03:52:57.617706'),
	(34, 45, 9, '2025-10-26 05:19:14.228641'),
	(35, 45, 13, '2025-10-26 05:19:24.455677'),
	(36, 45, 16, '2025-10-26 05:19:32.19756'),
	(37, 45, 8, '2025-10-26 05:19:39.636736'),
	(38, 45, 11, '2025-10-26 05:21:57.517061'),
	(39, 45, 3, '2025-10-27 08:52:56.718247'),
	(40, 45, 1, '2025-10-27 08:55:04.978303'),
	(41, 4, 11, '2025-10-27 16:29:01.883705'),
	(42, 4, 15, '2025-10-27 16:44:51.153858'),
	(43, 51, 3, '2025-10-27 18:31:09.328528'),
	(44, 45, 15, '2025-10-27 18:44:47.075744'),
	(45, 45, 4, '2025-10-27 18:46:26.713045'),
	(46, 4, 13, '2025-10-27 18:50:55.095578'),
	(47, 47, 11, '2025-10-27 19:01:08.263319'),
	(48, 4, 16, '2025-10-27 20:56:03.797644'),
	(49, 48, 11, '2025-10-27 22:34:13.884162'),
	(50, 48, 1, '2025-10-27 22:34:34.793196'),
	(51, 44, 1, '2025-10-28 01:42:35.119907'),
	(52, 44, 3, '2025-10-28 01:53:11.577766');


--
-- Data for Name: user_lesson_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_lesson_progress" ("progress_id", "user_id", "lesson_id", "is_completed", "completed_at") VALUES
	(39, 45, 145, true, '2025-10-26 12:18:42.73'),
	(40, 45, 146, true, '2025-10-26 12:18:46.438'),
	(41, 45, 147, true, '2025-10-26 12:18:49.063'),
	(42, 33, 1, true, '2025-10-27 16:43:37.887'),
	(43, 45, 1, true, '2025-10-27 17:00:25.502'),
	(44, 45, 2, true, '2025-10-27 17:13:38.291'),
	(45, 45, 3, true, '2025-10-27 18:42:05.724'),
	(46, 45, 4, true, '2025-10-27 18:42:45.697'),
	(47, 33, 3, true, '2025-10-27 18:55:28.193'),
	(48, 33, 2, true, '2025-10-27 18:55:32.09'),
	(49, 46, 33, true, '2025-10-27 21:45:50.909'),
	(50, 46, 34, true, '2025-10-27 21:45:55.05'),
	(51, 46, 35, true, '2025-10-27 21:47:16.154'),
	(52, 46, 38, true, '2025-10-27 21:50:18.478'),
	(53, 4, 166, true, '2025-10-28 00:33:04.509'),
	(54, 4, 161, true, '2025-10-28 00:33:08.989'),
	(55, 4, 162, true, '2025-10-28 00:33:29.574'),
	(56, 4, 163, true, '2025-10-28 00:33:42.977'),
	(57, 4, 164, true, '2025-10-28 00:33:47.21'),
	(58, 4, 165, true, '2025-10-28 00:33:53.272'),
	(59, 4, 167, true, '2025-10-28 00:33:59.846'),
	(60, 4, 168, true, '2025-10-28 00:37:17.874'),
	(61, 4, 169, true, '2025-10-28 00:37:23.288'),
	(62, 45, 33, true, '2025-10-28 01:24:41.4'),
	(63, 4, 174, true, '2025-10-28 01:47:20.687'),
	(64, 4, 176, true, '2025-10-28 01:47:29.878'),
	(65, 4, 170, true, '2025-10-28 01:47:39.566'),
	(66, 4, 171, true, '2025-10-28 01:47:44.384'),
	(67, 4, 172, true, '2025-10-28 01:47:49.428'),
	(68, 4, 173, true, '2025-10-28 01:47:54.308'),
	(69, 4, 175, true, '2025-10-28 01:47:59.174');


--
-- Data for Name: user_wishlist; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_wishlist" ("wishlist_id", "user_id", "course_id", "added_at") VALUES
	(22, 47, 10, '2025-10-26 03:24:35.320166'),
	(23, 47, 5, '2025-10-26 03:24:48.730881'),
	(31, 4, 13, '2025-10-27 18:16:33.939597');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- Name: categories_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."categories_category_id_seq"', 47, true);


--
-- Name: chapters_chapter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."chapters_chapter_id_seq"', 43, true);


--
-- Name: contact_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."contact_messages_id_seq"', 1, true);


--
-- Name: courses_course_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."courses_course_id_seq"', 18, true);


--
-- Name: lessons_lesson_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."lessons_lesson_id_seq"', 153, true);


--
-- Name: reviews_review_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."reviews_review_id_seq"', 34, true);


--
-- Name: user_enrollments_enrollment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."user_enrollments_enrollment_id_seq"', 52, true);


--
-- Name: user_lesson_progress_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."user_lesson_progress_progress_id_seq"', 69, true);


--
-- Name: user_wishlist_wishlist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."user_wishlist_wishlist_id_seq"', 31, true);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."users_user_id_seq"', 51, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict s6FE26pQ6BJMZn5lOy5lbREnArBY31VBe5ehkcGAqa4zP5fNx1tw27whG8xtiJv

RESET ALL;
