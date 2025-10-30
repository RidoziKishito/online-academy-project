import express from 'express';
import { engine } from 'express-handlebars';
import hsb_sections from 'express-handlebars-sections';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
// import helmet from 'helmet'; // Removed - CSP disabled
import cors from 'cors';
import pinoHttp from 'pino-http';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';

// Load environment variables first
dotenv.config();

import { testEmailConfig } from './utils/mailer.js';
testEmailConfig();
// Import Middlewares
import { restrict, isAdmin, isInstructor, isStudent } from './middlewares/auth.mdw.js';
// Import Models (chỉ cần cho middleware)
import * as categoryModel from './models/category.model.js';
import * as viewModel from './models/views.model.js';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security & logging middleware
const isProd = process.env.NODE_ENV === 'production';

// Request logging with request-id
import logger from './utils/logger.js';
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || undefined,
  autoLogging: true,
}));

// CORS: allowlist via env (comma-separated)
let corsOptions = { origin: true, credentials: true };
if (process.env.CORS_ALLOWED_ORIGINS) {
  const origins = process.env.CORS_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  corsOptions = { origin: origins, credentials: true };
} else if (isProd) {
  logger.warn('CORS_ALLOWED_ORIGINS not set in production; CORS is currently permissive');
}

// CORS enabled
app.use(cors(corsOptions));

// Disable X-Powered-By header (basic security)
app.disable('x-powered-by');

// Enable gzip/deflate compression
app.use(compression());

// Sessions with Postgres store
app.set('trust proxy', 1)
const PgStore = connectPgSimple(session);

// Use a dedicated, tiny pg Pool for the session store to avoid exhausting Supabase pooler
const { Pool } = pg;

// Configure session pool connection
let sessionPoolConfig;
if (process.env.DATABASE_URL) {
  console.log('Session store using DATABASE_URL');
  sessionPoolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  };
} else {
  console.log('Session store using individual DB_* variables');
  sessionPoolConfig = {
    host: process.env.DB_HOST || process.env.HOST,
    port: Number(process.env.DB_PORT || process.env.PORT) || 5432,
    user: process.env.DB_USER || process.env.USER,
    password: process.env.DB_PASSWORD || process.env.PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  };
}

const sessionPgPool = new Pool(sessionPoolConfig);

sessionPgPool.on('error', (err) => {
  logger.error({ err }, 'pg session pool error');
});

const sessionStore = new PgStore({
  pool: sessionPgPool,
  createTableIfMissing: true,
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'fallback-secret-please-set-SESSION_SECRET-in-env',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax'
  }
}));

// Passport (after session)
app.use(passport.initialize());
app.use(passport.session());


app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Thêm dòng này để xử lý JSON body cho các API
app.use(express.static('static')); // Serve all static files from /static folder

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
import adminContactRouter from './routes/admin-contact.route.js';
import contactRouter from './routes/contact.route.js';
import sitemapRouter from './routes/sitemap.route.js';
import instructorsRouter from './routes/instructors.route.js';
import reviewRoute from './routes/review.route.js';
import chatRouter from './routes/chat.route.js';
import testChatRouter from './routes/test-chat.route.js';
import passport from './utils/passport.js';
import authRouter from './routes/auth.route.js';
import rateLimit from 'express-rate-limit';
import paymentRouter from './routes/payment.route.js';
// logger already imported above for pino-http

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
    ne(a, b) {
      return a !== b;
    },
    ifEq(a, b, options) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    },
    or(a, b) {
      return a || b;
    },
    not(a) {
      return !a;
    },
    ifEq2(a, b, options) {
      if (a == b) {
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
    },
    encodeURIComponent(str) {
    return encodeURIComponent(str);
    },
    isYouTube(url) {
        if (!url) return false;
        return url.includes('youtube.com') || url.includes('youtu.be');
    },
    // Convert YouTube URL to embed URL
    getYouTubeEmbedUrl(url) {
        if (!url) return '';
        
        // https://www.youtube.com/watch?v=VIDEO_ID
        // https://youtu.be/VIDEO_ID
        let videoId = '';
        
        if (url.includes('youtube.com/watch')) {
            const urlParams = new URL(url).searchParams;
            videoId = urlParams.get('v');
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
            return url; // Already embed URL
        }
        
        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
        }
        
        return url;
    },
    isStudent(options) {
      const user = options.data.root.authUser; // lấy từ res.locals.authUser
      if (!user) return false;
      return user.role === 'student';
    }


  }
}));


// ================= MIDDLEWARES TOÀN CỤC =================
// Simple in-memory cache for global data
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 minutes TTL
async function getOrSet(key, fetcher) {
  const cached = cache.get(key);
  if (cached) {
    logger.debug(`Cache HIT for key: ${key}`);
    return cached;
  }
  logger.debug(`Cache MISS for key: ${key}, fetching data...`);
  const data = await fetcher();
  logger.debug(`Fetched ${data?.length || 0} items for key: ${key}`);
  cache.set(key, data);
  return data;
}

