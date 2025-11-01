(() => {
    // Initialize Quill editors and track state
    let editors = {};
    let draftState = {
        unsavedChanges: false,
        lastAutoSaveAt: null,
        autoSaveInterval: null,
        lastInvalidWarnAt: 0 // validate added: throttle invalid alerts
    };

    const AUTOSAVE_DELAY = 30000; // 30 seconds

    // Helper Functions
    function getYouTubeEmbed(raw) {
        if (!raw) return '';
        try {
            const url = new URL(raw.trim());
            const host = url.hostname.replace('www.', '');
            if (host.includes('youtube.com')) {
                const v = url.searchParams.get('v');
                if (v) return `https://www.youtube.com/embed/${v}`;
            }
            if (host === 'youtu.be') {
                const id = url.pathname.slice(1);
                if (id) return `https://www.youtube.com/embed/${id}`;
            }
            if (raw.includes('embed') || host.includes('vimeo.com')) return raw;
            return raw;
        } catch (e) {
            return raw;
        }
    }

    function isYouTube(url) {
        if (!url) return false;
        return url.includes('youtube.com') || url.includes('youtu.be');
    }

    // Extract YouTube video ID from various URL formats
    function getYouTubeId(raw) {
        if (!raw) return '';
        try {
            const url = new URL(raw.trim());
            const host = url.hostname.replace('www.', '');
            if (host.includes('youtube.com')) {
                if (url.pathname.startsWith('/embed/')) return url.pathname.split('/embed/')[1].split(/[?&#]/)[0];
                return url.searchParams.get('v') || '';
            }
            if (host === 'youtu.be') {
                return url.pathname.slice(1).split(/[?&#]/)[0];
            }
            return '';
        } catch (e) {
            // Fallback quick parse
            if (raw.includes('youtu.be/')) return raw.split('youtu.be/')[1].split(/[?&#]/)[0];
            if (raw.includes('youtube.com/embed/')) return raw.split('embed/')[1].split(/[?&#]/)[0];
            const m = raw.match(/[?&]v=([^&#]+)/);
            return m ? m[1] : '';
        }
    }

    // Lazy-load YouTube IFrame API
    let ytApiPromise = null;
    function loadYouTubeApi() {
        if (window.YT && window.YT.Player) return Promise.resolve();
        if (ytApiPromise) return ytApiPromise;
        ytApiPromise = new Promise((resolve) => {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
            const prev = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = function() {
                if (typeof prev === 'function') prev();
                resolve();
            };
        });
        return ytApiPromise;
    }

    // Try to get duration (in seconds) from a YouTube URL via IFrame API
    async function getYouTubeDurationSeconds(url) {
        const id = getYouTubeId(url);
        if (!id) return 0;
        try {
            await loadYouTubeApi();
        } catch {
            return 0;
        }
        return new Promise((resolve) => {
            const container = document.createElement('div');
            container.style.cssText = 'position:absolute;left:-9999px;width:0;height:0;overflow:hidden;';
            document.body.appendChild(container);
            let resolved = false;
            const finish = (sec) => {
                if (resolved) return;
                resolved = true;
                try { player && player.destroy && player.destroy(); } catch {}
                container.remove();
                resolve(Math.round(sec || 0));
            };

            let player = new YT.Player(container, {
                videoId: id,
                events: {
                    onReady: () => {
                        // Attempt immediate read; if 0, cue and wait briefly
                        let d = 0;
                        try { d = player.getDuration() || 0; } catch {}
                        if (d > 0) return finish(d);
                        try { player.cueVideoById(id); } catch {}
                        setTimeout(() => {
                            try { d = player.getDuration() || 0; } catch {}
                            finish(d);
                        }, 1200);
                    },
                    onError: () => finish(0)
                }
            });

            // Safety timeout
            setTimeout(() => finish(0), 6000);
        });
    }

    // For non-YouTube URLs: create a temp <video> to read metadata
    function getHtmlVideoDurationSeconds(url) {
        return new Promise((resolve) => {
            const v = document.createElement('video');
            v.preload = 'metadata';
            v.muted = true;
            const done = (sec) => {
                v.src = '';
                resolve(Math.round(sec || 0));
            };
            v.addEventListener('loadedmetadata', () => done(v.duration || 0), { once: true });
            v.addEventListener('error', () => done(0), { once: true });
            v.src = url;
        });
    }

    async function autoFillDurationIfPossible(lessonEl, url) {
        if (!lessonEl || !url) return;
        const durInput = lessonEl.querySelector('.lesson-duration');
        if (!durInput) return;
        // Don't override if user already set a positive duration
        const current = Number(durInput.value || 0);
        if (current > 0) return;
        let seconds = 0;
        try {
            if (isYouTube(url)) seconds = await getYouTubeDurationSeconds(url);
            else seconds = await getHtmlVideoDurationSeconds(url);
        } catch {
            seconds = 0;
        }
        if (Number.isFinite(seconds) && seconds > 0) {
            durInput.value = String(Math.round(seconds));
            setUnsavedChanges(true);
        }
    }

    function renderPreview(box, url) {
        if (!url) {
            box.innerHTML = `<div class="video-preview rounded d-flex align-items-center justify-content-center bg-light"><span class="text-muted">No preview available</span></div>`;
            return;
        }
        if (isYouTube(url)) {
            const embed = getYouTubeEmbed(url);
            box.innerHTML = `<div class="video-preview rounded overflow-hidden"><iframe src="${embed}" allowfullscreen></iframe></div>`;
        } else {
            box.innerHTML = `<div class="video-preview rounded overflow-hidden"><video controls style="width:100%;height:100%;object-fit:contain;"><source src="${url}"></video></div>`;
        }
    }

    function initQuillEditor(id) {
        if (editors[id]) return editors[id];

        const editor = new Quill(`#quill-${id}`, {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'script': 'sub' }, { 'script': 'super' }],
                    [{ 'size': ['small', 'normal', 'large'] }],
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['link', 'image', 'video'],
                    ['clean']
                ]
            }
        });

        editor.on('text-change', () => {
            setUnsavedChanges(true);
        });

        return editor;
    }

    function setUnsavedChanges(hasChanges) {
        draftState.unsavedChanges = hasChanges;
        const btn = document.getElementById('autoSaveBtn');
        if (btn) {
            const span = btn.querySelector('span');
            btn.classList.toggle('btn-warning', hasChanges);
            span.textContent = hasChanges ? 'Unsaved Changes' : 'Saved';
            btn.disabled = !hasChanges;
        }
    }

    function serializeContent() {
        const chapters = [];
        document.querySelectorAll('.chapter-card').forEach((chapterEl, chapterIdx) => {
            const chapter = {
                chapter_id: chapterEl.dataset.chapterId,
                order_index: chapterIdx + 1,
                title: chapterEl.querySelector('.chapter-title').value,
                lessons: []
            };

            chapterEl.querySelectorAll('.lesson-row').forEach((lessonEl, lessonIdx) => {
                const lessonId = lessonEl.dataset.lessonId;
                const editor = editors[lessonId];

                chapter.lessons.push({
                    lesson_id: lessonId.startsWith('new-') ? null : lessonId,
                    title: lessonEl.querySelector('.lesson-title').value,
                    video_url: lessonEl.querySelector('.lesson-video').value,
                    duration_seconds: parseInt(lessonEl.querySelector('.lesson-duration').value || 0),
                    is_previewable: lessonEl.querySelector('.lesson-previewable').checked,
                    order_index: lessonIdx + 1,
                    content: editor ? editor.root.innerHTML : ''
                });
            });

            chapters.push(chapter);
        });
        return chapters;
    }

    // Auto-save functionality
    function setupAutoSave() {
        if (draftState.autoSaveInterval) {
            clearInterval(draftState.autoSaveInterval);
        }

        draftState.autoSaveInterval = setInterval(async () => {
            if (!draftState.unsavedChanges) return;

            try {
                await saveContent();
                console.log('Auto-saved content at', new Date().toLocaleTimeString());
            } catch (err) {
                console.error('Auto-save failed:', err);
                // validate added: avoid spamming alerts on autosave
                const now = Date.now();
                if (now - draftState.lastInvalidWarnAt > 15000) {
                    const msg = (err && err.message) || 'Auto-save failed.';
                    if (window.Swal) {
                        Swal.fire({ icon: 'error', title: 'Auto-save failed', text: msg });
                    }
                    draftState.lastInvalidWarnAt = now;
                }
            }
        }, AUTOSAVE_DELAY);
    }

    // validate added: validation helpers before saving
    function validateSerialized(chapters) {
        const errors = [];
        // Allow empty course (no chapters) and empty chapters (no lessons)
        if (!Array.isArray(chapters)) return ['Invalid content structure.'];
        chapters.forEach((ch, cIdx) => {
            const cNum = cIdx + 1;
            const title = (ch.title || '').trim();
            if (!title) errors.push(`Chapter ${cNum}: title is required.`);
            const lessons = Array.isArray(ch.lessons) ? ch.lessons : [];
            lessons.forEach((ls, lIdx) => {
                const lNum = lIdx + 1;
                const lt = (ls.title || '').trim();
                if (!lt) errors.push(`Chapter ${cNum} - Lesson ${lNum}: title is required.`);
                const d = Number(ls.duration_seconds);
                if (!Number.isFinite(d) || d < 0 || !Number.isInteger(d)) {
                    errors.push(`Chapter ${cNum} - Lesson ${lNum}: duration must be a non-negative integer.`);
                }
            });
        });
        return errors;
    }

    function showError(title, text){
        if (window.Swal) return Swal.fire({ icon: 'error', title, html: `<div style="text-align:left">${text}</div>` });
        alert(`${title}:\n${text.replace(/<br\/>/g, '\n')}`);
    }

    async function saveContent() {
        const courseId = document.querySelector('[data-course-id]').dataset.courseId;
        const chapters = serializeContent();

        // validate added: run validation before saving
        const errs = validateSerialized(chapters);
        if (errs.length) {
            const body = errs.map(e => `• ${e}`).join('<br/>');
            showError('Cannot save content', body);
            draftState.lastInvalidWarnAt = Date.now();
            throw new Error('Validation failed, not saving');
        }

        const response = await fetch(`/instructor/api/courses/${courseId}/content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chapters })
        });

        if (!response.ok) {
            throw new Error(`Save failed: ${response.statusText}`);
        }

        setUnsavedChanges(false);
        draftState.lastAutoSaveAt = Date.now();
    }

    // Helper function to scroll to element with smooth animation
    function scrollToElement(element) {
        const offset = 100; // Extra space from top
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }

    // Create new chapter/lesson from templates
    function addChapter() {
        const template = document.getElementById('chapter-template');
        const chaptersContainer = document.getElementById('chaptersContainer');
        const chapterId = `new-${Date.now()}`;
        const chapterNumber = chaptersContainer.children.length + 1;

        const fragment = template.content.cloneNode(true);
        const chapter = fragment.querySelector('.chapter-card');
        chapter.dataset.chapterId = chapterId;

        // Update chapter number
        chapter.querySelector('.chapter-label').textContent =
            chapter.querySelector('.chapter-label').textContent.replace('__NUMBER__', chapterNumber);

        chaptersContainer.appendChild(chapter);
        wireUpChapter(chapter);
        setUnsavedChanges(true);

        // Scroll to new chapter
        scrollToElement(chapter);

        // Remove empty state if present
        const emptyState = document.querySelector('#chaptersContainer ~ div');
        if (emptyState && emptyState.textContent.includes('No Content Yet')) {
            emptyState.remove();
        }
    }

    function addLesson(chapterEl) {
        const template = document.getElementById('lesson-template');
        const lessonsList = chapterEl.querySelector('.lessons-list');
        const lessonId = `new-${Date.now()}`;
        const lessonNumber = lessonsList.children.length + 1;

        const fragment = template.content.cloneNode(true);
        const lesson = fragment.querySelector('.lesson-row');
        lesson.dataset.lessonId = lessonId;

        // Update lesson number and ID placeholders
        lesson.querySelector('.lesson-label').textContent =
            lesson.querySelector('.lesson-label').textContent.replace('__NUMBER__', lessonNumber);
        lesson.querySelector('[id^="quill-"]').id = `quill-${lessonId}`;
        // Ensure radio group name is unique per lesson
        lesson.querySelectorAll('input.video-source').forEach(r => {
            r.setAttribute('name', `video-src-${lessonId}`);
        });

        lessonsList.appendChild(lesson);
        editors[lessonId] = initQuillEditor(lessonId);
        wireUpLesson(lesson);
        setUnsavedChanges(true);

        // Scroll to new lesson
        scrollToElement(lesson);
    }

    // Wire up event handlers
    function wireUpChapter(chapterEl) {
        chapterEl.querySelector('.add-lesson').addEventListener('click', () => {
            addLesson(chapterEl);
        });

        chapterEl.querySelector('.remove-chapter').addEventListener('click', () => {
            if (confirm('Delete this chapter and all its lessons?')) {
                Object.keys(editors).forEach(id => {
                    if (chapterEl.querySelector(`#quill-${id}`)) {
                        delete editors[id];
                    }
                });
                chapterEl.remove();
                setUnsavedChanges(true);
            }
        });

        // Move chapter up/down
        chapterEl.querySelector('.move-chapter-up').addEventListener('click', () => {
            const prev = chapterEl.previousElementSibling;
            if (prev) {
                chapterEl.parentNode.insertBefore(chapterEl, prev);
                setUnsavedChanges(true);
            }
        });

        chapterEl.querySelector('.move-chapter-down').addEventListener('click', () => {
            const next = chapterEl.nextElementSibling;
            if (next) {
                chapterEl.parentNode.insertBefore(next, chapterEl);
                setUnsavedChanges(true);
            }
        });

        // Track title changes
        chapterEl.querySelector('.chapter-title').addEventListener('input', () => {
            setUnsavedChanges(true);
        });
    }

    function wireUpLesson(lessonEl) {
        // Preview video
        lessonEl.querySelector('.preview-video').addEventListener('click', () => {
            const url = lessonEl.querySelector('.lesson-video').value;
            const box = lessonEl.querySelector('.video-preview-box');
            renderPreview(box, url);
        });

        // Remove lesson
        lessonEl.querySelector('.remove-lesson').addEventListener('click', () => {
            if (confirm('Delete this lesson?')) {
                const lessonId = lessonEl.dataset.lessonId;
                if (editors[lessonId]) {
                    delete editors[lessonId];
                }
                lessonEl.remove();
                setUnsavedChanges(true);
            }
        });

        // Move lesson up/down
        lessonEl.querySelector('.move-lesson-up').addEventListener('click', () => {
            const prev = lessonEl.previousElementSibling;
            if (prev) {
                lessonEl.parentNode.insertBefore(lessonEl, prev);
                setUnsavedChanges(true);
            }
        });

        lessonEl.querySelector('.move-lesson-down').addEventListener('click', () => {
            const next = lessonEl.nextElementSibling;
            if (next) {
                lessonEl.parentNode.insertBefore(next, lessonEl);
                setUnsavedChanges(true);
            }
        });

        // Track changes
        ['input', 'change'].forEach(event => {
            lessonEl.querySelectorAll('.lesson-title, .lesson-video, .lesson-duration, .lesson-previewable')
                .forEach(el => {
                    el.addEventListener(event, () => setUnsavedChanges(true));
                });
        });

        // Video source toggle
        const youtubeGroup = lessonEl.querySelector('.youtube-input-group');
        const uploadGroup = lessonEl.querySelector('.upload-input-group');
        lessonEl.querySelectorAll('.video-source').forEach(r => {
            r.addEventListener('change', (e) => {
                if (e.target.value === 'youtube') {
                    if (youtubeGroup) youtubeGroup.style.display = 'block';
                    if (uploadGroup) uploadGroup.style.display = 'none';
                } else {
                    if (youtubeGroup) youtubeGroup.style.display = 'none';
                    if (uploadGroup) uploadGroup.style.display = 'block';
                }
            });
        });

        // Upload handling
        const fileInput = lessonEl.querySelector('.lesson-video-file');
        const progressWrap = lessonEl.querySelector('.lesson-upload-progress');
        const progressBar = progressWrap ? progressWrap.querySelector('.progress-bar') : null;
        const videoInput = lessonEl.querySelector('.lesson-video');

        async function uploadFile(file) {
            return new Promise((resolve, reject) => {
                const allowed = ['video/mp4','video/quicktime','video/x-msvideo','video/x-matroska','video/webm'];
                if (!allowed.includes(file.type)) {
                    return reject(new Error('Invalid file type. Allowed: mp4, mov, avi, mkv, webm'));
                }
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/instructor/api/upload/video');
                xhr.responseType = 'json';
                xhr.upload.onprogress = (e) => {
                    if (progressWrap && progressBar) {
                        progressWrap.style.display = 'block';
                        if (e.lengthComputable) {
                            const pct = Math.round((e.loaded / e.total) * 100);
                            progressBar.style.width = pct + '%';
                            progressBar.setAttribute('aria-valuenow', pct);
                        }
                    }
                };
                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.onload = () => {
                    if (progressWrap && progressBar) {
                        progressBar.style.width = '0%';
                        progressBar.setAttribute('aria-valuenow', '0');
                        setTimeout(() => { progressWrap.style.display = 'none'; }, 400);
                    }
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const data = xhr.response || {};
                        if (data && data.url) return resolve(data.url);
                        return reject(new Error('Invalid server response'));
                    }
                    const msg = (xhr.response && xhr.response.error) || 'Upload failed';
                    reject(new Error(msg));
                };
                const fd = new FormData();
                fd.append('video', file);
                xhr.send(fd);
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                try {
                    const url = await uploadFile(file);
                    if (videoInput) videoInput.value = url;
                    const box = lessonEl.querySelector('.video-preview-box');
                    renderPreview(box, url);
                    // Try to auto-detect duration for uploaded videos
                    autoFillDurationIfPossible(lessonEl, url);
                    setUnsavedChanges(true);
                    if (window.Swal) Swal.fire({ icon: 'success', title: 'Upload complete', text: 'The video has been uploaded.' });
                } catch (err) {
                    if (window.Swal) Swal.fire({ icon: 'error', title: 'Upload failed', text: err.message || 'Could not upload video.' });
                } finally {
                    // reset input to allow re-uploading same file if needed
                    e.target.value = '';
                }
            });
        }

        // When YouTube URL changes, try to auto-detect duration
        const urlInput = lessonEl.querySelector('.lesson-video');
        if (urlInput) {
            urlInput.addEventListener('change', () => {
                const url = urlInput.value && urlInput.value.trim();
                if (url) autoFillDurationIfPossible(lessonEl, url);
            });
            urlInput.addEventListener('blur', () => {
                const url = urlInput.value && urlInput.value.trim();
                if (url) autoFillDurationIfPossible(lessonEl, url);
            });
            // Initial attempt on load if value exists and duration is 0
            const initial = urlInput.value && urlInput.value.trim();
            const durInput = lessonEl.querySelector('.lesson-duration');
            const current = Number(durInput && durInput.value || 0);
            if (initial && (!Number.isFinite(current) || current <= 0)) {
                // Delay slightly to avoid jank during initial render
                setTimeout(() => autoFillDurationIfPossible(lessonEl, initial), 300);
            }
        }
    }

    // Initialize everything when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize existing Quill editors
        document.querySelectorAll('[id^="quill-"]').forEach(container => {
            const id = container.id.replace('quill-', '');
            editors[id] = initQuillEditor(id);
        });

        // Wire up existing chapters and lessons
        document.querySelectorAll('.chapter-card').forEach(wireUpChapter);
        document.querySelectorAll('.lesson-row').forEach(wireUpLesson);

        // Add new chapter button
        document.getElementById('addChapterBtn').addEventListener('click', addChapter);

        // Manual save button
        document.getElementById('autoSaveBtn').addEventListener('click', async () => {
            try {
                await saveContent();
                console.log('Content saved manually at', new Date().toLocaleTimeString());
            } catch (err) {
                console.error('Manual save failed:', err);
                // validate added: use SweetAlert2 if available
                if (window.Swal) {
                    Swal.fire({ icon: 'error', title: 'Save failed', text: err && err.message ? err.message : 'Failed to save changes. Please fix validation errors.' });
                } else {
                    alert('Failed to save changes. Please fix validation errors.');
                }
            }
        });

        // Set up auto-save
        setupAutoSave();

        // Prevent accidental navigation away
        window.addEventListener('beforeunload', (e) => {
            if (draftState.unsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    });
})();