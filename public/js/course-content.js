(() => {
    // Initialize Quill editors and track state
    let editors = {};
    let draftState = {
        unsavedChanges: false,
        lastAutoSaveAt: null,
        autoSaveInterval: null
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
            }
        }, AUTOSAVE_DELAY);
    }

    async function saveContent() {
        const courseId = document.querySelector('[data-course-id]').dataset.courseId;
        const chapters = serializeContent();

        const response = await fetch(`/api/courses/${courseId}/content`, {
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
            const embed = getYouTubeEmbed(url);

            box.innerHTML = embed ?
                `<div class="video-preview rounded overflow-hidden">
                    <iframe src="${embed}" allowfullscreen></iframe>
                </div>` :
                `<div class="video-preview rounded d-flex align-items-center justify-content-center bg-light">
                    <span class="text-muted">No preview available</span>
                </div>`;
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
                alert('Failed to save changes. Please try again.');
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