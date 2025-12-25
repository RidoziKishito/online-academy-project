# COMPREHENSIVE SECURITY AUDIT REPORT
**Online Academy Platform**  
**Date:** December 25, 2025  
**Status:** Security Assessment

---

## EXECUTIVE SUMMARY

This comprehensive security audit examines the Online Academy Platform for common web vulnerabilities including CSRF, XSS, SQL Injection, File Upload, and Directory Traversal issues. The audit identifies **9 security vulnerabilities** across multiple categories.

| Vulnerability | Count | Severity | Status |
|---|---|---|---|
| **CSRF (Cross-Site Request Forgery)** | 1 | HIGH | ⚠️ VULNERABLE |
| **XSS (Cross-Site Scripting)** | 2 | HIGH | ⚠️ VULNERABLE |
| **SQL Injection (LIKE Pattern Injection)** | 4 | HIGH-MEDIUM | ⚠️ VULNERABLE |
| **File Upload** | 1 | MEDIUM | ⚠️ VULNERABLE |
| **Directory Traversal** | 1 | MEDIUM | ✅ MITIGATED |
| **Total Issues Found** | **9** | **MIXED** | **⚠️ ACTION REQUIRED** |

---

## SCOPE

### Technology Stack
- **Framework:** Express.js 5.1.0
- **Template Engine:** Handlebars
- **Database:** PostgreSQL (Knex.js ORM)
- **Authentication:** Session-based + Google OAuth
- **File Upload:** Multer (diskStorage)
- **Session Storage:** PostgreSQL

