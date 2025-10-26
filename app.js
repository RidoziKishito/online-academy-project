import express from 'express';
import { engine } from 'express-handlebars';
import hsb_sections from 'express-handlebars-sections';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';


import { testEmailConfig } from './utils/mailer.js';
testEmailConfig();
// Import Middlewares
import { restrict, isAdmin, isInstructor } from './middlewares/auth.mdw.js';
// Import Models (chỉ cần cho middleware)
import * as categoryModel from './models/category.model.js';
import * as viewModel from './models/views.model.js';

// Import Routers
import accountRouter from './routes/account.route.js';
import courseRouter from './routes/course.route.js';
import studentRouter from './routes/student.route.js';
import learnRouter from './routes/learn.route.js';
import instructorDashboardRouter from './routes/instructor-dashboard.route.js';
import categoryAdminRouter from './routes/category.route.js';
import instructorAdminRouter from './routes/instructor.route.js';
import courseAdminRouter from './routes/course-admin.route.js';
import adminDashboardRouter from './routes/admin-dashboard.route.js';
import adminAccountsRouter from './routes/admin-accounts.route.js';
import contactRouter from './routes/contact.route.js';
import sitemapRouter from './routes/sitemap.route.js';
import instructorsRouter from './routes/instructors.route.js';
import reviewRoute from './routes/review.route.js';
import passport from './utils/passport.js';
import authRouter from './routes/auth.route.js';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('trust proxy', 1)
app.use(session({
  secret: 'jgiejghewhuoweofijw2t498hjwoifjw4twnfowejhf',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Passport (after session)
app.use(passport.initialize());
app.use(passport.session());

app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: [
    path.join(__dirname, 'views', 'partials'),
    path.join(__dirname, 'views', 'vwInstructor')
  ],
  helpers: {
    fillContent: hsb_sections(),
    format_number(value) {
      return new Intl.NumberFormat('vi-VN').format(value);
    },
    format_date(value) {
      if (!value) return '';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    format_duration(seconds) {
      if (!seconds) return '0 min';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes} min`;
    },
    eq(a, b) {
      return a === b;
    },
    ifEq(a, b, options) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    },

    render_stars(rating) {
      const fullStars = Math.floor(rating || 0);
      const halfStar = (rating % 1) >= 0.5;
      let stars = '';

      // ⭐ Full stars
      for (let i = 0; i < fullStars; i++) {
        stars += '<i class="bi bi-star-fill text-warning"></i>';
      }

      // 🌗 Half star
      if (halfStar) {
        stars += '<i class="bi bi-star-half text-warning"></i>';
      }

      // ☆ Empty stars
      for (let i = fullStars + (halfStar ? 1 : 0); i < 5; i++) {
        stars += '<i class="bi bi-star text-warning"></i>';
      }

      return new Handlebars.SafeString(stars);
    },

    format_date: function (timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleDateString('vi-VN');
    },

    // Trả về danh sách category con của một category cha
    subCategories: function (parentId, categories) {
      return categories.filter(c => c.parent_category_id === parentId);
    },

    // Kiểm tra category có subcategory con hay không
    hasSubCategories: function (parentId, categories) {
      return categories.some(c => c.parent_category_id === parentId);
    },
    repeat(count, options) {
      let result = '';
      for (let i = 0; i < Math.floor(count); i++) {
        result += options.fn(this);
      }
      return result;
    },
    range(start, end) {
      const result = [];
      for (let i = start; i < end; i++) {
        result.push(i);
      }
      return result;
    },
    lte(a, b) {
      return a <= b;
    },
    formatDate(date) {
      return new Date(date).toLocaleDateString('vi-VN');
    },
    and(a, b) {
      return a && b;
    },
    slice(array, start, end) {
      if (!array || !Array.isArray(array)) return [];
      return array.slice(start, end);
    },
    add(a, b) {
      return a + b;
    },
    subtract(a, b) {
      return a - b;
    },
    generatePages(currentPage, totalPages) {
      const pages = [];
      const maxVisible = 7;

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 4) {
          for (let i = 1; i <= 5; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 3) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        }
      }

      return pages;
    },

    iconOrDefault(categoryIcons, name) {
      return categoryIcons[name] || "bi bi-folder";
    }

  }
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Thêm dòng này để xử lý JSON body cho các API
app.use('/static', express.static('static'));
app.use(express.static('public')); // Add this line to serve files from public directory

// ================= MIDDLEWARES TOÀN CỤC =================
// Middleware cung cấp thông tin đăng nhập cho tất cả các view
app.use(async function (req, res, next) {
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.authUser = req.session.authUser || null;
  res.locals.top3WeekCourses = await viewModel.findTop3WeekCourses();
  res.locals.topCategories = await viewModel.findTopCategories();
  res.locals.categoryIcons = {
    "Development": "bi bi-code-slash",
    "Design": "bi bi-palette",
    "Data Science": "bi bi-bar-chart-line",
    "Digital Marketing": "bi bi-megaphone"
  },
  res.locals.newestCourses = await viewModel.findNewestCourses();
  res.locals.mostViewCourses = await viewModel.findMostViewCourses();
  next();
});

// Provide isAdmin flag to templates
app.use(function (req, res, next) {
  res.locals.isAdmin = !!(req.session && req.session.authUser && req.session.authUser.role === 'admin');
  next();
});
//Provide isInstructor flag to templates
app.use(function (req, res, next) {
  res.locals.isInstructor = !!(req.session && req.session.authUser && req.session.authUser.role === 'instructor');
  next();
});
// Provide current year to templates
app.use(function (req, res, next) {
  res.locals.currentYear = new Date().getFullYear();
  next();
});

// Middleware cung cấp danh sách lĩnh vực cho layout
app.use(async function (req, res, next) {
  const list = await categoryModel.findAll();
  // Provide both the DB row and legacy keys used by older templates
  res.locals.globalCategories = list.map(cat => ({
    ...cat,
    catid: cat.category_id,
    catname: cat.name
  }));
  next();
});
// Flash messages (simple session-based)
app.use(function (req, res, next) {
  res.locals.flash = req.session.flash || null;
  // clear flash after exposing to view
  delete req.session.flash;
  next();
});
// =======================================================


// ================= ROUTERS =================
// -- Routes công khai (ai cũng xem được) --
app.get('/', (req, res) => {
  if (!req.session.isAuthenticated) {
    res.render('home', {
      layout: 'home-main'
    });
  }
  else {
    res.render('home-authen', {
      layout: 'main'
    });
  }
});
app.use('/account', accountRouter);
app.use('/courses', courseRouter);
app.use('/auth', authRouter);

// -- Routes của học viên (cần đăng nhập) --
app.use('/student', restrict, studentRouter);
app.use('/learn', restrict, learnRouter);

// Public instructors profiles
app.use('/instructors', instructorsRouter);

app.use('/review', restrict, reviewRoute);
// -- Routes của giảng viên (cần đăng nhập và là instructor) --
app.use('/instructor', restrict, isInstructor, instructorDashboardRouter);

// -- Routes của Admin (cần đăng nhập và là admin) --
app.use('/admin/categories', restrict, isAdmin, categoryAdminRouter);
app.use('/admin/instructors', restrict, isAdmin, instructorAdminRouter);
app.use('/admin/courses', restrict, isAdmin, courseAdminRouter);
app.use('/admin/dashboard', restrict, isAdmin, adminDashboardRouter);
app.use('/admin/accounts', restrict, isAdmin, adminAccountsRouter);
app.use('/contact', contactRouter);
app.use('/sitemap', sitemapRouter);
// =======================================================


// ================= XỬ LÝ LỖI =================
app.use((req, res) => {
  res.status(404).render('404');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500');
});
// =======================================================
app.listen(PORT, () => {
  console.log('Application listening on port ' + PORT + ' | http://localhost:' + PORT);
});