// ============================================================
// NOTEVAULT — SUPABASE AUTH VERSION (LINK FIX v2)
// ============================================================

const SUPA_URL = 'https://rgzvsxaknntpqvtoqbuo.supabase.co';
const SUPA_KEY = 'sb_publishable_kQbhLSFLKT3QQhIOoZp59Q_56C-vSbZ';

const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);

// ==================== STATE ====================
const S = {
    user: null,
    notes: [],
    folders: [],
    cur: null,
    filter: 'all',
    folder: null,
    sort: 'updated',
    editing: false,
    search: '',
    saveT: null,
    saving: false,
    mobile: window.innerWidth <= 768,
    savedRange: null
};

const q = s => document.querySelector(s);
const qa = s => document.querySelectorAll(s);

// ==================== PALETTES ====================
const TC = [
    '#FFFFFF','#E2E5F0','#9BA1BD','#6B7194',
    '#EF4444','#F97316','#F59E0B','#22C55E',
    '#3B82F6','#6366F1','#8B5CF6','#EC4899',
    '#FCA5A5','#FDBA74','#FDE68A','#86EFAC',
    '#93C5FD','#A5B4FC','#C4B5FD','#F9A8D4',
    '#DC2626','#EA580C','#D97706','#16A34A',
    '#2563EB','#4F46E5','#7C3AED','#DB2777'
];
const HC = [
    'transparent','#FEF3C7','#FED7AA','#FECACA',
    '#FCE7F3','#EDE9FE','#C7D2FE','#BFDBFE',
    '#A7F3D0','#D9F99D','#FEF08A','#FFEDD5',
    '#FBBF24','#FB923C','#F87171','#E879F9',
    '#818CF8','#38BDF8','#34D399','#A3E635',
    '#991B1B','#9A3412','#92400E','#166534',
    '#1E3A8A','#312E81','#581C87','#831843'
];
const FC = ['#7C6EF6','#3B82F6','#06B6D4','#22C55E','#F59E0B','#EF4444','#EC4899','#8B5CF6','#14B8A6','#F97316','#6366F1','#10B981'];
const FI = ['📁','📂','📋','📌','🏷️','💼','🎯','💡','📚','⭐','🔖','📎','💻','🎨','🏠','💰','🏥','✈️','🎵','📷','🍔','🏃','📐','🔬'];

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    particles();
    colorGrids();
    bind();
    initAuth();
});

function particles() {
    const c = q('#loginBg');
    if (!c) return;
    for (let i = 0; i < 28; i++) {
        const b = document.createElement('b');
        b.style.left = Math.random() * 100 + '%';
        b.style.animationDuration = (9 + Math.random() * 14) + 's';
        b.style.animationDelay = Math.random() * 10 + 's';
        const s = 2 + Math.random() * 4;
        b.style.width = b.style.height = s + 'px';
        c.appendChild(b);
    }
}

function colorGrids() {
    makeGrid('tcGrid', TC, 'tc');
    makeGrid('hlGrid', HC, 'hl');
}

function makeGrid(id, arr, t) {
    const g = q('#' + id);
    if (!g) return;
    g.innerHTML = '';
    arr.forEach(c => {
        const b = document.createElement('button');
        b.className = 'cp-sw' + (c === 'transparent' ? ' none' : '');
        if (c !== 'transparent') b.style.background = c;
        b.dataset.c = c;
        b.addEventListener('mousedown', e => e.preventDefault());
        b.addEventListener('click', () => {
            if (t === 'tc') setTC(c);
            else setHL(c);
        });
        g.appendChild(b);
    });
}

// ==================== SAVE / RESTORE SELECTION ====================
function saveSelection() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        S.savedRange = sel.getRangeAt(0).cloneRange();
    }
}

function restoreSelection() {
    if (!S.savedRange) return false;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(S.savedRange);
    return true;
}

// ==================== AUTH ====================
async function initAuth() {
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            S.user = session.user;
            enter();
        }
        sb.auth.onAuthStateChange((_, session) => {
            if (session) S.user = session.user;
        });
    } catch (e) {
        console.error('Auth init error:', e);
    }
}