### Project Source
**GitHub Repository:** [RidoziKishito/online-academy-project](https://github.com/RidoziKishito/online-academy-project)

---

## 1. CSRF (CROSS-SITE REQUEST FORGERY)

### Vulnerability #1: Missing CSRF Protection on State-Changing Operations

#### PoC (Proof of Concept):
```html
<!-- Attacker places this on external website -->
<img src="https://academy.example.com/student/wishlist/add" 
     style="display:none" 
     onerror="fetch('https://academy.example.com/student/wishlist/add', {
       method: 'POST',
       credentials: 'include',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({courseId: 123})
     })">
```

**Exploitation Flow:**
1. Authenticated user logged into academy.example.com
2. User visits attacker.com (still logged in)
3. Attacker's page makes POST request to `/student/wishlist/add`
4. Browser automatically includes session cookies
5. Course is added to wishlist without user consent

#### Vulnerability Details:
- **Location:** Multiple routes (student.route.js, review.route.js, learn.route.js, etc.)
- **Affected Endpoints:**
  - `POST /student/wishlist/add` - No CSRF token
  - `POST /student/wishlist/remove` - No CSRF token
  - `POST /review/course/:courseId` - No CSRF token
  - `DELETE /review/course/:courseId` - No CSRF token
  - `POST /learn/mark-complete` - No CSRF token
  - `POST /learn/progress` - No CSRF token

**Code Evidence:**
```javascript
// routes/student.route.js (Line 127-138)
router.post('/wishlist/add', async (req, res) => {
    const { courseId } = req.body;
    // ❌ NO CSRF TOKEN VERIFICATION
    await wishlistModel.add(userId, courseId);
    res.json({ success: true });
});

// routes/review.route.js (Line 13-70)
router.post('/course/:courseId', async (req, res) => {
    const { rating, comment } = req.body;
    // ❌ NO CSRF TOKEN VERIFICATION
    await reviewModel.updateReview(...);
});
```

#### Why It's Vulnerable:
- **Root Cause 1:** No CSRF token generation in forms/API
- **Root Cause 2:** No token validation in POST/PUT/DELETE handlers
- **Root Cause 3:** Cookies sent automatically by browser
- **Root Cause 4:** No SameSite cookie restriction on state-changing operations

#### Impact:
- ⚠️ Unauthorized wishlist modifications
- ⚠️ Unauthorized review posting (fake reviews)
- ⚠️ Unauthorized enrollment manipulation
- ⚠️ Unauthorized progress updates
- ⚠️ Reputation damage

#### Countermeasure:
```javascript
// Solution: Install csurf middleware (already in package.json)
import csrf from 'csurf';

// Add CSRF protection middleware
const csrfProtection = csrf({ cookie: false }); // Use sessions instead of cookies

// For forms
app.get('/form', csrfProtection, (req, res) => {
    res.render('form', { csrfToken: req.csrfToken() });
});

// In template
<form method="POST" action="/submit">
    <input type="hidden" name="_csrf" value="{{ csrfToken }}">
    <!-- form fields -->
</form>

// For API/AJAX
app.post('/api/action', csrfProtection, async (req, res) => {
    // req.csrfToken already validated by middleware
    res.json({ success: true });
});

// In JavaScript
const csrfToken = document.querySelector('meta[name="_csrf"]').getAttribute('content');
fetch('/api/wishlist/add', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({courseId})
});
```

---

## 2. XSS (CROSS-SITE SCRIPTING)

### Vulnerability #2a: Unescaped HTML in Course Content

#### PoC (Proof of Concept):
```javascript
// Attacker creates course with malicious content
const courseData = {
    title: "Python 101",
    full_description: "<img src=x onerror='alert(\"XSS in description\")'>",
    requirements: "<script>fetch('/api/steal', {body: document.cookie})</script>"
};

// In Handlebars template (line: vwLearn/watch.handlebars:101)
{{{currentLesson.content}}}

// Result: Script executes in student's browser
// Attacker can:
// - Steal session cookies
// - Capture keystrokes
// - Redirect to phishing site
// - Inject malicious JavaScript
```

**Attack Flow:**
1. Instructor (or admin) uploads course with `<script>` tags
2. Student views lesson
3. Malicious script executes in student's browser context
4. Student's session cookie is stolen
5. Attacker logs in as student

#### Vulnerability Details:
- **Location:** Multiple template files
- **Vulnerable Templates:**
  1. `vwLearn/watch.handlebars` (Line 101) - Lesson content
  2. `vwStudent/profile.handlebars` (Line 99) - Course description
  3. `vwStudent/my-courses.handlebars` (Line 19) - Course description
  4. `vwInstructorPublic/profile.handlebars` (Line 28) - Instructor bio
  5. `vwInstructor/manage-course.handlebars` (Line 285) - Course description

**Code Evidence:**
```handlebars
<!-- vwLearn/watch.handlebars:101 -->
{{{currentLesson.content}}}
<!-- ❌ Triple braces = unescaped HTML rendering -->

<!-- vwStudent/profile.handlebars:99 -->
<div class="text-muted small mb-2">{{{short_description}}}</div>
<!-- ❌ User-controlled data rendered unescaped -->

<!-- vwInstructor/profile.handlebars:28 -->
<div class="bio-content">{{{instructor.bio}}}</div>
<!-- ❌ Instructor bio rendered without sanitization -->
```

#### Why It's Vulnerable:
- **Root Cause 1:** Triple braces `{{{` in Handlebars skip escaping
- **Root Cause 2:** No HTML sanitization before storage
- **Root Cause 3:** No Content Security Policy (CSP) headers
- **Root Cause 4:** Rich text editors (Quill) store unfiltered HTML

#### Impact:
- 🔴 Session hijacking (cookie theft)
- 🔴 Account takeover
- 🔴 Malware distribution
- 🔴 Defacement
- 🔴 Credential harvesting

#### Countermeasure:
```javascript
// Solution 1: Use DOMPurify to sanitize HTML
import DOMPurify from 'dompurify';

// In Handlebars helper (app.js)
app.engine('handlebars', engine({
    helpers: {
        sanitize(html) {
            return DOMPurify.sanitize(html);
        },
        // OR use native escaping
        escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }
    }
}));

// In template - double braces (safe)
<div class="content">{{ sanitize(courseContent) }}</div>

// Solution 2: Content Security Policy
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " + // Restrict scripts
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "iframe-src 'none'; " + // Block iframes
        "object-src 'none'");
    next();
});

// Solution 3: Rich text editor sanitization
const sanitizeRichText = (htmlContent) => {
    const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'];
    return DOMPurify.sanitize(htmlContent, { 
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: []
    });
};
```

### Vulnerability #2b: Unescaped User Input in Admin Views

#### PoC (Proof of Concept):
```javascript
// In admin contact list
// admin-contact.route.js returns:
const contact = await ContactModel.findById(req.params.id);
res.json(contact); // { name: "<img src=x onerror='alert(1)'>", email: "...", message: "..." }

// In browser console
fetch('/admin/contact/123').then(r => r.json()).then(data => {
    // Data displayed in template without escaping
    document.innerHTML = `
        <div>Name: ${data.name}</div>
        <div>Email: ${data.email}</div>
        <div>Message: ${data.message}</div>
    `;
    // ❌ XSS vulnerability if contact name contains <script>
});
```

#### Vulnerability Details:
- **Location:** Admin contact management
- **File:** routes/admin-contact.route.js, routes/contact.route.js
- **Issue:** Contact form doesn't sanitize input

**Code Evidence:**
```javascript
// routes/contact.route.js (Line 11-20)
router.post('/', async (req, res) => {
    const { name, email, message } = req.body;
    // ❌ NO SANITIZATION of input
    await contactModel.add({ name, email, message });
    res.render('contact', { success: true, name, email });
    // ❌ Renders unsanitized name and email back to user
});
```

#### Why It's Vulnerable:
- **Root Cause 1:** No input sanitization before storing
- **Root Cause 2:** No output escaping when rendering
- **Root Cause 3:** Direct use of user input in res.render()

#### Impact:
- 🔴 XSS attacks via contact form
- 🔴 Admin session hijacking
- 🔴 Data theft from admin interface

#### Countermeasure:
```javascript
// Solution: Sanitize on input and escape on output
import DOMPurify from 'dompurify';
import validator from 'validator';

router.post('/', async (req, res) => {
    let { name, email, message } = req.body;
    
    // ✅ STEP 1: Validate input
    if (!validator.isLength(name, { min: 1, max: 255 })) {
        return res.status(400).render('contact', { error: 'Invalid name' });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).render('contact', { error: 'Invalid email' });
    }
    if (!validator.isLength(message, { min: 1, max: 5000 })) {
        return res.status(400).render('contact', { error: 'Invalid message' });
    }
    
    // ✅ STEP 2: Escape before storing (optional, escape on output instead)
    const sanitized = {
        name: DOMPurify.sanitize(name.trim(), { ALLOWED_TAGS: [] }),
        email: email.trim(),
        message: DOMPurify.sanitize(message.trim(), { ALLOWED_TAGS: [] })
    };
    
    // ✅ STEP 3: Store and render with double braces (auto-escaped)
    await contactModel.add(sanitized);
    res.render('contact', { 
        success: true, 
        name: sanitized.name,  // Will be escaped in template
        email: sanitized.email 
    });
});

// In template (automatic escaping with double braces)
<div>Thank you {{ name }}, we received your message</div>
```

---

## 3. SQL INJECTION

### Vulnerability #3a: LIKE Pattern Injection in Message Search

#### PoC (Proof of Concept):
```javascript
// Attacker crafts malicious search term to bypass search logic
const maliciousSearch = {
    // Attack 1: Wildcard bypass - search for everything
    searchTerm: "%",
    // Query executed: messages::text ILIKE '%%'
    // Result: Returns ALL messages in conversation (information disclosure)
    
    // Attack 2: Underscore wildcard - match any single character
    searchTerm: "____",
    // Query executed: messages::text ILIKE '%____%'
    // Result: Matches ANY 4-character sequence
    
    // Attack 3: Combine with SQL injection attempt
    searchTerm: "%' OR 1=1--",
    // Query executed: messages::text ILIKE '%%' OR 1=1--%'
    // Result: Potential SQL injection (mitigated by parameterization but bypasses search logic)
};

// Exploitation example
fetch('/chat/search', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        conversationId: 123,
        searchTerm: "%"  // Returns all messages
    })
});
```

**Attack Flow:**
1. User opens chat search feature
2. Attacker enters wildcard characters (`%` or `_`)
3. Search query includes unescaped wildcards
4. Database returns unintended results
5. Information disclosure: attacker sees all messages

#### Vulnerability Details:
- **Location:** models/message.model.js (Line 162)
- **Function:** `searchMessages(conversationId, searchTerm)`
- **Issue:** Template string interpolation in LIKE pattern without escaping special characters

**Code Evidence:**
```javascript
// models/message.model.js (Lines 150-175)
async searchMessages(conversationId, searchTerm) {
    const messageStorage = await db('message_storage')
        .where('conversation_id', conversationId)
        .first();

    if (!messageStorage || !messageStorage.messages) {
        return [];
    }

    // Use JSONB query to search in message content
    const results = await db('message_storage')
        .where('conversation_id', conversationId)
        .whereRaw("messages::text ILIKE ?", [`%${searchTerm}%`])  // ❌ VULNERABLE HERE
        .first();
    // ❌ Template string creates pattern BEFORE parameterization
    // ❌ Special characters %, _ not escaped
    // ❌ Wildcards interpreted by PostgreSQL ILIKE operator

    if (!results || !results.messages) {
        return [];
    }

    const filteredMessages = results.messages.filter(message => 
        message.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filteredMessages;
}
```

#### Why It's Vulnerable:
- **Root Cause 1:** Template string interpolation creates LIKE pattern before parameter binding
- **Root Cause 2:** No escaping of PostgreSQL wildcard characters (`%`, `_`, `\`)
- **Root Cause 3:** Parameterized query cannot escape wildcards (they're valid SQL syntax)
- **Root Cause 4:** ILIKE operator interprets `%` as "match any characters" and `_` as "match single character"

#### Impact:
- 🔴 **Search bypass:** Attacker can return all messages regardless of content
- 🔴 **Information disclosure:** Unauthorized access to conversation data
- 🔴 **Privacy violation:** Bypassing search filtering logic
- ⚠️ **Pattern abuse:** Cannot search for literal `%` or `_` characters

#### Countermeasure:
```javascript
// Solution 1: Escape special LIKE characters before pattern creation
async searchMessages(conversationId, searchTerm) {
    const messageStorage = await db('message_storage')
        .where('conversation_id', conversationId)
        .first();

    if (!messageStorage || !messageStorage.messages) {
        return [];
    }

    // ✅ STEP 1: Escape PostgreSQL LIKE wildcards (%, _, \)
    const escapedTerm = searchTerm.replace(/[%_\\]/g, '\\$&');
    // Examples:
    //   "test%" → "test\%"
    //   "user_" → "user\_"
    //   "path\file" → "path\\file"
    
    // ✅ STEP 2: Create LIKE pattern with escaped term
    const results = await db('message_storage')
        .where('conversation_id', conversationId)
        .whereRaw("messages::text ILIKE ?", [`%${escapedTerm}%`])
        .first();

    if (!results || !results.messages) {
        return [];
    }

    // ✅ STEP 3: Filter in application layer (unchanged)
    const filteredMessages = results.messages.filter(message => 
        message.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filteredMessages;
}

// Solution 2: Create reusable utility function
// In utils/db.js
export function escapeLikePattern(str) {
    // Escape PostgreSQL LIKE special characters: %, _, \
    return String(str).replace(/[%_\\]/g, '\\$&');
}

// Usage in models
import { escapeLikePattern } from '../utils/db.js';

async searchMessages(conversationId, searchTerm) {
    // ... previous code ...
    const escapedTerm = escapeLikePattern(searchTerm);
    const results = await db('message_storage')
        .where('conversation_id', conversationId)
        .whereRaw("messages::text ILIKE ?", [`%${escapedTerm}%`])
        .first();
    // ... rest of code ...
}
```

---

### Vulnerability #3b: LIKE Pattern Injection in User Email Search

#### PoC (Proof of Concept):
```javascript
// Attack: Admin searches for specific email pattern
// Attacker crafts search to expose all emails from a domain

const maliciousFilters = {
    // Attack 1: Search all Gmail users
    emailQuery: "%@gmail.com",
    // Query executed: WHERE email ILIKE '%%@gmail.com%'
    // Result: Returns ALL Gmail users (not literal "%@gmail.com")
    
    // Attack 2: Single character wildcard
    emailQuery: "admin_",
    // Query executed: WHERE email ILIKE '%admin_%'
    // Result: Matches "admin1", "admina", "admin@", etc.
    
    // Attack 3: Data enumeration
    emailQuery: "____@test.com",
    // Result: Finds all 4-character usernames at test.com
};

// Admin panel search exploitation
// GET /admin/accounts?emailQuery=%@gmail.com
// Returns all Gmail accounts instead of searching for literal string
```

**Attack Flow:**
1. Admin/authorized user accesses user management
2. Attacker enters wildcard pattern in email search
3. Search returns broader results than intended
4. Information disclosure: enumeration of user emails by pattern

#### Vulnerability Details:
- **Location:** models/user.model.js (Line 88)
- **Function:** `findAllFiltered(filters)`
- **Issue:** LIKE pattern created with unescaped user input

**Code Evidence:**
```javascript
// models/user.model.js (Lines 85-91)
export function findAllFiltered(filters = {}) {
    let q = db(TABLE_NAME).select('*');
    
    // ... other filters ...
    
    // Partial email search (case-insensitive)
    if (filters.emailQuery) {
        const like = `%${filters.emailQuery}%`;  // ❌ VULNERABLE HERE
        // Use ILIKE for Postgres (case-insensitive)
        q = q.where('email', 'ilike', like);
        // ❌ Special characters %, _ act as wildcards
        // ❌ Cannot search for literal "%" or "_" in email addresses
    }
    
    q = q.orderBy('user_id', 'asc');
    
    if (filters.limit) q = q.limit(filters.limit);
    if (filters.offset) q = q.offset(filters.offset);
    
    return q;
}
```

#### Why It's Vulnerable:
- **Root Cause 1:** Template string creates LIKE pattern without escaping wildcards
- **Root Cause 2:** PostgreSQL ILIKE treats `%` and `_` as special characters
- **Root Cause 3:** Knex query builder escapes string values but preserves wildcards (by design)
- **Root Cause 4:** No validation or sanitization of `emailQuery` parameter

#### Impact:
- 🟡 **Search bypass:** Broader results than admin intended
- 🟡 **Information disclosure:** Enumerate users by email pattern
- 🟡 **Privacy concern:** Cannot search for literal special characters
- ⚠️ **User enumeration:** Discover email addresses matching patterns

#### Countermeasure:
```javascript
// Solution: Escape LIKE wildcards before pattern creation
export function findAllFiltered(filters = {}) {
    let q = db(TABLE_NAME).select('*');
    
    // ... other filters ...
    
    // Partial email search (case-insensitive)
    if (filters.emailQuery) {
        // ✅ STEP 1: Escape special LIKE characters
        const escapedQuery = filters.emailQuery.replace(/[%_\\]/g, '\\$&');
        const like = `%${escapedQuery}%`;
        // ✅ STEP 2: Use escaped pattern
        q = q.where('email', 'ilike', like);
    }
    
    q = q.orderBy('user_id', 'asc');
    
    if (filters.limit) q = q.limit(filters.limit);
    if (filters.offset) q = q.offset(filters.offset);
    
    return q;
}
```

---

### Vulnerability #3c: LIKE Pattern Injection in Email Count

#### PoC (Proof of Concept):
```javascript
// Same attack as #3b but affects count() queries
// Admin checks "How many users with Gmail?"

const filters = {
    emailQuery: "%@gmail.com"
};

// Query: SELECT COUNT(*) WHERE email ILIKE '%%@gmail.com%'
// Expected: Count of literal "%@gmail.com" emails (probably 0)
// Actual: Count of ALL Gmail users (information leak)

// Impact: Incorrect statistics, data enumeration
```

**Attack Flow:**
1. Admin uses count feature to check email patterns
2. Wildcard injection returns inflated/incorrect counts
3. Information disclosure through statistical queries

#### Vulnerability Details:
- **Location:** models/user.model.js (Line 132)
- **Function:** `countAllFiltered(filters)`
- **Issue:** Same as #3b but in count operation

**Code Evidence:**
```javascript
// models/user.model.js (Lines 130-139)
export function countAllFiltered(filters = {}) {
    let q = db(TABLE_NAME);
    
    // ... other filters ...
    
    // Partial email search for count as well
    if (filters.emailQuery) {
        const like = `%${filters.emailQuery}%`;  // ❌ VULNERABLE HERE
        q = q.where('email', 'ilike', like);
        // ❌ Same wildcard issue as #3b
    }
    
    return q.count('user_id as total')
        .first()
        .then(r => parseInt(r.total || 0));
}
```

#### Why It's Vulnerable:
- **Root Cause 1:** Identical to #3b - no wildcard escaping
- **Root Cause 2:** Affects COUNT queries instead of SELECT
- **Root Cause 3:** Leads to incorrect statistical data

#### Impact:
- 🟡 **Incorrect statistics:** Wrong user counts displayed
- 🟡 **Information disclosure:** Enumerate users by counting patterns
- 🟡 **Data integrity:** Reports show inflated numbers

#### Countermeasure:
```javascript
// Solution: Same escaping as #3b
export function countAllFiltered(filters = {}) {
    let q = db(TABLE_NAME);
    
    // ... other filters ...
    
    // Partial email search for count as well
    if (filters.emailQuery) {
        // ✅ Escape special LIKE characters
        const escapedQuery = filters.emailQuery.replace(/[%_\\]/g, '\\$&');
        const like = `%${escapedQuery}%`;
        q = q.where('email', 'ilike', like);
    }
    
    return q.count('user_id as total')
        .first()
        .then(r => parseInt(r.total || 0));
}
```

---

### Vulnerability #3d: LIKE Pattern Injection in Course Search

#### PoC (Proof of Concept):
```javascript
// User searches for courses with wildcard pattern

const searchQuery = {
    // Attack 1: Broad search with wildcard
    q: "%",
    // Result: Returns all approved courses (not courses with "%" in title)
    
    // Attack 2: Pattern matching
    q: "Python___",
    // Result: Matches "Python 101", "Python Pro", "Python xyz"
};

// GET /courses/search?q=%
// Expected: Find courses with literal "%" character
// Actual: Returns ALL courses (wildcard bypass)
```

**Attack Flow:**
1. User enters search query on course search page
2. Backend splits query into tokens
3. Each token used in ILIKE pattern without escaping
4. Wildcards cause broader match than intended

#### Vulnerability Details:
- **Location:** models/courses.model.js (Line 197)
- **Function:** `search(keyword, categoryId, sortBy, order, page, limit)`
- **Issue:** Token used in ILIKE without wildcard escaping

**Code Evidence:**
```javascript
// models/courses.model.js (Lines 195-198)
for (const token of tokens) {
    let query = db(TABLE_NAME)
        .leftJoin('categories', 'courses.category_id', 'categories.category_id')
        .leftJoin('users', 'courses.instructor_id', 'users.user_id')
        .select('courses.*', 'categories.name as category_name', 'users.full_name as instructor_name')
        .where('courses.status', 'approved');

    // FTS or ILIKE for each token
    query = query.where(function () {
        this.whereRaw(`fts_document @@ plainto_tsquery('simple', unaccent(?))`, [token])
            .orWhereRaw(`unaccent(lower(courses.title)) ILIKE unaccent(lower(?))`, [`%${token}%`]);  // ⚠️ VULNERABLE
        // ❌ Token contains wildcards, pattern too broad
    });
```

#### Why It's Vulnerable:
- **Root Cause 1:** Same template string interpolation issue as #3a-#3c
- **Root Cause 2:** Token from user search can contain wildcards
- **Root Cause 3:** However, less severe due to `plainto_tsquery()` sanitization
- **Root Cause 4:** FTS search provides fallback protection

#### Impact:
- 🟢 **Low severity:** Mitigated by FTS (Full-Text Search) fallback
- 🟡 **Potential bypass:** ILIKE clause can be exploited if FTS fails
- ⚠️ **Pattern abuse:** Broader matches than user intended

#### Countermeasure:
```javascript
// Solution: Escape token for ILIKE pattern (optional but recommended)
for (const token of tokens) {
    let query = db(TABLE_NAME)
        .leftJoin('categories', 'courses.category_id', 'categories.category_id')
        .leftJoin('users', 'courses.instructor_id', 'users.user_id')
        .select('courses.*', 'categories.name as category_name', 'users.full_name as instructor_name')
        .where('courses.status', 'approved');

    // ✅ Escape wildcards for ILIKE pattern
    const escapedToken = token.replace(/[%_\\]/g, '\\$&');
    
    query = query.where(function () {
        this.whereRaw(`fts_document @@ plainto_tsquery('simple', unaccent(?))`, [token])
            .orWhereRaw(`unaccent(lower(courses.title)) ILIKE unaccent(lower(?))`, [`%${escapedToken}%`]);
    });
    
    // ... rest of query ...
}
```

---

### Summary: SQL Injection Vulnerabilities

| # | Location | Function | Severity | Impact |
|---|----------|----------|----------|--------|
| 3a | models/message.model.js:162 | `searchMessages()` | 🔴 HIGH | Wildcard injection in message search |
| 3b | models/user.model.js:88 | `findAllFiltered()` | 🟡 MEDIUM | Wildcard injection in email search |
| 3c | models/user.model.js:132 | `countAllFiltered()` | 🟡 MEDIUM | Wildcard injection in email count |
| 3d | models/courses.model.js:197 | `search()` | 🟢 LOW | Wildcard injection (mitigated by FTS) |

---

### General SQL Injection Countermeasures

#### 1. Create Utility Function for LIKE Escaping
```javascript
// utils/db.js
/**
 * Escape special characters in PostgreSQL LIKE/ILIKE patterns
 * @param {string} str - User input to escape
 * @returns {string} - Escaped string safe for LIKE patterns
 */
export function escapeLikePattern(str) {
    // Escape PostgreSQL LIKE special characters: %, _, \
    return String(str).replace(/[%_\\]/g, '\\$&');
}

// Example usage:
// Input: "test%"    → Output: "test\\%"
// Input: "user_"    → Output: "user\\_"
// Input: "path\\file" → Output: "path\\\\file"
```

#### 2. Apply to All LIKE/ILIKE Queries
```javascript
import { escapeLikePattern } from '../utils/db.js';

// ✅ Correct usage in search functions
async function searchByEmail(emailQuery) {
    const escaped = escapeLikePattern(emailQuery);
    const like = `%${escaped}%`;
    return db('users').where('email', 'ilike', like);
}

// ✅ Correct usage in whereRaw
async function searchMessages(searchTerm) {
    const escaped = escapeLikePattern(searchTerm);
    return db('messages')
        .whereRaw('content ILIKE ?', [`%${escaped}%`]);
}
```

#### 3. Add Test Cases for Wildcard Protection
```javascript
// tests/security/sql-injection.test.js
describe('SQL Injection Protection - LIKE Patterns', () => {
    it('should escape % in search term', async () => {
        const result = await searchMessages(1, '100%');
        // Must find exact "100%" not "100" followed by any characters
        expect(result).toHaveLength(1);
        expect(result[0].content).toContain('100%');
    });
    
    it('should escape _ in search term', async () => {
        const result = await searchMessages(1, 'test_user');
        // Must find exact "test_user" not "test" + any single character + "user"
        expect(result.every(m => m.content.includes('test_user'))).toBe(true);
    });
    
    it('should handle backslash in search', async () => {
        const result = await searchMessages(1, 'path\\file');
        // Must handle literal backslash
        expect(result[0].content).toContain('path\\file');
    });
    
    it('should prevent wildcard injection in email search', async () => {
        const filters = { emailQuery: '%@gmail.com' };
        const result = await findAllFiltered(filters);
        // Should search for literal "%@gmail.com" not all Gmail addresses
        expect(result.every(u => u.email === '%@gmail.com')).toBe(true);
    });
});
```

#### 4. Review All LIKE/ILIKE Usage
```bash
# Audit commands to find potential vulnerabilities
grep -rn "ILIKE\|LIKE" models/
grep -rn "\.where.*ilike\|\.where.*like" models/
grep -rn "\`%\${" models/
grep -rn "whereRaw.*ILIKE\|whereRaw.*LIKE" models/
```

#### 5. Best Practices
- ✅ **Always escape user input** in LIKE patterns
- ✅ **Use parameterized queries** with Knex query builder
- ✅ **Prefer Full-Text Search** over LIKE for text search when possible
- ✅ **Validate and sanitize** all user input before database operations
- ✅ **Test with malicious input** (fuzz testing with wildcards)
- ❌ **Never concatenate** user input directly into SQL strings
- ❌ **Never trust** client-side validation alone

---

## 4. FILE UPLOAD VULNERABILITIES

### Vulnerability #4: Insufficient File Upload Validation

#### PoC (Proof of Concept):
```javascript
// Attack 1: Double extension bypass
// Upload file named: malicious.php.mp4
// Server validates extension: .mp4 ✓
// Web server executes as PHP due to default config

// Attack 2: MIME type spoofing
// Modify file metadata to claim video/mp4
// Upload actual .exe or .sh file
// Server accepts based on MIME type only

// Attack 3: Path traversal via filename
// Filename: "../../../etc/passwd"
// File saved to: static/videos/../../../etc/passwd
// = /etc/passwd (file system overwrite)

// Attack 4: Zip bomb (resource exhaustion)
// Upload 5MB file that decompresses to 5GB
// Server disk exhausted, DoS

// Attack 5: Symlink attack
// Upload symlink pointing to /etc/shadow
// Server serves sensitive system files
```

#### Vulnerability Details:
- **Location:** routes/instructor-dashboard.route.js (Lines 440-490)
- **Upload Endpoint:** `POST /instructor/api/upload/video`
- **Directory:** `/static/videos/`

**Code Evidence:**
```javascript
// routes/instructor-dashboard.route.js:445-475
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, videosDir); // ✓ Fixed directory
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_');
        const ts = Date.now();
        const rand = Math.random().toString(36).slice(2, 8);
        cb(null, `${base}_${ts}_${rand}${ext}`);
        // ✓ Randomized filename
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB - ⚠️ VERY LARGE
    fileFilter: function (req, file, cb) {
        const mimetypeOk = allowedMime.has(file.mimetype);
        const ext = path.extname(file.originalname).toLowerCase();
        const extOk = ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
        // ⚠️ ISSUE 1: Only validates MIME type and extension
        if (mimetypeOk && extOk) return cb(null, true);
        cb(new Error('Invalid file type'));
    }
});

// ⚠️ ISSUE 2: No file signature/magic bytes verification
// ⚠️ ISSUE 3: 500MB limit allows resource exhaustion
// ⚠️ ISSUE 4: No scanning for malware
// ⚠️ ISSUE 5: No access control check (any instructor can upload)
router.post('/api/upload/video', (req, res) => {
    // ❌ Missing authentication check
    upload.single('video')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // ❌ NO VIRUS SCANNING
        // ❌ NO FILE SIGNATURE VERIFICATION
        const url = `/videos/${req.file.filename}`;
        return res.json({ url });
    });
});
```

#### Why It's Vulnerable:
- **Issue 1:** Only validates MIME type (can be spoofed)
- **Issue 2:** Doesn't verify file magic bytes/signatures
- **Issue 3:** 500MB limit allows DoS attacks
- **Issue 4:** No malware scanning
- **Issue 5:** Missing authentication check (isInstructor middleware)
- **Issue 6:** Files served directly from /static (could be executed)

#### Impact:
- 🔴 Arbitrary file upload
- 🔴 Remote code execution (RCE)
- 🔴 Server compromise
- 🔴 Denial of Service (disk exhaustion)
- 🔴 Malware distribution

#### Countermeasure:
```javascript
// Solution 1: Add file signature verification
import fileType from 'file-type';

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // ✅ Reduce to 100MB
    fileFilter: async (req, file, cb) => {
        // ✅ Check MIME type
        const mimetypeOk = allowedMime.has(file.mimetype);
        const ext = path.extname(file.originalname).toLowerCase();
        const extOk = ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
        
        // ✅ Reject if extension/MIME invalid
        if (!mimetypeOk || !extOk) {
            return cb(new Error('Invalid file type'));
        }
        
        // ✅ Additional: Verify file signature (magic bytes)
        try {
            const type = await fileType.fromBuffer(file.buffer);
            const validMimes = ['video/mp4', 'video/quicktime', 'video/webm'];
            if (!type || !validMimes.includes(type.mime)) {
                return cb(new Error('File signature does not match video format'));
            }
        } catch (err) {
            return cb(new Error('Cannot verify file type'));
        }
        
        cb(null, true);
    }
});

