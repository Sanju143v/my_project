(function () {
    'use strict';
    const LANGUAGES = [
        { code: 'en', name: 'English' }, { code: 'hi', name: 'Hindi' }, { code: 'kn', name: 'Kannada' }, { code: 'ta', name: 'Tamil' },
        { code: 'te', name: 'Telugu' }, { code: 'ml', name: 'Malayalam' }, { code: 'bn', name: 'Bengali' }, { code: 'gu', name: 'Gujarati' },
        { code: 'mr', name: 'Marathi' }, { code: 'pa', name: 'Punjabi' }, { code: 'ur', name: 'Urdu' }, { code: 'or', name: 'Odia' },
        { code: 'as', name: 'Assamese' }, { code: 'es', name: 'Spanish' }, { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' }, { code: 'pt', name: 'Portuguese' }, { code: 'ru', name: 'Russian' }, { code: 'zh', name: 'Chinese' },
        { code: 'ja', name: 'Japanese' }, { code: 'ko', name: 'Korean' }, { code: 'ar', name: 'Arabic' }, { code: 'nl', name: 'Dutch' },
        { code: 'tr', name: 'Turkish' }, { code: 'th', name: 'Thai' }, { code: 'vi', name: 'Vietnamese' }, { code: 'id', name: 'Indonesian' },
        { code: 'ms', name: 'Malay' }, { code: 'sv', name: 'Swedish' }, { code: 'no', name: 'Norwegian' }, { code: 'da', name: 'Danish' },
        { code: 'fi', name: 'Finnish' }, { code: 'pl', name: 'Polish' }, { code: 'cs', name: 'Czech' }, { code: 'el', name: 'Greek' },
        { code: 'he', name: 'Hebrew' }, { code: 'ro', name: 'Romanian' }, { code: 'hu', name: 'Hungarian' }, { code: 'uk', name: 'Ukrainian' }
    ];

    // Voice presets: pitch, rate adjustments to simulate different voices
    const VOICE_PRESETS = {
        'modi': { pitch: 0.8, rate: 0.85, voiceLang: 'hi', label: 'Narendra Modi Style' },
        'kohli': { pitch: 1.0, rate: 1.05, voiceLang: 'hi', label: 'Virat Kohli Style' },
        'deep-male': { pitch: 0.6, rate: 0.9, voiceLang: 'en', label: 'Deep Male' },
        'soft-female': { pitch: 1.4, rate: 0.95, voiceLang: 'en', label: 'Soft Female' },
        'narrator': { pitch: 0.9, rate: 0.8, voiceLang: 'en', label: 'Narrator' },
        'default': { pitch: 1.0, rate: 1.0, voiceLang: 'en', label: 'Default' }
    };

    let authToken = localStorage.getItem('vaaniverse_token');
    let userName = localStorage.getItem('vaaniverse_user');
    let currentPage = 'home';
    let isSpeaking = false;
    let audioContext = null;
    let musicNodes = [];
    let musicPlaying = false;
    let generatedMusicData = null;
    let songPlaying = false;
    let songAudioCtx = null;
    let songNodes = [];
    let selectedSinger = 'male';
    let activeVoicePreset = null; // TTS preset
    let activeTransPreset = null; // Translation preset
    let clonedVoicePitch = null;  // From uploaded voice analysis
    let transClonedPitch = null;

    // ==================== INIT ====================
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => document.getElementById('preloader').classList.add('hidden'), 1800);
        if (authToken && userName) showApp(); else showAuth();
        initAuth(); initNavigation(); initTTS(); initTranslation(); initLyrics(); initMusic(); initSong();
        initParticles(); initAboutLanguages(); initScrollAnimations();
    });

    // ==================== HELPERS ====================
    function showToast(msg, type = 'info') {
        const c = document.getElementById('toast-container');
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
        const t = document.createElement('div'); t.className = `toast ${type}`;
        t.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
        c.appendChild(t);
        setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 3500);
    }

    async function apiCall(url, method = 'GET', body = null) {
        const opts = { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` } };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(url, opts);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    }

    function populateLangSelect(id, def = 'en') {
        const s = document.getElementById(id); if (!s) return; s.innerHTML = '';
        LANGUAGES.forEach(l => { const o = document.createElement('option'); o.value = l.code; o.textContent = l.name; if (l.code === def) o.selected = true; s.appendChild(o); });
    }

    function populateVoiceSelect(selectId) {
        const sel = document.getElementById(selectId); if (!sel) return;
        const voices = speechSynthesis.getVoices(); sel.innerHTML = '';
        if (!voices.length) { const o = document.createElement('option'); o.textContent = 'Default Voice'; sel.appendChild(o); return; }
        voices.forEach((v, i) => { const o = document.createElement('option'); o.value = i; o.textContent = `${v.name} (${v.lang})`; sel.appendChild(o); });
    }

    // ==================== AUTH ====================
    function showAuth() {
        document.getElementById('auth-page').classList.add('active');
        document.getElementById('app-page').classList.remove('active');
        document.body.style.overflow = '';
        window.scrollTo(0, 0);
    }
    function showApp() {
        document.getElementById('auth-page').classList.remove('active');
        document.getElementById('app-page').classList.add('active');
        document.getElementById('nav-username').textContent = userName;
        navigateTo('home');
        window.scrollTo(0, 0);
    }

    function initAuth() {
        document.getElementById('show-signup').addEventListener('click', e => {
            e.preventDefault(); document.getElementById('login-form').classList.remove('active');
            document.getElementById('signup-form').classList.add('active'); document.getElementById('auth-error').textContent = '';
        });
        document.getElementById('show-login').addEventListener('click', e => {
            e.preventDefault(); document.getElementById('signup-form').classList.remove('active');
            document.getElementById('login-form').classList.add('active'); document.getElementById('auth-error').textContent = '';
        });

        document.getElementById('login-btn').addEventListener('click', async () => {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const err = document.getElementById('auth-error'); err.textContent = '';
            if (!email || !password) { err.textContent = 'Please fill in all fields'; return; }
            const btn = document.getElementById('login-btn'); btn.classList.add('loading');
            try {
                const data = await apiCall('/api/auth/login', 'POST', { email, password });
                authToken = data.token; userName = data.user.name;
                localStorage.setItem('vaaniverse_token', authToken); localStorage.setItem('vaaniverse_user', userName);
                showToast('Welcome back, ' + userName + '!', 'success'); showApp();
            } catch (e) { err.textContent = e.message; } finally { btn.classList.remove('loading'); }
        });

        document.getElementById('signup-btn').addEventListener('click', async () => {
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirm = document.getElementById('signup-confirm').value;
            const err = document.getElementById('auth-error'); err.textContent = '';
            if (!name || !email || !password || !confirm) { err.textContent = 'Please fill in all fields'; return; }
            if (password.length < 6) { err.textContent = 'Password must be at least 6 characters'; return; }
            if (password !== confirm) { err.textContent = 'Passwords do not match'; return; }
            const btn = document.getElementById('signup-btn'); btn.classList.add('loading');
            try {
                const data = await apiCall('/api/auth/signup', 'POST', { name, email, password });
                authToken = data.token; userName = data.user.name;
                localStorage.setItem('vaaniverse_token', authToken); localStorage.setItem('vaaniverse_user', userName);
                showToast('Account created! Welcome, ' + userName + '!', 'success'); showApp();
            } catch (e) { err.textContent = e.message; } finally { btn.classList.remove('loading'); }
        });

        ['login-email', 'login-password'].forEach(id => document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-btn').click(); }));
        ['signup-name', 'signup-email', 'signup-password', 'signup-confirm'].forEach(id => document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('signup-btn').click(); }));
    }

    // ==================== NAVIGATION ====================
    function initNavigation() {
        document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', e => { e.preventDefault(); navigateTo(l.dataset.page); }));
        document.querySelectorAll('.mobile-link').forEach(l => l.addEventListener('click', e => { e.preventDefault(); navigateTo(l.dataset.page); document.getElementById('mobile-menu').classList.remove('active'); }));
        document.getElementById('mobile-menu-btn').addEventListener('click', () => document.getElementById('mobile-menu').classList.toggle('active'));
        document.getElementById('nav-home-link').addEventListener('click', () => navigateTo('home'));
        document.getElementById('logout-btn').addEventListener('click', logout);
        document.getElementById('mobile-logout-btn').addEventListener('click', logout);
        document.getElementById('hero-explore-btn').addEventListener('click', () => navigateTo('models'));
        document.getElementById('hero-learn-btn').addEventListener('click', () => navigateTo('about'));
        document.querySelectorAll('.feature-card').forEach(c => c.addEventListener('click', () => { if (c.dataset.model) openModel(c.dataset.model); }));
        window.addEventListener('scroll', () => { document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50); });
    }

    function navigateTo(page) {
        currentPage = page;
        document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
        const sec = document.getElementById(page + '-page'); if (sec) sec.classList.add('active');
        document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
        document.querySelectorAll('.mobile-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (page === 'home') animateStats();
    }

    window.openModel = function (model) {
        if (model === 'back') { navigateTo('models'); return; }
        document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
        const sec = document.getElementById(model + '-page'); if (sec) sec.classList.add('active');
        document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === 'models'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function logout() {
        authToken = null; userName = null; localStorage.removeItem('vaaniverse_token'); localStorage.removeItem('vaaniverse_user');
        showToast('Logged out successfully', 'info'); showAuth();
        document.querySelectorAll('#auth-page input').forEach(i => i.value = '');
        document.getElementById('login-form').classList.add('active'); document.getElementById('signup-form').classList.remove('active');
    }

    function animateStats() {
        document.querySelectorAll('.stat-number').forEach(el => {
            const target = parseInt(el.dataset.count); let cur = 0; const inc = target / 50;
            const timer = setInterval(() => { cur += inc; if (cur >= target) { cur = target; clearInterval(timer); } el.textContent = Math.round(cur) + (target === 100 ? '%' : '+'); }, 30);
        });
    }

    // ==================== VOICE CLONING (Pitch Analysis) ====================
    async function analyzeVoicePitch(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const buf = await ctx.decodeAudioData(e.target.result);
                    const data = buf.getChannelData(0);
                    // Simple autocorrelation pitch detection
                    const sampleRate = buf.sampleRate;
                    const SIZE = Math.min(data.length, sampleRate); // 1 second max
                    let bestCorr = 0, bestLag = 0;
                    for (let lag = Math.floor(sampleRate / 500); lag < Math.floor(sampleRate / 60); lag++) {
                        let corr = 0;
                        for (let i = 0; i < SIZE - lag; i++) corr += data[i] * data[i + lag];
                        if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
                    }
                    const freq = bestLag > 0 ? sampleRate / bestLag : 150;
                    // Convert to pitch multiplier relative to average speaking voice (~150Hz)
                    const pitchMult = Math.max(0.5, Math.min(2.0, freq / 150));
                    ctx.close();
                    resolve(pitchMult);
                } catch (err) { resolve(1.0); }
            };
            reader.onerror = () => resolve(1.0);
            reader.readAsArrayBuffer(file);
        });
    }

    function setupFileUpload(areaId, inputId, uploadedId, nameId, removeId, cloneStatusId, pitchSetter) {
        const area = document.getElementById(areaId), inp = document.getElementById(inputId);
        const uploaded = document.getElementById(uploadedId), nameEl = document.getElementById(nameId);
        const removeBtn = document.getElementById(removeId);
        if (!area || !inp) return;
        area.addEventListener('click', () => inp.click());
        area.addEventListener('dragover', e => { e.preventDefault(); area.style.borderColor = 'var(--accent-primary)'; });
        area.addEventListener('dragleave', () => { area.style.borderColor = ''; });
        area.addEventListener('drop', e => { e.preventDefault(); area.style.borderColor = ''; if (e.dataTransfer.files.length) { inp.files = e.dataTransfer.files; handleFile(); } });
        inp.addEventListener('change', handleFile);
        if (removeBtn) removeBtn.addEventListener('click', () => { inp.value = ''; area.style.display = ''; uploaded.style.display = 'none'; if (pitchSetter) pitchSetter(null); if (cloneStatusId) document.getElementById(cloneStatusId).textContent = ''; showToast('Voice sample removed', 'info'); });

        async function handleFile() {
            if (!inp.files.length) return;
            const file = inp.files[0];
            if (file.size > 10 * 1024 * 1024) { showToast('File too large. Max 10MB', 'error'); inp.value = ''; return; }
            area.style.display = 'none'; uploaded.style.display = 'flex'; nameEl.textContent = file.name;
            showToast('Analyzing voice characteristics...', 'info');
            const pitch = await analyzeVoicePitch(file);
            if (pitchSetter) pitchSetter(pitch);
            if (cloneStatusId) {
                document.getElementById(cloneStatusId).textContent = `✓ Voice analyzed — Pitch factor: ${pitch.toFixed(2)}x (will be applied to speech)`;
            }
            showToast('Voice analyzed! Pitch characteristics will be applied to generated speech.', 'success');
        }
    }

    // ==================== SPEECH RECOGNITION ====================
    function setupSpeechRecording(btnId, statusId, resultId, onResult) {
        const btn = document.getElementById(btnId), status = document.getElementById(statusId), result = document.getElementById(resultId);
        if (!btn) return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { btn.addEventListener('click', () => showToast('Speech recognition not supported. Use Chrome.', 'error')); return; }
        let recognition = null, isRec = false;
        btn.addEventListener('click', () => {
            if (isRec) { recognition.stop(); return; }
            recognition = new SR(); recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'en-US';
            recognition.onstart = () => { isRec = true; btn.classList.add('recording'); status.textContent = 'Listening... Click to stop'; };
            recognition.onresult = (ev) => { let t = ''; for (let i = ev.resultIndex; i < ev.results.length; i++)t += ev.results[i][0].transcript; result.textContent = t; result.classList.add('has-content'); if (onResult && ev.results[ev.results.length - 1].isFinal) onResult(t); };
            recognition.onerror = (ev) => { isRec = false; btn.classList.remove('recording'); status.textContent = 'Click to start recording'; if (ev.error !== 'no-speech') showToast('Recognition error: ' + ev.error, 'error'); };
            recognition.onend = () => { isRec = false; btn.classList.remove('recording'); status.textContent = 'Click to start recording'; };
            recognition.start();
        });
    }

    function setupTabs(prefix) {
        document.querySelectorAll(`[data-tab^="${prefix}-"]`).forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab + '-tab';
                const parent = tab.closest('.model-workspace') || tab.closest('.app-section');
                tab.parentElement.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                if (parent) parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const target = document.getElementById(targetId); if (target) target.classList.add('active');
            });
        });
    }

    // ==================== SPEAK with preset/clone support ====================
    function speakWithSettings(text, opts = {}) {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const voices = speechSynthesis.getVoices();

        // Apply preset if set
        const preset = opts.preset ? VOICE_PRESETS[opts.preset] : null;
        let pitch = opts.pitch || (preset ? preset.pitch : 1.0);
        let rate = opts.rate || (preset ? preset.rate : 1.0);

        // Apply cloned voice pitch override
        if (opts.clonedPitch) {
            pitch = opts.clonedPitch;
        }

        // Select voice
        if (opts.voiceIndex !== undefined && voices[opts.voiceIndex]) {
            u.voice = voices[opts.voiceIndex];
        } else if (preset && preset.voiceLang) {
            const match = voices.find(v => v.lang.startsWith(preset.voiceLang));
            if (match) u.voice = match;
        }
        if (opts.lang) {
            u.lang = opts.lang;
            const match = voices.find(v => v.lang.startsWith(opts.lang));
            if (match && !opts.voiceIndex) u.voice = match;
        }

        u.pitch = pitch;
        u.rate = rate;
        u.onstart = () => { if (opts.onStart) opts.onStart(); };
        u.onend = () => { if (opts.onEnd) opts.onEnd(); };
        u.onerror = () => { if (opts.onEnd) opts.onEnd(); };
        speechSynthesis.speak(u);
    }

    // ==================== TTS ====================
    function initTTS() {
        setupTabs('tts');
        const loadVoices = () => populateVoiceSelect('tts-voice-select');
        speechSynthesis.onvoiceschanged = () => { loadVoices(); populateVoiceSelect('trans-voice-select'); };
        loadVoices();

        document.getElementById('tts-speed').addEventListener('input', e => document.getElementById('tts-speed-val').textContent = parseFloat(e.target.value).toFixed(1) + 'x');
        document.getElementById('tts-pitch').addEventListener('input', e => document.getElementById('tts-pitch-val').textContent = parseFloat(e.target.value).toFixed(1) + 'x');

        // Voice presets
        document.querySelectorAll('.voice-preset-tag:not(.trans-preset)').forEach(tag => {
            tag.addEventListener('click', () => {
                document.querySelectorAll('.voice-preset-tag:not(.trans-preset)').forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                activeVoicePreset = tag.dataset.preset;
                const p = VOICE_PRESETS[activeVoicePreset];
                if (p) {
                    document.getElementById('tts-pitch').value = p.pitch;
                    document.getElementById('tts-pitch-val').textContent = p.pitch.toFixed(1) + 'x';
                    document.getElementById('tts-speed').value = p.rate;
                    document.getElementById('tts-speed-val').textContent = p.rate.toFixed(1) + 'x';
                    showToast(`Voice preset: ${p.label} applied`, 'success');
                }
            });
        });

        // Voice cloning upload
        setupFileUpload('tts-voice-upload', 'tts-voice-file', 'tts-uploaded-voice', 'tts-voice-filename', 'tts-remove-voice', 'tts-clone-status', (p) => { clonedVoicePitch = p; });

        setupSpeechRecording('tts-record-btn', 'tts-record-status', 'tts-speech-result', t => { document.getElementById('tts-input-text').value = t; });

        document.getElementById('tts-generate-btn').addEventListener('click', () => {
            let text = document.getElementById('tts-input-text').value.trim() || document.getElementById('tts-speech-result').textContent.trim();
            if (!text) { showToast('Please enter or record text', 'error'); return; }
            const voiceIdx = document.getElementById('tts-voice-select').value;
            speakWithSettings(text, {
                voiceIndex: parseInt(voiceIdx),
                pitch: clonedVoicePitch || parseFloat(document.getElementById('tts-pitch').value),
                rate: parseFloat(document.getElementById('tts-speed').value),
                clonedPitch: clonedVoicePitch,
                preset: clonedVoicePitch ? null : activeVoicePreset,
                onStart: () => { document.getElementById('tts-output').style.display = 'block'; animateWave('tts-audio-wave', true); },
                onEnd: () => animateWave('tts-audio-wave', false)
            });
            showToast(clonedVoicePitch ? 'Speaking with your cloned voice characteristics!' : 'Generating speech...', 'success');
        });

        document.getElementById('tts-play-btn').addEventListener('click', () => document.getElementById('tts-generate-btn').click());
        document.getElementById('tts-stop-btn').addEventListener('click', () => { speechSynthesis.cancel(); animateWave('tts-audio-wave', false); });
    }

    function animateWave(id, active) {
        const w = document.getElementById(id); if (!w) return;
        w.style.opacity = active ? '1' : '0.3'; w.style.animation = active ? 'pulse 1s ease-in-out infinite' : 'none';
    }

    // ==================== TRANSLATION ====================
    function initTranslation() {
        setupTabs('trans');
        populateLangSelect('trans-source-lang', 'en'); populateLangSelect('trans-target-lang', 'hi');
        populateLangSelect('trans-speech-source-lang', 'en'); populateLangSelect('trans-speech-target-lang', 'kn');
        populateVoiceSelect('trans-voice-select');

        document.getElementById('trans-swap-btn').addEventListener('click', () => { const s = document.getElementById('trans-source-lang'), t = document.getElementById('trans-target-lang'); const tmp = s.value; s.value = t.value; t.value = tmp; });
        document.getElementById('trans-speech-swap-btn').addEventListener('click', () => { const s = document.getElementById('trans-speech-source-lang'), t = document.getElementById('trans-speech-target-lang'); const tmp = s.value; s.value = t.value; t.value = tmp; });

        // Translation voice presets
        document.querySelectorAll('.trans-preset').forEach(tag => {
            tag.addEventListener('click', () => {
                document.querySelectorAll('.trans-preset').forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                activeTransPreset = tag.dataset.preset;
                showToast(`Translation voice: ${VOICE_PRESETS[activeTransPreset].label}`, 'success');
            });
        });

        setupFileUpload('trans-voice-upload', 'trans-voice-file', 'trans-uploaded-voice', 'trans-voice-filename', 'trans-remove-voice', 'trans-clone-status', (p) => { transClonedPitch = p; });
        setupSpeechRecording('trans-record-btn', 'trans-record-status', 'trans-speech-result', t => { document.getElementById('trans-speech-input-text').textContent = t; });

        document.getElementById('trans-translate-btn').addEventListener('click', async () => {
            const isText = document.querySelector('#trans-text-tab.tab-content.active');
            let text, src, tgt, out;
            if (isText) { text = document.getElementById('trans-input-text').value.trim(); src = document.getElementById('trans-source-lang').value; tgt = document.getElementById('trans-target-lang').value; out = document.getElementById('trans-output-text'); }
            else { text = document.getElementById('trans-speech-input-text').textContent.trim(); src = document.getElementById('trans-speech-source-lang').value; tgt = document.getElementById('trans-speech-target-lang').value; out = document.getElementById('trans-speech-output-text'); }
            if (!text || text.includes('will appear here')) { showToast('Enter or record text to translate', 'error'); return; }
            const btn = document.getElementById('trans-translate-btn'); btn.classList.add('loading');
            try {
                const data = await apiCall('/api/translate', 'POST', { text, sourceLang: src, targetLang: tgt });
                out.textContent = data.translatedText; out.style.color = 'var(--text-primary)';
                document.getElementById('trans-speak-btn').style.display = 'inline-flex';
                showToast('Translation complete!', 'success');
            } catch (e) { showToast('Translation failed: ' + e.message, 'error'); } finally { btn.classList.remove('loading'); }
        });

        document.getElementById('trans-speak-btn').addEventListener('click', () => {
            const isText = document.querySelector('#trans-text-tab.tab-content.active');
            const text = isText ? document.getElementById('trans-output-text').textContent : document.getElementById('trans-speech-output-text').textContent;
            if (!text || text.includes('will appear')) { showToast('No translation', 'error'); return; }
            const tgt = isText ? document.getElementById('trans-target-lang').value : document.getElementById('trans-speech-target-lang').value;
            const voiceIdx = document.getElementById('trans-voice-select').value;
            speakWithSettings(text, {
                lang: tgt,
                voiceIndex: parseInt(voiceIdx),
                clonedPitch: transClonedPitch,
                preset: transClonedPitch ? null : activeTransPreset,
                rate: 0.9
            });
            showToast(transClonedPitch ? 'Speaking translation with your voice characteristics!' : 'Speaking translation...', 'success');
        });
    }

    // ==================== LYRICS ====================
    function initLyrics() {
        populateLangSelect('lyrics-translate-lang', 'hi');
        document.getElementById('lyrics-generate-btn').addEventListener('click', async () => {
            const genre = document.getElementById('lyrics-genre').value, mood = document.getElementById('lyrics-mood').value;
            const theme = document.getElementById('lyrics-theme').value, tempo = document.getElementById('lyrics-tempo').value;
            const btn = document.getElementById('lyrics-generate-btn'); btn.classList.add('loading');
            try {
                const data = await apiCall('/api/lyrics/generate', 'POST', { genre, mood, theme, tempo });
                document.getElementById('lyrics-result').textContent = data.lyrics;
                document.getElementById('lyrics-output').style.display = 'block';
                document.getElementById('lyrics-translated').style.display = 'none';
                showToast('Lyrics generated!', 'success');
            } catch (e) { showToast('Failed: ' + e.message, 'error'); } finally { btn.classList.remove('loading'); }
        });

        document.getElementById('lyrics-copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(document.getElementById('lyrics-result').textContent).then(() => showToast('Copied!', 'success'));
        });
        document.getElementById('lyrics-speak-btn').addEventListener('click', () => {
            speakWithSettings(document.getElementById('lyrics-result').textContent, { rate: 0.85 });
            showToast('Reading lyrics...', 'info');
        });

        // Send to Song Generator
        document.getElementById('lyrics-to-song-btn').addEventListener('click', () => {
            const lyrics = document.getElementById('lyrics-result').textContent;
            if (!lyrics) { showToast('No lyrics', 'error'); return; }
            document.getElementById('song-lyrics-input').value = lyrics;
            openModel('song');
            showToast('Lyrics sent to Song Generator!', 'success');
        });

        document.getElementById('lyrics-translate-btn').addEventListener('click', async () => {
            const lyrics = document.getElementById('lyrics-result').textContent;
            const tgt = document.getElementById('lyrics-translate-lang').value;
            if (!lyrics) { showToast('Generate lyrics first', 'error'); return; }
            const btn = document.getElementById('lyrics-translate-btn'); btn.classList.add('loading');
            try {
                const lines = lyrics.split('\n'), chunks = [];
                let chunk = '';
                for (const line of lines) { if ((chunk + '\n' + line).length > 400) { if (chunk) chunks.push(chunk); chunk = line; } else { chunk += (chunk ? '\n' : '') + line; } }
                if (chunk) chunks.push(chunk);
                let result = '';
                for (const c of chunks) { if (c.trim()) { const d = await apiCall('/api/translate', 'POST', { text: c, sourceLang: 'en', targetLang: tgt }); result += d.translatedText + '\n'; } else result += '\n'; }
                document.getElementById('lyrics-translated').textContent = result.trim();
                document.getElementById('lyrics-translated').style.display = 'block';
                showToast('Lyrics translated!', 'success');
            } catch (e) { showToast('Translation failed', 'error'); } finally { btn.classList.remove('loading'); }
        });
    }

    // ==================== MUSIC GENERATION (Multi-layered) ====================
    const CHORD_PROGRESSIONS = {
        pop: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], // I-V-vi-IV
        classical: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]],
        rock: [[0, 3, 7], [5, 8, 12], [7, 10, 14], [3, 7, 10]],
        jazz: [[2, 5, 9], [7, 11, 14], [0, 4, 7], [9, 12, 16]],
        hiphop: [[0, 3, 7], [5, 8, 12], [7, 10, 14], [3, 7, 10]],
        electronic: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]],
        ambient: [[0, 4, 7], [5, 9, 12], [9, 12, 16], [7, 11, 14]],
        blues: [[0, 3, 7], [5, 8, 12], [7, 10, 14], [0, 3, 7]],
        folk: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]],
        rnb: [[0, 4, 7], [5, 9, 12], [9, 12, 16], [7, 11, 14]],
        bollywood: [[0, 4, 7], [5, 9, 12], [3, 7, 10], [0, 4, 7]]
    };

    function initMusic() {
        document.getElementById('music-tempo').addEventListener('input', e => document.getElementById('music-tempo-val').textContent = e.target.value + ' BPM');
        document.getElementById('music-duration').addEventListener('input', e => document.getElementById('music-duration-val').textContent = e.target.value + 's');

        document.getElementById('music-generate-btn').addEventListener('click', async () => {
            const genre = document.getElementById('music-genre').value, type = document.getElementById('music-type').value;
            const tempo = parseInt(document.getElementById('music-tempo').value), duration = parseInt(document.getElementById('music-duration').value);
            const btn = document.getElementById('music-generate-btn'); btn.classList.add('loading');
            try {
                const data = await apiCall('/api/music/config', 'POST', { genre, type });
                generatedMusicData = { ...data, tempo, duration };
                document.getElementById('music-output').style.display = 'block';
                document.getElementById('music-meta').innerHTML = `<strong>Genre:</strong> ${genre} | <strong>Type:</strong> ${type} | <strong>Tempo:</strong> ${tempo} BPM | <strong>Duration:</strong> ${duration}s | <strong>Scale:</strong> ${data.scale}`;
                drawVisualization('music-canvas', data.notes);
                showToast('Music generated! Click play to listen.', 'success');
            } catch (e) { showToast('Failed: ' + e.message, 'error'); } finally { btn.classList.remove('loading'); }
        });

        document.getElementById('music-play-btn').addEventListener('click', () => {
            if (!generatedMusicData) { showToast('Generate music first', 'error'); return; }
            if (musicPlaying) { stopMusic(); return; }
            playMultiLayerMusic(generatedMusicData, 'music-canvas', 'music-play-btn', false);
        });
        document.getElementById('music-stop-btn').addEventListener('click', stopMusic);
        document.getElementById('music-download-btn').addEventListener('click', () => {
            if (!generatedMusicData) { showToast('Generate first', 'error'); return; }
            downloadMusic(generatedMusicData);
        });
    }

    function playMultiLayerMusic(data, canvasId, playBtnId, isSong) {
        if (isSong) { if (songPlaying) stopSong(); } else { if (musicPlaying) stopMusic(); }
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (isSong) { songAudioCtx = ctx; songPlaying = true; songNodes = []; } else { audioContext = ctx; musicPlaying = true; musicNodes = []; }
        document.getElementById(playBtnId).innerHTML = '<i class="fas fa-pause"></i>';

        const { notes, tempo, duration, genre } = data;
        const beatDur = 60 / tempo;
        const chords = CHORD_PROGRESSIONS[genre] || CHORD_PROGRESSIONS.pop;
        const baseNote = notes[0]?.midi || 60;

        // Master gain
        const master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);

        // --- BASS LINE ---
        let t = ctx.currentTime + 0.1;
        const maxT = ctx.currentTime + duration;
        let ci = 0;
        while (t < maxT) {
            const chord = chords[ci % chords.length];
            const freq = 440 * Math.pow(2, (baseNote - 24 + chord[0] - 69) / 12);
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 2 - 0.01);
            osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + beatDur * 2);
            if (isSong) songNodes.push(osc); else musicNodes.push(osc);
            t += beatDur * 2; ci++;
        }

        // --- CHORD PAD ---
        t = ctx.currentTime + 0.1; ci = 0;
        while (t < maxT) {
            const chord = chords[ci % chords.length];
            chord.forEach(note => {
                const freq = 440 * Math.pow(2, (baseNote + note - 69) / 12);
                const osc = ctx.createOscillator(); const g = ctx.createGain();
                osc.type = genre === 'classical' || genre === 'ambient' ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, t);
                g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.08, t + 0.1); g.gain.linearRampToValueAtTime(0.06, t + beatDur * 4 - 0.5); g.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 4);
                osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + beatDur * 4 + 0.01);
                if (isSong) songNodes.push(osc); else musicNodes.push(osc);
            });
            t += beatDur * 4; ci++;
        }

        // --- MELODY ---
        t = ctx.currentTime + 0.1;
        let ni = 0;
        while (t < maxT && ni < notes.length * 3) {
            const note = notes[ni % notes.length];
            const freq = 440 * Math.pow(2, (note.midi - 69) / 12);
            const dur = note.duration * beatDur;
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = genre === 'rock' ? 'sawtooth' : genre === 'electronic' ? 'square' : 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            const vol = note.velocity * 0.2;
            g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.01);
            if (isSong) songNodes.push(osc); else musicNodes.push(osc);
            t += dur; ni++;
        }

        // Animate & auto-stop
        animateCanvas(canvasId, notes, duration, isSong);
        setTimeout(() => { if (isSong) { if (songPlaying) stopSong(); } else { if (musicPlaying) stopMusic(); } }, duration * 1000 + 500);
    }

    function stopMusic() {
        musicPlaying = false; document.getElementById('music-play-btn').innerHTML = '<i class="fas fa-play"></i>';
        musicNodes.forEach(n => { try { n.stop(); } catch (e) { } }); musicNodes = [];
        if (audioContext) { audioContext.close().catch(() => { }); audioContext = null; }
    }
    function stopSong() {
        songPlaying = false; speechSynthesis.cancel();
        document.getElementById('song-play-btn').innerHTML = '<i class="fas fa-play"></i>';
        songNodes.forEach(n => { try { n.stop(); } catch (e) { } }); songNodes = [];
        if (songAudioCtx) { songAudioCtx.close().catch(() => { }); songAudioCtx = null; }
        document.getElementById('song-status').textContent = '';
    }

    function drawVisualization(canvasId, notes) {
        const canvas = document.getElementById(canvasId); canvas.width = canvas.offsetWidth * 2; canvas.height = 400;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bg = ctx.createLinearGradient(0, 0, canvas.width, 0);
        bg.addColorStop(0, 'rgba(99,102,241,0.1)'); bg.addColorStop(0.5, 'rgba(139,92,246,0.1)'); bg.addColorStop(1, 'rgba(6,182,212,0.1)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const bw = (canvas.width - 40) / notes.length;
        const maxM = Math.max(...notes.map(n => n.midi)), minM = Math.min(...notes.map(n => n.midi)), range = maxM - minM || 1;
        notes.forEach((note, i) => {
            const x = 20 + i * bw, norm = (note.midi - minM) / range, h = 40 + norm * (canvas.height - 80), y = canvas.height - h - 20;
            const grd = ctx.createLinearGradient(x, y + h, x, y);
            grd.addColorStop(0, 'rgba(99,102,241,0.8)'); grd.addColorStop(0.5, 'rgba(139,92,246,0.6)'); grd.addColorStop(1, 'rgba(6,182,212,0.4)');
            ctx.fillStyle = grd; ctx.shadowColor = 'rgba(99,102,241,0.3)'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.roundRect(x + 1, y, Math.max(bw - 2, 2), h, 2); ctx.fill(); ctx.shadowBlur = 0;
        });
    }

    function animateCanvas(canvasId, notes, duration, isSong) {
        const canvas = document.getElementById(canvasId), ctx = canvas.getContext('2d'), start = Date.now();
        (function draw() {
            const playing = isSong ? songPlaying : musicPlaying;
            if (!playing) return;
            const prog = (Date.now() - start) / 1000 / duration; if (prog >= 1) return;
            drawVisualization(canvasId, notes);
            const x = 20 + prog * (canvas.width - 40);
            ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 3; ctx.shadowColor = '#f43f5e'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, canvas.height - 10); ctx.stroke(); ctx.shadowBlur = 0;
            requestAnimationFrame(draw);
        })();
    }

    function downloadMusic(data) {
        const offCtx = new OfflineAudioContext(1, data.duration * 44100, 44100);
        const { notes, tempo, duration, genre } = data; const beatDur = 60 / tempo;
        const chords = CHORD_PROGRESSIONS[genre] || CHORD_PROGRESSIONS.pop; const baseNote = notes[0]?.midi || 60;
        const master = offCtx.createGain(); master.gain.value = 0.6; master.connect(offCtx.destination);
        // Bass
        let t = 0, ci = 0;
        while (t < duration) { const chord = chords[ci % chords.length]; const freq = 440 * Math.pow(2, (baseNote - 24 + chord[0] - 69) / 12); const osc = offCtx.createOscillator(); const g = offCtx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 2 - 0.01); osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + beatDur * 2); t += beatDur * 2; ci++; }
        // Melody
        t = 0; let ni = 0;
        while (t < duration && ni < notes.length * 3) { const note = notes[ni % notes.length]; const freq = 440 * Math.pow(2, (note.midi - 69) / 12); const dur = note.duration * beatDur; const osc = offCtx.createOscillator(); const g = offCtx.createGain(); osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(note.velocity * 0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + dur); osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.01); t += dur; ni++; }
        offCtx.startRendering().then(buf => {
            const wav = bufToWav(buf); const blob = new Blob([wav], { type: 'audio/wav' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `vaaniverse_${genre}_music.wav`; document.body.appendChild(a); a.click(); a.remove();
            showToast('Music downloaded!', 'success');
        });
    }

    function bufToWav(buf) {
        const ch = buf.getChannelData(0), sr = buf.sampleRate, len = ch.length * 2 + 44;
        const ab = new ArrayBuffer(len), v = new DataView(ab);
        function ws(o, s) { for (let i = 0; i < s.length; i++)v.setUint8(o + i, s.charCodeAt(i)); }
        ws(0, 'RIFF'); v.setUint32(4, len - 8, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true);
        v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
        v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, ch.length * 2, true);
        let off = 44; for (let i = 0; i < ch.length; i++) { const s = Math.max(-1, Math.min(1, ch[i])); v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2; }
        return ab;
    }

    // ==================== SONG GENERATION ====================
    function initSong() {
        // Singer selection
        document.querySelectorAll('.singer-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.singer-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedSinger = card.dataset.singer;
                showToast(`Singer: ${card.querySelector('.singer-name').textContent}`, 'info');
            });
        });

        document.getElementById('song-generate-btn').addEventListener('click', async () => {
            const lyrics = document.getElementById('song-lyrics-input').value.trim();
            if (!lyrics) { showToast('Please add lyrics first! Generate from Lyrics model or type your own.', 'error'); return; }
            const genre = document.getElementById('song-genre').value;
            const tempoSel = document.getElementById('song-tempo').value;
            const tempo = tempoSel === 'slow' ? 80 : tempoSel === 'fast' ? 140 : 110;
            const btn = document.getElementById('song-generate-btn'); btn.classList.add('loading');

            try {
                // Get music config
                const data = await apiCall('/api/music/config', 'POST', { genre, type: 'full' });
                const songData = { ...data, tempo, duration: 30, genre };
                document.getElementById('song-output').style.display = 'block';
                drawVisualization('song-canvas', data.notes);

                // Start background music
                playMultiLayerMusic(songData, 'song-canvas', 'song-play-btn', true);

                // Sing lyrics with speech synthesis over music
                const singerConfig = {
                    'male': { pitch: 0.7, rate: 0.7 },
                    'female': { pitch: 1.5, rate: 0.7 },
                    'male-high': { pitch: 1.1, rate: 0.75 },
                    'female-deep': { pitch: 1.0, rate: 0.65 }
                };
                const sc = singerConfig[selectedSinger] || singerConfig.male;

                // Clean lyrics (remove section headers)
                const cleanLyrics = lyrics.replace(/\[.*?\]\n?/g, '').trim();
                document.getElementById('song-status').textContent = '🎤 Singing...';

                setTimeout(() => {
                    speakWithSettings(cleanLyrics, {
                        pitch: sc.pitch,
                        rate: sc.rate,
                        onEnd: () => { document.getElementById('song-status').textContent = '✓ Song complete'; }
                    });
                }, 2000); // Start singing 2s after music begins

                showToast('Song generating! Music + Vocals playing...', 'success');
            } catch (e) { showToast('Song generation failed', 'error'); }
            finally { btn.classList.remove('loading'); }
        });

        document.getElementById('song-play-btn').addEventListener('click', () => {
            if (songPlaying) stopSong(); else document.getElementById('song-generate-btn').click();
        });
        document.getElementById('song-stop-btn').addEventListener('click', stopSong);
    }

    // ==================== PARTICLES & ABOUT ====================
    function initParticles() {
        const c = document.getElementById('hero-particles'); if (!c) return;
        const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#f43f5e', '#10b981'];
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div'); p.className = 'particle';
            p.style.left = Math.random() * 100 + '%'; p.style.top = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 10 + 's'; p.style.animationDuration = (8 + Math.random() * 12) + 's';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            const s = (2 + Math.random() * 4) + 'px'; p.style.width = s; p.style.height = s;
            c.appendChild(p);
        }
    }
    function initAboutLanguages() {
        const c = document.getElementById('lang-tags'); if (!c) return;
        LANGUAGES.forEach(l => { const t = document.createElement('span'); t.className = 'lang-tag'; t.textContent = l.name; c.appendChild(t); });
    }
    function initScrollAnimations() {
        const obs = new IntersectionObserver(e => { e.forEach(en => { if (en.isIntersecting) en.target.style.animation = 'fadeInUp 0.6s ease forwards'; }); }, { threshold: 0.1 });
        document.querySelectorAll('.feature-card,.model-card,.about-card,.stat-card').forEach(el => obs.observe(el));
    }
})();