// ==================== EVENT BINDING ====================
function bind() {
    q('#loginForm').addEventListener('submit', login);
    q('#pwToggle').addEventListener('click', togglePw);

    q('#hamburger').addEventListener('click', openSB);
    q('#sbClose').addEventListener('click', closeSB);
    q('#mobShade').addEventListener('click', closeSB);
    q('#logoutBtn').addEventListener('click', doLogout);
    q('#addFolder').addEventListener('click', () => folderModal());
    q('#searchBox').addEventListener('input', e => {
        S.search = e.target.value;
        renderList();
    });

    qa('.sb-item').forEach(b => {
        b.addEventListener('click', () => setFilter(b.dataset.f));
    });

    qa('.sort-btn').forEach(b => {
        b.addEventListener('click', () => setSort(b.dataset.s));
    });

    q('#addNote').addEventListener('click', newNote);
    q('#blankCreate').addEventListener('click', newNote);

    q('#btnEdit').addEventListener('click', toggleEdit);
    q('#btnPin').addEventListener('click', doPin);
    q('#btnArchive').addEventListener('click', doArchive);
    q('#btnDelete').addEventListener('click', doDelete);
    q('#edBack').addEventListener('click', goBack);
    q('#edFolder').addEventListener('change', moveNote);

    q('#edContent').addEventListener('input', onContentChange);
    q('#edTitle').addEventListener('input', onContentChange);
    q('#edContent').addEventListener('click', handleLinkClick);

    // Save selection whenever it changes in the editor
    q('#edContent').addEventListener('mouseup', saveSelection);
    q('#edContent').addEventListener('keyup', saveSelection);

    // Toolbar format commands — prevent stealing focus
    qa('.tb-btn[data-c]').forEach(b => {
        b.addEventListener('mousedown', e => e.preventDefault());
        b.addEventListener('click', () => execCmd(b.dataset.c));
    });

    // Link buttons — prevent stealing focus
    q('#btnLink').addEventListener('mousedown', e => e.preventDefault());
    q('#btnLink').addEventListener('click', insertLink);

    q('#btnUnlink').addEventListener('mousedown', e => e.preventDefault());
    q('#btnUnlink').addEventListener('click', removeLink);

    // Heading select
    q('#tbHeading').addEventListener('mousedown', saveSelection);
    q('#tbHeading').addEventListener('change', function () {
        if (this.value) {
            restoreSelection();
            document.execCommand('formatBlock', false, this.value);
            q('#edContent').focus();
            scheduleSave();
        }
        this.value = '';
    });

    // Font size select
    q('#tbSize').addEventListener('mousedown', saveSelection);
    q('#tbSize').addEventListener('change', function () {
        if (this.value) {
            restoreSelection();
            document.execCommand('fontSize', false, this.value);
            q('#edContent').focus();
            scheduleSave();
        }
        this.value = '';
    });

    // Color triggers — prevent stealing focus
    q('#tcTrig').addEventListener('mousedown', e => e.preventDefault());
    q('#tcTrig').addEventListener('click', e => {
        e.stopPropagation();
        q('#hlPopup').classList.remove('on');
        q('#tcPopup').classList.toggle('on');
    });

    q('#hlTrig').addEventListener('mousedown', e => e.preventDefault());
    q('#hlTrig').addEventListener('click', e => {
        e.stopPropagation();
        q('#tcPopup').classList.remove('on');
        q('#hlPopup').classList.toggle('on');
    });

    q('#tcWheel').addEventListener('input', function () {
        q('#tcHex').value = this.value.toUpperCase();
    });
    q('#hlWheel').addEventListener('input', function () {
        q('#hlHex').value = this.value.toUpperCase();
    });

    q('#tcApply').addEventListener('mousedown', e => e.preventDefault());
    q('#tcApply').addEventListener('click', () => {
        const v = q('#tcHex').value;
        if (okHex(v)) setTC(v);
    });
    q('#hlApply').addEventListener('mousedown', e => e.preventDefault());
    q('#hlApply').addEventListener('click', () => {
        const v = q('#hlHex').value;
        if (okHex(v)) setHL(v);
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.cp-wrap')) {
            qa('.cp-popup').forEach(p => p.classList.remove('on'));
        }
    });

    q('#modalShade').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal();
    });

    document.addEventListener('keydown', handleKeys);

    window.addEventListener('resize', () => {
        S.mobile = window.innerWidth <= 768;
        if (!S.mobile) {
            q('#listPanel').classList.remove('gone');
            q('#editor').classList.remove('gone');
            closeSB();
        }
    });
}

// ==================== LOGIN ====================
async function login(e) {
    e.preventDefault();
    const email = q('#loginEmail').value.trim();
    const pw = q('#loginPassword').value;

    if (!email || !pw) {
        showLoginErr('Enter email and password');
        return;
    }

    const btn = q('#loginBtn');
    btn.classList.add('busy');
    btn.disabled = true;

    try {
        const { data, error } = await sb.auth.signInWithPassword({
            email: email,
            password: pw
        });

        if (error) {
            showLoginErr(error.message || 'Invalid credentials');
            btn.classList.remove('busy');
            btn.disabled = false;
            return;
        }

        S.user = data.user;
        enter();
    } catch (err) {
        showLoginErr('Connection error. Try again.');
        btn.classList.remove('busy');
        btn.disabled = false;
    }
}