// Solution 2: Add virus scanning (ClamAV integration)
import NodeClam from 'clamscan';

const clamscan = new NodeClam().init({
    clamdscan: {
        host: process.env.CLAMAV_HOST || 'localhost',
        port: process.env.CLAMAV_PORT || 3310
    }
});

router.post('/api/upload/video', isInstructor, async (req, res) => {
    upload.single('video')(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No file' });
        
        // ✅ Scan for malware
        try {
            const { isInfected, viruses } = await clamscan.scanFile(req.file.path);
            if (isInfected) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: 'File contains malware', viruses });
            }
        } catch (err) {
            fs.unlinkSync(req.file.path);
            logger.error('Malware scan failed:', err);
            return res.status(500).json({ error: 'Security scan failed' });
        }
        
        const url = `/videos/${req.file.filename}`;
        res.json({ url });
    });
});

// Solution 3: Serve files through express (not direct filesystem)
// Instead of: app.use(express.static('static'))
// Use:
app.get('/videos/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // ✅ Validate filename (only alphanumeric, _, -, .)
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filepath = path.join(videosDir, filename);
    
    // ✅ Verify file exists and is within videosDir
    if (!filepath.startsWith(videosDir)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    // ✅ Send as attachment (not inline/executable)
    res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-Type', 'video/mp4');
    res.sendFile(filepath);
});
```

### Vulnerability #5: Race Condition in File Validation

#### PoC (Proof of Concept):
```javascript
// Attack: Time-of-check-time-of-use (TOCTTOU)
// 1. Send valid .mp4 file to /api/upload/video
// 2. While validation is running, replace file with .php script
// 3. Validation passes (checked old file)
// 4. PHP script is uploaded and executed