// Middleware cung cấp thông tin đăng nhập cho tất cả các view
app.use(async function (req, res, next) {
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.authUser = req.session.authUser || null;
  res.locals.topWeekCourses = await getOrSet('topWeekCourses', () => viewModel.findTopWeekCourses());
  res.locals.topCategories = await getOrSet('topCategories', () => viewModel.findTopCategories());
  res.locals.categoryIcons = {
    "Development": "bi bi-code-slash",
    "Design": "bi bi-palette",
    "Data Science": "bi bi-bar-chart-line",
    "Digital Marketing": "bi bi-megaphone",
    "Frontend Development": "bi bi-laptop",
    "Backend Development": "bi bi-server",
    "UI Design": "bi bi-palette-fill",
    "UX Design": "bi bi-people",
    "Data Analysis": "bi bi-graph-up",
    "Machine Learning": "bi bi-cpu",
    "Social Media Marketing": "bi bi-share",
    "Content Marketing": "bi bi-journal-text",
    "SEO": "bi bi-search",
    "Mobile Development": "bi bi-phone",
    "DevOps": "bi bi-tools",
    "Cloud Computing": "bi bi-cloud",
    "Cyber Security": "bi bi-shield-lock",
    "Business": "bi bi-briefcase",
    "Photography": "bi bi-camera",
    "Music": "bi bi-music-note-beamed"
  };
  res.locals.newestCourses = await getOrSet('newestCourses', () => viewModel.findNewestCourses());
  res.locals.mostViewCourses = await getOrSet('mostViewCourses', () => viewModel.findMostViewCourses());
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
// Provide isStudent flag to templates
app.use(function (req, res, next) {
  res.locals.isStudent = !!(req.session && req.session.authUser && req.session.authUser.role === 'student');
  next();
});
// Provide current year to templates
app.use(function (req, res, next) {
  res.locals.currentYear = new Date().getFullYear();
  next();
});

// Provide Supabase configuration to templates
app.use(function (req, res, next) {
  res.locals.supabaseUrl = process.env.SUPABASE_URL;
  res.locals.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  next();
});

// Middleware cung cấp danh sách lĩnh vực cho layout
app.use(async function (req, res, next) {
  const list = await getOrSet('globalCategories', () => categoryModel.findAll());
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
app.get('/', async (req, res) => {
  const user = req.session.authUser;

  if (!req.session.isAuthenticated || !user) {
    // chưa đăng nhập
    return res.render('home', { layout: 'home-main' });
  }

  // đã đăng nhập
  if (user.role === 'student') {
    try {
      // Load courses data for authenticated student home
      const coursesModel = await import('./models/courses.model.js');
      
      return res.render('home-authen', { 
        layout: 'main'
      });
    } catch (error) {
      logger.error({ err: error }, 'Error loading home page data');
      return res.render('home-authen', { 
        layout: 'main'
      });
    }
  }

  if (user.role === 'instructor') {
    return res.redirect('/instructor');
  }

  if (user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }

  // fallback
  res.render('home', { layout: 'home-main' });
});

app.use('/account', accountRouter);
app.use('/courses', courseRouter);
app.use('/auth', authRouter);
app.use('/payment', paymentRouter); 

// -- Routes của học viên (cần đăng nhập) --
// Student-only areas
// Student has its own restrict in student.route.js
app.use('/student', restrict, studentRouter);
app.use('/learn', restrict, isStudent, learnRouter);

// Public instructors profiles
app.use('/instructors', instructorsRouter);

// Only students should create reviews
app.use('/review', restrict, isStudent, reviewRoute);
// -- Routes của giảng viên (cần đăng nhập và là instructor) --
app.use('/instructor', restrict, isInstructor, instructorDashboardRouter);

// -- Routes của Admin (cần đăng nhập và là admin) --
app.use('/admin/categories', restrict, isAdmin, categoryAdminRouter);
app.use('/admin/instructors', restrict, isAdmin, instructorAdminRouter);
app.use('/admin/courses', restrict, isAdmin, courseAdminRouter);
app.use('/admin/dashboard', restrict, isAdmin, adminDashboardRouter);
app.use('/admin/accounts', restrict, isAdmin, adminAccountsRouter);
app.use('/admin/contact', restrict, isAdmin, adminContactRouter);
app.use('/contact', contactRouter);
app.use('/sitemap', sitemapRouter);

// Rate limiting for chat endpoints
const chatRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests, please try again later'
    }
});

const messageRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 message requests per windowMs
    message: {
        success: false,
        message: 'Too many messages, please slow down'
    }
});

// -- Chat API Routes (need authentication) --
app.use('/api/chat', restrict, chatRateLimit, chatRouter);

// -- Test Chat Route (for debugging) --
app.use('/test', restrict, testChatRouter);
// =======================================================


// ================= XỬ LÝ LỖI =================
// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// Clear cache endpoint (development only)
app.get('/api/clear-cache', (req, res) => {
  cache.flushAll();
  logger.info('Cache cleared manually');
  res.json({ success: true, message: 'Cache cleared successfully' });
});

app.use((req, res) => {
  res.status(404).render('404');
});

app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error middleware');
  res.status(500).render('500');
});
// =======================================================
// Graceful shutdown & error observers
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught Exception');
});

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, `Application listening on port ${PORT}`);
});

function shutdown() {
  logger.info('Shutting down gracefully...');
  try {
    server.close(() => {
      logger.info('HTTP server closed');
      try { sessionPgPool.end(); } catch (e) { logger.warn({ err: e }, 'Error closing session pool'); }
      process.exit(0);
    });
  } catch (e) {
    logger.error({ err: e }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);