function showLoginErr(m) {
    q('#loginErrMsg').textContent = m;
    const el = q('#loginErr');
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 5000);
}

function togglePw() {
    const inp = q('#loginPassword');
    const svg = q('#eyeSvg');
    if (inp.type === 'password') {
        inp.type = 'text';
        svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
        inp.type = 'password';
        svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
}

function doLogout() {
    confirm2('Sign Out', 'Are you sure you want to sign out?', 'warn', async () => {
        await sb.auth.signOut();
        S.user = null;
        S.cur = null;
        S.notes = [];
        S.folders = [];
        q('#app').classList.remove('on');
        q('#loginOverlay').classList.remove('gone');
        q('#loginEmail').value = '';
        q('#loginPassword').value = '';
        q('#loginBtn').classList.remove('busy');
        q('#loginBtn').disabled = false;
    });
}

// ==================== ENTER APP ====================
async function enter() {
    q('#loginOverlay').classList.add('gone');
    q('#app').classList.add('on');

    const name = S.user.user_metadata?.username || S.user.email?.split('@')[0] || 'User';
    q('#uAvatar').textContent = name.substring(0, 2).toUpperCase();
    q('#uName').textContent = name;

    await loadFolders();
    await loadNotes();
    renderList();
    counts();

    if (S.mobile) {
        q('#editor').classList.add('gone');
        q('#listPanel').classList.remove('gone');
    }
}

// ==================== DATA LOADING ====================
async function loadFolders() {
    try {
        const { data } = await sb.from('folders').select('*').eq('user_id', S.user.id).order('sort_order');
        S.folders = data || [];
        renderFolders();
    } catch (e) {
        console.error('Load folders:', e);
    }
}

async function loadNotes() {
    try {
        const { data } = await sb.from('notes').select('*').eq('user_id', S.user.id).order('updated_at', { ascending: false });
        S.notes = data || [];
    } catch (e) {
        console.error('Load notes:', e);
    }
}

// ==================== FOLDERS ====================
function renderFolders() {
    const c = q('#foldersBox');
    c.innerHTML = '';
    S.folders.forEach(f => {
        const cnt = S.notes.filter(n => n.folder_id === f.id && !n.is_archived).length;
        const act = S.filter === 'folder' && S.folder === f.id;
        const d = document.createElement('div');
        d.className = 'fd-item' + (act ? ' active' : '');
        d.innerHTML = `
            <span class="fd-dot" style="background:${f.color}"></span>
            <span class="fd-name">${esc(f.name)}</span>
            <span class="fd-cnt">${cnt}</span>
            <div class="fd-acts">
                <button class="fd-act ed-f"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="fd-act del dl-f"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>`;
        d.addEventListener('click', e => {
            if (e.target.closest('.fd-act')) return;
            setFolderFilter(f.id, f.name);
        });
        d.querySelector('.ed-f').addEventListener('click', e => {
            e.stopPropagation();
            folderModal(f);
        });
        d.querySelector('.dl-f').addEventListener('click', e => {
            e.stopPropagation();
            delFolder(f);
        });
        c.appendChild(d);
    });
    updateFolderSel();
}

function updateFolderSel() {
    const s = q('#edFolder');
    s.innerHTML = '<option value="">No folder</option>';
    S.folders.forEach(f => {
        const o = document.createElement('option');
        o.value = f.id;
        o.textContent = f.name;
        s.appendChild(o);
    });
    if (S.cur) s.value = S.cur.folder_id || '';
}

function folderModal(ex = null) {
    const isE = !!ex;
    const cName = isE ? ex.name : '';
    const cCol = isE ? ex.color : FC[0];
    const cIcn = isE ? (ex.icon || '📁') : '📁';

    modal(isE ? 'Edit Folder' : 'New Folder', `
        <div class="field">
            <label>Name</label>
            <input type="text" class="input" id="fmName" value="${esc(cName)}" placeholder="Folder name">
        </div>
        <div class="field">
            <label>Color</label>
            <div class="fc-grid">${FC.map(c =>
                `<button type="button" class="fc-opt${c === cCol ? ' sel' : ''}" style="background:${c}" data-c="${c}"></button>`
            ).join('')}</div>
        </div>
        <div class="field">
            <label>Icon</label>
            <div class="icn-grid">${FI.map(i =>
                `<button type="button" class="icn-opt${i === cIcn ? ' sel' : ''}" data-i="${i}">${i}</button>`
            ).join('')}</div>
        </div>
        <input type="hidden" id="fmCol" value="${cCol}">
        <input type="hidden" id="fmIcn" value="${cIcn}">
    `, [
        { t: 'Cancel', c: '', fn: closeModal },
        { t: isE ? 'Save' : 'Create', c: 'pri', fn: () => saveFolder(ex) }
    ]);

    qa('.fc-opt').forEach(b => {
        b.addEventListener('click', function () {
            qa('.fc-opt').forEach(x => x.classList.remove('sel'));
            this.classList.add('sel');
            q('#fmCol').value = this.dataset.c;
        });
    });

    qa('.icn-opt').forEach(b => {
        b.addEventListener('click', function () {
            qa('.icn-opt').forEach(x => x.classList.remove('sel'));
            this.classList.add('sel');
            q('#fmIcn').value = this.dataset.i;
        });
    });

    setTimeout(() => q('#fmName')?.focus(), 100);
}

async function saveFolder(ex) {
    const name = (q('#fmName')?.value || '').trim();
    const color = q('#fmCol')?.value || FC[0];
    const icon = q('#fmIcn')?.value || '📁';

    if (!name) {
        toast('Enter a folder name', 'warning');
        return;
    }

    try {
        if (ex) {
            const { error } = await sb.from('folders').update({ name, color, icon }).eq('id', ex.id);
            if (error) throw error;
            toast('Folder updated', 'success');
        } else {
            const { error } = await sb.from('folders').insert({
                user_id: S.user.id, name, color, icon,
                sort_order: S.folders.length
            });
            if (error) throw error;
            toast('Folder created', 'success');
        }
        closeModal();
        await loadFolders();
        await loadNotes();
        renderList();
        counts();
    } catch (e) {
        toast('Failed to save folder', 'error');
    }
}

function delFolder(f) {
    confirm2('Delete Folder',
        `Delete <strong>"${esc(f.name)}"</strong>? Notes inside become uncategorized.`,
        'err',
        async () => {
            try {
                await sb.from('notes').update({ folder_id: null }).eq('folder_id', f.id);
                await sb.from('folders').delete().eq('id', f.id);
                if (S.folder === f.id) {
                    S.folder = null;
                    S.filter = 'all';
                    updateNav();
                    q('#listTitle').textContent = 'All Notes';
                }
                await loadFolders();
                await loadNotes();
                renderList();
                counts();
                toast('Folder deleted', 'success');
            } catch (e) {
                toast('Failed to delete folder', 'error');
            }
        }
    );
}

// ==================== NOTES CRUD ====================
async function newNote() {
    const fid = S.folder || (S.folders[0]?.id || null);

    try {
        const { data, error } = await sb.from('notes')
            .insert({
                user_id: S.user.id,
                title: 'Untitled Note',
                content: '',
                folder_id: fid
            })
            .select()
            .single();

        if (error) throw error;

        S.notes.unshift(data);
        renderList();
        counts();
        pick(data.id);
        S.editing = true;
        applyEdit();
        q('#edTitle').focus();
        q('#edTitle').select();
        toast('Note created', 'success');
        if (S.mobile) showEd();
    } catch (e) {
        toast('Failed to create note', 'error');
    }
}

function pick(id) {
    const n = S.notes.find(x => x.id === id);
    if (!n) return;

    if (S.cur && S.editing && S.cur.id !== id) {
        instantSave();
    }

    S.cur = n;
    S.editing = false;

    q('#edBlank').style.display = 'none';
    q('#edLive').classList.add('on');

    q('#edTitle').value = n.title || '';
    q('#edContent').innerHTML = n.content || '';
    q('#edFolder').value = n.folder_id || '';

    showSavedTime(n.updated_at);
    applyEdit();
    pinUI();
    archUI();
    updateWordCount();

    qa('.n-card').forEach(c => c.classList.toggle('active', c.dataset.id === id));
    if (S.mobile) showEd();
}

async function instantSave() {
    if (!S.cur || S.saving) return;

    const title = (q('#edTitle').value || '').trim() || 'Untitled Note';
    const content = q('#edContent').innerHTML;

    if (title === S.cur.title && content === S.cur.content) return;

    S.saving = true;

    try {
        const now = new Date().toISOString();
        const { error } = await sb.from('notes')
            .update({ title, content, updated_at: now })
            .eq('id', S.cur.id);

        if (error) throw error;

        S.cur.title = title;
        S.cur.content = content;
        S.cur.updated_at = now;

        const idx = S.notes.findIndex(x => x.id === S.cur.id);
        if (idx > -1) S.notes[idx] = { ...S.cur };

        showSavedTime();
        renderList();
    } catch (e) {
        console.error('Save error:', e);
    } finally {
        S.saving = false;
    }
}

function scheduleSave() {
    clearTimeout(S.saveT);
    q('#edStatusTxt').textContent = 'Saving...';
    S.saveT = setTimeout(() => {
        if (S.cur && S.editing) instantSave();
    }, 1200);
}

async function moveNote() {
    if (!S.cur) return;
    const fid = q('#edFolder').value || null;

    try {
        await sb.from('notes').update({ folder_id: fid }).eq('id', S.cur.id);
        S.cur.folder_id = fid;
        const idx = S.notes.findIndex(x => x.id === S.cur.id);
        if (idx > -1) S.notes[idx].folder_id = fid;
        renderList();
        renderFolders();
        counts();
        toast('Note moved', 'success');
    } catch (e) {
        toast('Failed to move note', 'error');
    }
}

async function doPin() {
    if (!S.cur) return;
    const v = !S.cur.is_pinned;

    try {
        const { error } = await sb.from('notes').update({ is_pinned: v }).eq('id', S.cur.id);
        if (error) throw error;

        S.cur.is_pinned = v;
        const idx = S.notes.findIndex(x => x.id === S.cur.id);
        if (idx > -1) S.notes[idx].is_pinned = v;

        pinUI();
        renderList();
        counts();
        toast(v ? 'Pinned' : 'Unpinned', 'success');
    } catch (e) {
        toast('Failed to update', 'error');
    }
}

function pinUI() {
    const btn = q('#btnPin');
    btn.classList.toggle('on', !!S.cur?.is_pinned);
    btn.title = S.cur?.is_pinned ? 'Unpin' : 'Pin';
}

function doArchive() {
    if (!S.cur) return;
    const v = !S.cur.is_archived;

    confirm2(
        v ? 'Archive Note' : 'Restore Note',
        v ? 'Move this note to archive?' : 'Restore this note from archive?',
        'warn',
        async () => {
            try {
                const { error } = await sb.from('notes').update({ is_archived: v }).eq('id', S.cur.id);
                if (error) throw error;

                S.cur.is_archived = v;
                const idx = S.notes.findIndex(x => x.id === S.cur.id);
                if (idx > -1) S.notes[idx].is_archived = v;

                archUI();
                renderList();
                counts();
                toast(v ? 'Archived' : 'Restored', 'success');
            } catch (e) {
                toast('Failed to update', 'error');
            }
        }
    );
}

function archUI() {
    const btn = q('#btnArchive');
    btn.classList.toggle('on', !!S.cur?.is_archived);
    btn.title = S.cur?.is_archived ? 'Restore' : 'Archive';
}

function doDelete() {
    if (!S.cur) return;

    confirm2(
        'Delete Note',
        `Permanently delete <strong>"${esc(S.cur.title)}"</strong>? This cannot be undone.`,
        'err',
        async () => {
            try {
                await sb.from('notes').delete().eq('id', S.cur.id);
                S.notes = S.notes.filter(x => x.id !== S.cur.id);
                S.cur = null;

                q('#edBlank').style.display = '';
                q('#edLive').classList.remove('on');

                renderList();
                renderFolders();
                counts();
                toast('Note deleted', 'success');
                if (S.mobile) showList();
            } catch (e) {
                toast('Failed to delete note', 'error');
            }
        }
    );
}

// ==================== EDIT MODE ====================
function toggleEdit() {
    if (S.editing) {
        S.editing = false;
        clearTimeout(S.saveT);
        applyEdit();
        instantSave();
    } else {
        S.editing = true;
        applyEdit();
        q('#edContent').focus();
    }
}

function applyEdit() {
    const c = q('#edContent');
    const t = q('#edTitle');
    const tb = q('#toolbar');
    const btn = q('#btnEdit');

    if (S.editing) {
        c.contentEditable = 'true';
        t.readOnly = false;
        tb.classList.add('on');
        btn.classList.add('editing');
        btn.querySelector('span').textContent = 'Done';
    } else {
        c.contentEditable = 'false';
        t.readOnly = true;
        tb.classList.remove('on');
        btn.classList.remove('editing');
        btn.querySelector('span').textContent = 'Edit';
    }
}

// ==================== RENDER LIST ====================
function renderList() {
    const c = q('#notesList');
    let ns = filtered();

    if (!ns.length) {
        c.innerHTML = `
            <div class="n-empty">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
                <h3>No notes</h3>
                <p>${S.search ? 'Try different search' : 'Create a note to begin'}</p>
            </div>`;
        return;
    }

    ns = sorted(ns);

    if (S.filter !== 'pinned') {
        const p = ns.filter(x => x.is_pinned);
        const u = ns.filter(x => !x.is_pinned);
        ns = [...p, ...u];
    }

    c.innerHTML = ns.map(n => {
        const f = S.folders.find(x => x.id === n.folder_id);
        const prev = strip(n.content || '').substring(0, 130) || 'No content';
        const isActive = S.cur?.id === n.id;

        return `
            <div class="n-card${isActive ? ' active' : ''}" data-id="${n.id}">
                ${n.is_pinned ? '<span class="n-pin"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17l-5 3 1.5-5.6L4 10.5l5.8-.5L12 5l2.2 5 5.8.5-4.5 3.9L17 20z"/></svg></span>' : ''}
                <div class="n-ttl">${esc(n.title || 'Untitled Note')}</div>
                <div class="n-pre">${esc(prev)}</div>
                <div class="n-foot">
                    <span class="n-date">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        ${fmtDate(n.updated_at)}
                    </span>
                    ${f ? `<span class="n-tag"><i style="background:${f.color}"></i>${esc(f.name)}</span>` : ''}
                </div>
            </div>`;
    }).join('');

    c.querySelectorAll('.n-card').forEach(el => {
        el.addEventListener('click', () => pick(el.dataset.id));
    });
}

function filtered() {
    let ns = [...S.notes];

    if (S.search) {
        const s = S.search.toLowerCase();
        ns = ns.filter(n =>
            (n.title || '').toLowerCase().includes(s) ||
            strip(n.content || '').toLowerCase().includes(s)
        );
    }

    switch (S.filter) {
        case 'pinned':
            return ns.filter(n => n.is_pinned && !n.is_archived);
        case 'archived':
            return ns.filter(n => n.is_archived);
        case 'folder':
            return ns.filter(n => n.folder_id === S.folder && !n.is_archived);
        default:
            return ns.filter(n => !n.is_archived);
    }
}

function sorted(ns) {
    switch (S.sort) {
        case 'created':
            return ns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        case 'title':
            return ns.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        default:
            return ns.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }
}

// ==================== FILTERS & SORT ====================
function setFilter(f) {
    S.filter = f;
    S.folder = null;
    updateNav();
    const titles = { all: 'All Notes', pinned: 'Pinned', archived: 'Archived' };
    q('#listTitle').textContent = titles[f] || 'All Notes';
    renderFolders();
    renderList();
    closeSB();
}

function setFolderFilter(id, name) {
    S.filter = 'folder';
    S.folder = id;
    updateNav();
    q('#listTitle').textContent = name;
    renderFolders();
    renderList();
    closeSB();
}

function updateNav() {
    qa('.sb-item').forEach(b => {
        b.classList.toggle('active', b.dataset.f === S.filter && S.filter !== 'folder');
    });
}

function setSort(s) {
    S.sort = s;
    qa('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.s === s));
    renderList();
}

function counts() {
    q('#cAll').textContent = S.notes.filter(n => !n.is_archived).length;
    q('#cPinned').textContent = S.notes.filter(n => n.is_pinned && !n.is_archived).length;
    q('#cArchived').textContent = S.notes.filter(n => n.is_archived).length;
    renderFolders();
}

// ==================== TOOLBAR COMMANDS ====================
function execCmd(c) {
    restoreSelection();
    document.execCommand(c, false, null);
    q('#edContent').focus();
    saveSelection();
    scheduleSave();
}

// ==================== LINK INSERT ====================
function insertLink() {
    // Save current selection BEFORE opening modal
    saveSelection();

    const sel = window.getSelection();
    const selectedText = sel.toString().trim();

    // Check if cursor is already inside a link
    let parentLink = null;
    if (S.savedRange) {
        let node = S.savedRange.commonAncestorContainer;
        while (node && node !== q('#edContent')) {
            if (node.nodeType === 1 && node.tagName === 'A') {
                parentLink = node;
                break;
            }
            node = node.parentNode;
        }
    }

    const existingUrl = parentLink ? parentLink.getAttribute('href') || '' : '';
    const existingText = parentLink ? parentLink.textContent : selectedText;

    modal('Insert Link', `
        <div class="field">
            <label>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                URL
            </label>
            <input type="text" class="input" id="linkUrl" placeholder="https://example.com" value="${esc(existingUrl)}">
        </div>
        <div class="field">
            <label>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
                Display Text (leave blank to use selection)
            </label>
            <input type="text" class="input" id="linkText" placeholder="Link text" value="${esc(existingText)}">
        </div>
    `, [
        { t: 'Cancel', c: '', fn: closeModal },
        { t: parentLink ? 'Update' : 'Insert', c: 'pri', fn: () => applyLink(parentLink, selectedText) }
    ]);

    setTimeout(() => q('#linkUrl')?.focus(), 100);
}

function applyLink(existingLink, originalSelectedText) {
    let url = (q('#linkUrl')?.value || '').trim();
    const customText = (q('#linkText')?.value || '').trim();

    if (!url) {
        toast('Please enter a URL', 'warning');
        return;
    }

    // Auto-add https
    if (!/^(https?|ftp):\/\//i.test(url)) {
        url = 'https://' + url;
    }

    closeModal();

    const content = q('#edContent');
    content.focus();

    if (existingLink) {
        // Update existing link
        existingLink.href = url;
        existingLink.target = '_blank';
        existingLink.rel = 'noopener noreferrer';
        if (customText) existingLink.textContent = customText;
        scheduleSave();
        return;
    }

    // Restore the saved selection
    if (S.savedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(S.savedRange);

        // If there was selected text, wrap it in a link
        if (originalSelectedText && !S.savedRange.collapsed) {
            // Create the link element
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            if (customText && customText !== originalSelectedText) {
                // User changed the display text — replace selection with new text in link
                S.savedRange.deleteContents();
                link.textContent = customText;
                S.savedRange.insertNode(link);
            } else {
                // Wrap the existing selection with the link
                try {
                    S.savedRange.surroundContents(link);
                } catch (e) {
                    // surroundContents fails if selection spans multiple elements
                    // Fall back to extracting and wrapping
                    const fragment = S.savedRange.extractContents();
                    link.appendChild(fragment);
                    S.savedRange.insertNode(link);
                }
            }

            // Move cursor after the link
            const newRange = document.createRange();
            newRange.setStartAfter(link);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        } else {
            // No selection — insert a new link at cursor position
            const displayText = customText || url;
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = displayText;

            S.savedRange.deleteContents();
            S.savedRange.insertNode(link);

            // Add a space after and move cursor there
            const space = document.createTextNode('\u00A0');
            link.parentNode.insertBefore(space, link.nextSibling);

            const newRange = document.createRange();
            newRange.setStartAfter(space);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
    } else {
        // No saved range at all — just append
        const displayText = customText || url;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = displayText;
        content.appendChild(link);
        content.appendChild(document.createTextNode('\u00A0'));
    }

    saveSelection();
    scheduleSave();
}

function removeLink() {
    restoreSelection();

    const sel = window.getSelection();
    if (!sel.rangeCount) {
        toast('Place cursor inside a link first', 'warning');
        return;
    }

    let node = sel.getRangeAt(0).commonAncestorContainer;

    while (node && node !== q('#edContent')) {
        if (node.nodeType === 1 && node.tagName === 'A') {
            const text = document.createTextNode(node.textContent);
            node.parentNode.replaceChild(text, node);
            toast('Link removed', 'success');
            scheduleSave();
            return;
        }
        node = node.parentNode;
    }

    document.execCommand('unlink', false, null);
    q('#edContent').focus();
    scheduleSave();
}

// ==================== CONTENT HANDLERS ====================
function onContentChange() {
    scheduleSave();
    updateWordCount();
}

function handleLinkClick(e) {
    if (S.editing) return;

    const link = e.target.closest('a');
    if (!link) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (href) {
        confirm2(
            'Open Link',
            `Open this link in a new tab?<br><br><span style="color:var(--blue);word-break:break-all;font-size:13px;">${esc(href)}</span>`,
            'warn',
            () => window.open(href, '_blank', 'noopener,noreferrer')
        );
    }
}

function showSavedTime(d) {
    q('#edStatusTxt').textContent = d ? `Saved ${fmtDate(d)}` : 'Saved just now';
}

function updateWordCount() {
    const text = strip(q('#edContent').innerHTML || '');
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    q('#edWords').textContent = words + ' word' + (words !== 1 ? 's' : '');
    q('#edChars').textContent = chars + ' char' + (chars !== 1 ? 's' : '');
}

// ==================== COLOR COMMANDS ====================
function setTC(c) {
    restoreSelection();
    document.execCommand('foreColor', false, c);
    q('#tcDot').style.background = c;
    if (c.length === 7) {
        q('#tcWheel').value = c;
        q('#tcHex').value = c.toUpperCase();
    }
    q('#tcPopup').classList.remove('on');
    q('#edContent').focus();
    saveSelection();
    scheduleSave();
}

function setHL(c) {
    restoreSelection();
    if (c === 'transparent') {
        document.execCommand('removeFormat', false, null);
    } else {
        document.execCommand('hiliteColor', false, c);
        q('#hlDot').style.background = c;
        if (c.length === 7) {
            q('#hlWheel').value = c;
            q('#hlHex').value = c.toUpperCase();
        }
    }
    q('#hlPopup').classList.remove('on');
    q('#edContent').focus();
    saveSelection();
    scheduleSave();
}

// ==================== MODAL ====================
function modal(title, body, btns = []) {
    const m = q('#modal');
    m.innerHTML = `
        <div class="m-head">
            <h3>${title}</h3>
            <button class="m-x" id="mx">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
        <div class="m-body">${body}</div>
        <div class="m-foot">${btns.map(b =>
            `<button class="m-btn ${b.c}" data-a="${b.t}">${b.t}</button>`
        ).join('')}</div>`;

    q('#mx').addEventListener('click', closeModal);

    btns.forEach(b => {
        const el = m.querySelector(`[data-a="${b.t}"]`);
        if (el && b.fn) el.addEventListener('click', b.fn);
    });

    q('#modalShade').classList.add('on');
}

function confirm2(title, msg, type, fn) {
    const ico = type === 'err'
        ? '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>'
        : '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

    modal(title, `
        <div class="cf-icon ${type}">${ico}</div>
        <div class="cf-body">
            <h4>${title}</h4>
            <p>${msg}</p>
        </div>
    `, [
        { t: 'Cancel', c: '', fn: closeModal },
        { t: 'Confirm', c: type === 'err' ? 'dan' : 'pri', fn: () => { closeModal(); fn(); } }
    ]);
}

function closeModal() {
    q('#modalShade').classList.remove('on');
}

// ==================== TOASTS ====================
function toast(msg, type = 'info') {
    const icons = {
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C6EF6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = `${icons[type] || icons.info}<span>${msg}</span>`;
    q('#toasts').appendChild(t);

    setTimeout(() => {
        t.classList.add('out');
        setTimeout(() => t.remove(), 300);
    }, 3500);
}

// ==================== NAVIGATION ====================
function openSB() {
    q('#sidebar').classList.add('open');
    q('#mobShade').classList.add('on');
}

function closeSB() {
    q('#sidebar').classList.remove('open');
    q('#mobShade').classList.remove('on');
}

function showEd() {
    if (!S.mobile) return;
    q('#listPanel').classList.add('gone');
    q('#editor').classList.remove('gone');
}

function showList() {
    if (!S.mobile) return;
    q('#editor').classList.add('gone');
    q('#listPanel').classList.remove('gone');
}

function goBack() {
    if (S.editing) {
        S.editing = false;
        clearTimeout(S.saveT);
        applyEdit();
        instantSave();
    }
    showList();
}

// ==================== KEYBOARD ====================
function handleKeys(e) {
    const m = e.ctrlKey || e.metaKey;

    if (m && e.key === 's') {
        e.preventDefault();
        if (S.cur) instantSave();
    }
    if (m && e.key === 'n') {
        e.preventDefault();
        newNote();
    }
    if (m && e.key === 'e') {
        e.preventDefault();
        if (S.cur) toggleEdit();
    }
    if (m && e.key === 'k') {
        e.preventDefault();
        if (S.cur && S.editing) insertLink();
    }
    if (e.key === 'Escape') {
        closeModal();
        qa('.cp-popup').forEach(p => p.classList.remove('on'));
        if (S.mobile) closeSB();
    }
}

// ==================== UTILS ====================
function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function strip(h) {
    const d = document.createElement('div');
    d.innerHTML = h;
    return d.textContent || d.innerText || '';
}

function okHex(s) {
    return /^#[0-9A-Fa-f]{6}$/.test(s);
}

function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    const now = new Date();
    const diff = now - dt;

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';

    const o = { month: 'short', day: 'numeric' };
    if (dt.getFullYear() !== now.getFullYear()) o.year = 'numeric';
    return dt.toLocaleDateString('en-US', o);
}