// Timing window exists between:
// - fileFilter validation (checks file)
// - multer.single() storage (saves file)
```

#### Why It's Vulnerable:
- Validation and storage happen asynchronously
- Window between validation and file save
- Race condition possible in high-concurrency scenarios

#### Countermeasure:
- Use `buffer` storage instead of disk storage during validation
- Only write to disk after full validation passes
- Use atomic file operations

---

## 5. DIRECTORY TRAVERSAL

### Vulnerability #6: Path Traversal in Video Upload Filename

#### PoC (Proof of Concept):
```javascript
// Attacker crafts request with traversal payload
const formData = new FormData();
const maliciousFilename = "../../../etc/passwd";
const blob = new Blob(["test content"], { type: "video/mp4" });
formData.append('video', blob, maliciousFilename);

// POST to /instructor/api/upload/video
// Server may save to: static/videos/../../../etc/passwd
// = /etc/passwd (file system traversal)

// OR with encoded payload
// Filename: "..%2F..%2F..%2Fetc%2Fpasswd"
// Server decodes to: ../../etc/passwd
// Result: Directory traversal attack
```

#### Vulnerability Details:
- **Location:** routes/instructor-dashboard.route.js
- **Issue:** Uses `originalname` from user-supplied filename
- **Risk:** Path traversal via directory components

**Code Evidence:**
```javascript
// routes/instructor-dashboard.route.js:453-461
filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
        .replace(/[^a-z0-9_-]/gi, '_');
    // ✅ GOOD: Uses path.basename() to strip directory components
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    cb(null, `${base}_${ts}_${rand}${ext}`);
    // ✅ GOOD: Randomizes filename
}
```

#### Status:
- ✅ **MITIGATED:** The code uses `path.basename()` which strips directory components
- ✅ **SAFE:** Filenames are randomized and sanitized
- ✅ **PROTECTED:** Directory traversal is prevented by code design

---

## SUMMARY TABLE

| # | Category | Issue | Location | Severity | Status |
|---|----------|-------|----------|----------|--------|
| 1 | CSRF | Missing CSRF Protection | Multiple POST routes | 🔴 HIGH | ⚠️ VULNERABLE |
| 2a | XSS | Unescaped HTML (Triple Braces) | Template files | 🔴 HIGH | ⚠️ VULNERABLE |
| 2b | XSS | Unsanitized Contact Form | contact.route.js | 🔴 HIGH | ⚠️ VULNERABLE |
| 3a | SQLi | LIKE Pattern Injection | message.model.js:162 | 🔴 HIGH | ⚠️ VULNERABLE |
| 3b | SQLi | Email Search LIKE Injection | user.model.js:88 | 🟡 MEDIUM | ⚠️ VULNERABLE |
| 3c | SQLi | Email Count LIKE Injection | user.model.js:132 | 🟡 MEDIUM | ⚠️ VULNERABLE |
| 3d | SQLi | Course Search LIKE Injection | courses.model.js:197 | 🟢 LOW | ⚠️ VULNERABLE |
| 4 | File Upload | Insufficient Validation | instructor-dashboard.route.js | 🟡 MEDIUM | ⚠️ VULNERABLE |
| 5 | Directory Traversal | Path Traversal Prevention | instructor-dashboard.route.js | 🟢 LOW | ✅ MITIGATED |

---

**Report Status:** Assessment Complete - Action Required  
**Audit Date:** December 25, 2025  
**Reviewed By:** Trac Van Ngoc Phuc - 23110057, Hoang Duc Tuan - 23110069
