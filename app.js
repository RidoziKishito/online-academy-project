import express from 'express';
import { engine } from 'express-handlebars';
import hsb_sections from 'express-handlebars-sections';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Middlewares
import { restrict, isAdmin, isInstructor } from './middlewares/auth.mdw.js';

// Import Models (chỉ cần cho middleware)
import * as categoryModel from './models/category.model.js';

// Import Routers
import accountRouter from './routes/account.route.js';
import courseRouter from './routes/course.route.js';
import studentRouter from './routes/student.route.js';
import learnRouter from './routes/learn.route.js';
import instructorDashboardRouter from './routes/instructor-dashboard.route.js';
import categoryAdminRouter from './routes/category.route.js';
import instructorAdminRouter from './routes/instructor.route.js';
import courseAdminRouter from './routes/course-admin.route.js';
import adminPermissionsRouter from './routes/admin-permissions.route.js';
import adminAccountsRouter from './routes/admin-accounts.route.js';
import contactRouter from './routes/contact.route.js';
import sitemapRouter from './routes/sitemap.route.js';
import instructorsRouter from './routes/instructors.route.js';


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

app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
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
    eq(a, b) {
      return a === b;
    },
    ifEq(a, b, options) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    }
  }
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Thêm dòng này để xử lý JSON body cho các API
app.use('/static', express.static('static'));

// ================= MIDDLEWARES TOÀN CỤC =================
// Middleware cung cấp thông tin đăng nhập cho tất cả các view
app.use(function (req, res, next) {
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.authUser = req.session.authUser || null;
  next();
});

// Provide isAdmin flag to templates
app.use(function (req, res, next) {
  res.locals.isAdmin = !!(req.session && req.session.authUser && req.session.authUser.role === 'admin');
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
  res.render('home');
});
app.use('/account', accountRouter);
app.use('/courses', courseRouter);

// -- Routes của học viên (cần đăng nhập) --
app.use('/student', restrict, studentRouter);
app.use('/learn', restrict, learnRouter);

// Public instructors profiles
app.use('/instructors', instructorsRouter);

// -- Routes của giảng viên (cần đăng nhập và là instructor) --
app.use('/instructor', restrict, isInstructor, instructorDashboardRouter);

// -- Routes của Admin (cần đăng nhập và là admin) --
app.use('/admin/categories', restrict, isAdmin, categoryAdminRouter);
app.use('/admin/instructors', restrict, isAdmin, instructorAdminRouter);
app.use('/admin/courses', restrict, isAdmin, courseAdminRouter);
app.use('/admin/permissions', restrict, isAdmin, adminPermissionsRouter);
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
  console.log(`Application listening on port ${PORT}`);
});