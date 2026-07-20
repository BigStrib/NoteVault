// ============================================================
// NOTEVAULT — BLACK & RED — SUPABASE AUTH — DRAG FOLDERS
// ============================================================

const SUPA_URL = 'https://rgzvsxaknntpqvtoqbuo.supabase.co';;
const SUPA_KEY = 'sb_publishable_kQbhLSFLKT3QQhIOoZp59Q_56C-vSbZ';
const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);


const S = {
    user: null, notes: [], folders: [], cur: null,
    filter: 'all', folder: null, sort: 'updated',
    editing: false, search: '', saveT: null,
    saving: false, range: null, cpMode: null,
    mobile: window.innerWidth <= 768,
    drag: { active: false },
    fullscreen: false
};

const q = s => document.querySelector(s);
const qa = s => document.querySelectorAll(s);

const TC = [
    '#FFFFFF','#D4D4D4','#999999','#666666',
    '#FF3B3B','#F97316','#FBBF24','#34D399',
    '#60A5FA','#818CF8','#A78BFA','#F472B6',
    '#FCA5A5','#FDBA74','#FDE68A','#6EE7B7',
    '#93C5FD','#A5B4FC','#C4B5FD','#F9A8D4',
    '#B91C1C','#C2410C','#A16207','#047857',
    '#1D4ED8','#4338CA','#6D28D9','#BE185D'
];
const HC = [
    'transparent','#FEF3C7','#FED7AA','#FECACA',
    '#FCE7F3','#EDE9FE','#DBEAFE','#D1FAE5',
    '#FBBF24','#FB923C','#F87171','#E879F9',
    '#818CF8','#38BDF8','#34D399','#A3E635',
    '#78350F','#7C2D12','#831843','#1E3A8A',
    '#312E81','#581C87','#064E3B','#3F6212'
];
const FC = ['#FF3B3B','#60A5FA','#34D399','#FBBF24','#F97316','#A78BFA','#F472B6','#818CF8','#38BDF8','#FB923C'];

const PX_SIZES = [
    { label: 'Default', value: 'default' },
    { label: '10px', value: '10' },
    { label: '12px', value: '12' },
    { label: '14px', value: '14' },
    { label: '16px', value: '16' },
    { label: '18px', value: '18' },
    { label: '20px', value: '20' },
    { label: '24px', value: '24' },
    { label: '28px', value: '28' },
    { label: '32px', value: '32' },
    { label: '36px', value: '36' },
    { label: '42px', value: '42' },
    { label: '48px', value: '48' },
    { label: '56px', value: '56' },
    { label: '64px', value: '64' },
    { label: '72px', value: '72' }
];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    registerSW();
    buildSizeDropdown();
    injectFullscreenBtn();
    bind();
    initAuth();
});

function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
}

function buildSizeDropdown() {
    const sel = q('#tbSize');
    if (!sel) return;
    sel.innerHTML = '<option value="" disabled selected>Size</option>';
    PX_SIZES.forEach(s => {
        const o = document.createElement('option');
        o.value = s.value;
        o.textContent = s.label;
        sel.appendChild(o);
    });
}

function injectFullscreenBtn() {
    // Don't add if already exists
    if (q('#bFullscreen')) return;
    
    const edBar = q('#edBar');
    if (!edBar) return;
    
    const btn = document.createElement('button');
    btn.className = 'eb-b';
    btn.id = 'bFullscreen';
    btn.title = 'Fullscreen (Ctrl+Shift+F)';
    btn.innerHTML = `
        <span class="fs-expand"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
        </svg></span>
        <span class="fs-shrink" style="display:none"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 14 10 14 10 20"/>
            <polyline points="20 10 14 10 14 4"/>
            <line x1="14" y1="10" x2="21" y2="3"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
        </svg></span>`;
    
    // Insert after the last button in edBar
    edBar.appendChild(btn);
    
    // Bind click
    btn.onclick = toggleFullscreen;
}

// ===== EVENTS =====
function bind() {
    q('#loginForm').onsubmit = doLogin;
    q('#lgEye').onclick = () => { const i = q('#lgPass'); i.type = i.type === 'password' ? 'text' : 'password'; };

    q('#ham').onclick = () => { q('#sidebar').classList.add('open'); q('#shade').classList.add('on'); };
    q('#sbX').onclick = closeSB;
    q('#shade').onclick = closeSB;
    q('#logoutBtn').onclick = doLogout;
    q('#addFolder').onclick = () => folderModal();
    q('#searchBox').oninput = e => { S.search = e.target.value; renderList(); };

    qa('.sb-link').forEach(b => b.onclick = () => setFilter(b.dataset.f));
    qa('.sort').forEach(b => b.onclick = () => setSort(b.dataset.s));

    q('#newNote').onclick = newNote;
    q('#blankNew').onclick = newNote;
    q('#bEdit').onclick = toggleEdit;
    q('#bPin').onclick = doPin;
    q('#bArch').onclick = doArchive;
    q('#bDel').onclick = doDelete;
    q('#edBack').onclick = goBack;
    q('#edFolder').onchange = moveNote;

    const fsBtn = q('#bFullscreen');
    if (fsBtn) fsBtn.onclick = toggleFullscreen;

    q('#edContent').addEventListener('input', onChange);
    q('#edTitle').addEventListener('input', onChange);
    q('#edContent').addEventListener('click', linkClick);
    q('#edContent').addEventListener('mouseup', () => { saveSel(); updateToolbarState(); });
    q('#edContent').addEventListener('keyup', () => { saveSel(); updateToolbarState(); });

    qa('.tb-b[data-c]').forEach(b => {
        b.addEventListener('mousedown', e => e.preventDefault());
        b.addEventListener('click', () => execCmd(b.dataset.c));
    });

    q('#tbHead').addEventListener('mousedown', saveSel);
    q('#tbHead').addEventListener('change', function () {
        if (!this.value) return;
        restoreSel();
        if (this.value === 'normal') {
            document.execCommand('formatBlock', false, 'div');
        } else {
            document.execCommand('formatBlock', false, this.value);
        }
        q('#edContent').focus(); saveSel(); scheduleSave();
        updateToolbarState();
    });

    q('#tbSize').addEventListener('mousedown', saveSel);
    q('#tbSize').addEventListener('change', function () {
        if (!this.value) return;
        restoreSel();
        if (this.value === 'default') {
            removeInlineFontSize();
        } else {
            applyPixelSize(this.value);
        }
        q('#edContent').focus(); saveSel(); scheduleSave();
        updateToolbarState();
        this.value = '';
    });

    q('#tbTextColor').addEventListener('mousedown', e => e.preventDefault());
    q('#tbTextColor').addEventListener('click', () => openCP('text'));
    q('#tbHighlight').addEventListener('mousedown', e => e.preventDefault());
    q('#tbHighlight').addEventListener('click', () => openCP('hl'));
    q('#cpClose').onclick = closeCP;
    q('#cpShade').onclick = closeCP;
    q('#cpWheel').oninput = function () { q('#cpHex').value = this.value.toUpperCase(); };
    q('#cpApply').onclick = () => { const v = q('#cpHex').value; if (/^#[0-9A-Fa-f]{6}$/.test(v)) applyColor(v); };

    q('#tbLink').addEventListener('mousedown', e => e.preventDefault());
    q('#tbLink').addEventListener('click', insertLink);
    q('#tbUnlink').addEventListener('mousedown', e => e.preventDefault());
    q('#tbUnlink').addEventListener('click', removeLink);

    q('#modalBg').onclick = e => { if (e.target === e.currentTarget) closeModal(); };
    document.addEventListener('keydown', keys);
    window.addEventListener('resize', onResize);

    document.addEventListener('selectionchange', () => {
        const ed = q('#edContent');
        if (!ed || !S.editing) return;
        const sel = window.getSelection();
        if (sel.rangeCount && ed.contains(sel.anchorNode)) {
            updateToolbarState();
        }
    });
}

// ===== FULLSCREEN =====
function toggleFullscreen() {
    if (S.mobile) return; // Already fullscreen on mobile
    S.fullscreen = !S.fullscreen;
    const app = q('#app');
    const btn = q('#bFullscreen');
    
    if (S.fullscreen) {
        app.classList.add('fullscreen-doc');
        if (btn) {
            btn.classList.add('on');
            btn.querySelector('.fs-expand').style.display = 'none';
            btn.querySelector('.fs-shrink').style.display = '';
            btn.title = 'Exit Fullscreen (Esc)';
        }
    } else {
        app.classList.remove('fullscreen-doc');
        if (btn) {
            btn.classList.remove('on');
            btn.querySelector('.fs-expand').style.display = '';
            btn.querySelector('.fs-shrink').style.display = 'none';
            btn.title = 'Fullscreen (Ctrl+Shift+F)';
        }
    }
}

// ===== PIXEL SIZE =====
function applyPixelSize(px) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    if (range.collapsed) {
        const span = document.createElement('span');
        span.style.fontSize = px + 'px';
        span.innerHTML = '\u200B';
        range.insertNode(span);
        const nr = document.createRange();
        nr.setStart(span.firstChild, 1);
        nr.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nr);
        return;
    }

    document.execCommand('fontSize', false, '1');
    const editor = q('#edContent');
    const fonts = editor.querySelectorAll('font[size="1"]');
    fonts.forEach(font => {
        const span = document.createElement('span');
        span.style.fontSize = px + 'px';
        while (font.firstChild) {
            span.appendChild(font.firstChild);
        }
        font.parentNode.replaceChild(span, font);
    });
}

function removeInlineFontSize() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    // Use fontSize 7 as a marker to find affected elements
    document.execCommand('fontSize', false, '7');
    const editor = q('#edContent');

    // Remove font tags with size="7"
    const fonts = editor.querySelectorAll('font[size="7"]');
    fonts.forEach(font => {
        // Unwrap all nested spans with fontSize too
        const spans = font.querySelectorAll('span[style*="font-size"]');
        spans.forEach(sp => {
            sp.style.fontSize = '';
            if (!sp.getAttribute('style')?.trim()) {
                // Unwrap span entirely
                while (sp.firstChild) sp.parentNode.insertBefore(sp.firstChild, sp);
                sp.remove();
            }
        });
        // Unwrap the font tag
        while (font.firstChild) font.parentNode.insertBefore(font.firstChild, font);
        font.remove();
    });

    // Also strip font-size from any remaining spans in selection
    const container = range.commonAncestorContainer;
    const root = container.nodeType === 1 ? container : container.parentNode;
    if (root) {
        const styledSpans = root.querySelectorAll('span[style*="font-size"]');
        styledSpans.forEach(sp => {
            if (sel.containsNode(sp, true)) {
                sp.style.fontSize = '';
                if (!sp.getAttribute('style')?.trim()) {
                    while (sp.firstChild) sp.parentNode.insertBefore(sp.firstChild, sp);
                    sp.remove();
                }
            }
        });
    }
}

// ===== TOOLBAR STATE =====
function updateToolbarState() {
    if (!S.editing) return;

    const ed = q('#edContent');
    const sel = window.getSelection();
    if (!sel.rangeCount || !ed.contains(sel.anchorNode)) return;

    // Toggle commands
    const toggleCmds = [
        'bold', 'italic', 'underline', 'strikeThrough',
        'subscript', 'superscript',
        'insertUnorderedList', 'insertOrderedList',
        'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'
    ];

    toggleCmds.forEach(cmd => {
        const btn = q(`.tb-b[data-c="${cmd}"]`);
        if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
    });

    // Heading dropdown
    const headSel = q('#tbHead');
    if (headSel) {
        const block = document.queryCommandValue('formatBlock');
        const normalized = block.toLowerCase().replace(/[<>]/g, '');
        const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'pre'];
        headSel.value = validHeadings.includes(normalized) ? normalized : '';
    }

    // Size dropdown
    const sizeSel = q('#tbSize');
    if (sizeSel) {
        const computedSize = getComputedFontSize();
        if (computedSize) {
            const rounded = Math.round(parseFloat(computedSize));
            const match = PX_SIZES.find(s => s.value !== 'default' && parseInt(s.value) === rounded);
            sizeSel.value = match ? match.value : '';
        } else {
            sizeSel.value = '';
        }
    }

    // Link buttons
    let inLink = false;
    let nd = sel.anchorNode;
    while (nd && nd !== ed) {
        if (nd.nodeType === 1 && nd.tagName === 'A') { inLink = true; break; }
        nd = nd.parentNode;
    }
    const linkBtn = q('#tbLink');
    if (linkBtn) linkBtn.classList.toggle('active', inLink);
    const unlinkBtn = q('#tbUnlink');
    if (unlinkBtn) unlinkBtn.classList.toggle('active', inLink);
}

function getComputedFontSize() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    let node = sel.anchorNode;
    if (node.nodeType === 3) node = node.parentNode;
    if (!node || node.nodeType !== 1) return null;
    return window.getComputedStyle(node).fontSize;
}

function onResize() {
    S.mobile = window.innerWidth <= 768;
    if (!S.mobile) {
        q('#list').classList.remove('gone');
        q('#editor').classList.remove('gone');
        q('#editor').classList.remove('on-mobile');
        closeSB();
    } else {
        if (S.fullscreen) {
            S.fullscreen = false;
            q('#app').classList.remove('fullscreen-doc');
            const btn = q('#bFullscreen');
            if (btn) { btn.classList.remove('on'); q('#fsIconExpand').style.display = ''; q('#fsIconShrink').style.display = 'none'; }
        }
        if (S.cur) {
            q('#list').classList.add('gone');
            q('#editor').classList.remove('gone');
            q('#editor').classList.add('on-mobile');
        } else {
            q('#list').classList.remove('gone');
            q('#editor').classList.add('gone');
            q('#editor').classList.remove('on-mobile');
        }
    }
}

// ===== SELECTION =====
function saveSel() {
    const s = window.getSelection();
    if (s.rangeCount) S.range = s.getRangeAt(0).cloneRange();
}
function restoreSel() {
    if (!S.range) return;
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(S.range);
}

// ===== LOGIN =====
async function doLogin(e) {
    e.preventDefault();
    const email = q('#lgEmail').value.trim(), pw = q('#lgPass').value;
    if (!email || !pw) return loginErr('Enter email and password');
    q('#lgBtn').classList.add('busy'); q('#lgBtn').disabled = true;

    const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) { loginErr(error.message); q('#lgBtn').classList.remove('busy'); q('#lgBtn').disabled = false; return; }
    S.user = data.user; enter();
}

function loginErr(m) {
    q('#lgErrTxt').textContent = m;
    const e = q('#lgErr'); e.classList.remove('on'); void e.offsetWidth; e.classList.add('on');
    setTimeout(() => e.classList.remove('on'), 4000);
}

function doLogout() {
    confirm2('Sign Out', 'Sign out of NoteVault?', 'warn', async () => {
        await sb.auth.signOut();
        S.user = null; S.cur = null; S.notes = []; S.folders = [];
        q('#app').classList.remove('on');
        q('#loginScreen').classList.remove('out');
        q('#lgEmail').value = ''; q('#lgPass').value = '';
        q('#lgBtn').classList.remove('busy'); q('#lgBtn').disabled = false;
    });
}

// ===== ENTER =====
async function enter() {
    q('#loginScreen').classList.add('out');
    q('#app').classList.add('on');
    const n = S.user.user_metadata?.username || S.user.email?.split('@')[0] || 'User';
    q('#uAv').textContent = n.substring(0, 2).toUpperCase();
    q('#uName').textContent = n;

    await loadFolders();
    await loadNotes();

    S.cur = null;
    S.editing = false;
    q('#edBlank').style.display = '';
    q('#edActive').classList.remove('on');

    renderList();
    counts();

    if (S.mobile) {
        q('#list').classList.remove('gone');
        q('#editor').classList.add('gone');
        q('#editor').classList.remove('on-mobile');
    }
}

// ===== DATA =====
async function loadFolders() {
    const { data } = await sb.from('folders').select('*').eq('user_id', S.user.id).order('sort_order');
    S.folders = data || [];
    renderFolders();
}

async function loadNotes() {
    const { data } = await sb.from('notes').select('*').eq('user_id', S.user.id).order('updated_at', { ascending: false });
    S.notes = data || [];
}

// ===== FOLDERS =====
function renderFolders() {
    const c = q('#fList'); c.innerHTML = '';
    S.folders.forEach((f, idx) => {
        const cnt = S.notes.filter(n => n.folder_id === f.id && !n.is_archived).length;
        const d = document.createElement('div');
        d.className = 'fl-item' + (S.filter === 'folder' && S.folder === f.id ? ' active' : '');
        d.dataset.fid = f.id;
        d.dataset.idx = idx;
        d.innerHTML = `
            <div class="fl-grip" title="Drag to reorder">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                    <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                </svg>
            </div>
            <span class="fl-dot" style="background:${f.color}"></span>
            <span class="fl-name">${esc(f.name)}</span>
            <span class="fl-cnt">${cnt}</span>
            <div class="fl-acts">
                <button class="fl-ab fe"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="fl-ab dl fd"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>`;

        d.onclick = e => { if (e.target.closest('.fl-ab') || e.target.closest('.fl-grip')) return; setFolderFilter(f.id, f.name); };
        d.querySelector('.fe').onclick = e => { e.stopPropagation(); folderModal(f); };
        d.querySelector('.fd').onclick = e => { e.stopPropagation(); delFolder(f); };

        const grip = d.querySelector('.fl-grip');
        grip.addEventListener('mousedown', e => dragStart(e, d, idx));
        grip.addEventListener('touchstart', e => dragStart(e, d, idx), { passive: false });
        c.appendChild(d);
    });
    updateFolderSel();
}

// ===== DRAG =====
function dragStart(e, el, idx) {
    e.preventDefault(); e.stopPropagation();
    const container = q('#fList');
    const rect = el.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const clone = el.cloneNode(true);
    clone.classList.add('fl-dragging');
    clone.style.width = rect.width + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.left = rect.left + 'px';
    document.body.appendChild(clone);

    const ph = document.createElement('div');
    ph.className = 'fl-placeholder';
    ph.style.height = rect.height + 'px';
    el.parentNode.insertBefore(ph, el);
    el.classList.add('fl-hidden');

    S.drag = {
        active: true, el, clone, ph,
        offsetY: clientY - rect.top,
        startIdx: idx, curIdx: idx,
        items: Array.from(container.querySelectorAll('.fl-item')).map((item, i) => {
            const r = item.getBoundingClientRect();
            return { el: item, mid: r.top + r.height / 2, idx: i };
        })
    };

    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', dragEnd);
}

function dragMove(e) {
    if (!S.drag.active) return;
    e.preventDefault();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    S.drag.clone.style.top = (clientY - S.drag.offsetY) + 'px';

    let newIdx = S.drag.curIdx;
    for (let i = 0; i < S.drag.items.length; i++) {
        if (i === S.drag.startIdx) continue;
        if (clientY < S.drag.items[i].mid && i < S.drag.curIdx) { newIdx = i; break; }
        if (clientY > S.drag.items[i].mid && i > S.drag.curIdx) newIdx = i;
    }

    if (newIdx !== S.drag.curIdx) {
        S.drag.curIdx = newIdx;
        const container = q('#fList');
        const visible = Array.from(container.querySelectorAll('.fl-item:not(.fl-hidden)'));
        if (newIdx >= visible.length) container.appendChild(S.drag.ph);
        else container.insertBefore(S.drag.ph, visible[newIdx] || null);
    }
}

function dragEnd() {
    if (!S.drag.active) return;
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', dragEnd);

    S.drag.clone.remove();
    S.drag.ph.remove();
    S.drag.el.classList.remove('fl-hidden');
    const { startIdx, curIdx } = S.drag;
    S.drag.active = false;
    if (startIdx !== curIdx) reorderFolders(startIdx, curIdx);
}

async function reorderFolders(from, to) {
    const moved = S.folders.splice(from, 1)[0];
    S.folders.splice(to, 0, moved);
    renderFolders();
    try {
        await Promise.all(S.folders.map((f, i) => {
            f.sort_order = i;
            return sb.from('folders').update({ sort_order: i }).eq('id', f.id);
        }));
    } catch { toast('Failed to save order', 'error'); await loadFolders(); }
}

function updateFolderSel() {
    const s = q('#edFolder');
    s.innerHTML = '<option value="">No folder</option>';
    S.folders.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = f.name; s.appendChild(o); });
    if (S.cur) s.value = S.cur.folder_id || '';
}

function folderModal(ex = null) {
    const isE = !!ex;
    modal(isE ? 'Edit Folder' : 'New Folder', `
        <div class="lg-field"><label>Name</label><input type="text" id="fmN" value="${isE ? esc(ex.name) : ''}" placeholder="Folder name"></div>
        <div class="lg-field"><label>Color</label><div class="fc-grid">${FC.map(c =>
            `<button type="button" class="fc-opt${c === (isE ? ex.color : FC[0]) ? ' sel' : ''}" style="background:${c}" data-c="${c}"></button>`
        ).join('')}</div></div>
        <input type="hidden" id="fmC" value="${isE ? ex.color : FC[0]}">
    `, [
        { t: 'Cancel', c: '', fn: closeModal },
        { t: isE ? 'Save' : 'Create', c: 'pri', fn: () => saveFolder(ex) }
    ]);
    qa('.fc-opt').forEach(b => b.onclick = function () { qa('.fc-opt').forEach(x => x.classList.remove('sel')); this.classList.add('sel'); q('#fmC').value = this.dataset.c; });
    setTimeout(() => q('#fmN')?.focus(), 80);
}

async function saveFolder(ex) {
    const name = (q('#fmN')?.value || '').trim(), color = q('#fmC')?.value || FC[0];
    if (!name) return toast('Enter a name', 'warning');
    if (ex) await sb.from('folders').update({ name, color }).eq('id', ex.id);
    else await sb.from('folders').insert({ user_id: S.user.id, name, color, sort_order: S.folders.length });
    closeModal(); await loadFolders(); await loadNotes(); renderList(); counts();
    toast(ex ? 'Folder updated' : 'Folder created', 'success');
}

function delFolder(f) {
    confirm2('Delete Folder', `Delete <strong>"${esc(f.name)}"</strong>?`, 'err', async () => {
        await sb.from('notes').update({ folder_id: null }).eq('folder_id', f.id);
        await sb.from('folders').delete().eq('id', f.id);
        if (S.folder === f.id) { S.folder = null; S.filter = 'all'; updateNav(); q('#listTitle').textContent = 'All Notes'; }
        await loadFolders(); await loadNotes(); renderList(); counts();
        toast('Folder deleted', 'success');
    });
}

// ===== NOTES =====
async function newNote() {
    const fid = S.folder || S.folders[0]?.id || null;
    const { data, error } = await sb.from('notes').insert({ user_id: S.user.id, title: 'Untitled Note', content: '', folder_id: fid }).select().single();
    if (error) return toast('Failed', 'error');
    S.notes.unshift(data); renderList(); counts();
    pick(data.id);
    S.editing = true; applyEdit();
    q('#edTitle').focus(); q('#edTitle').select();
    toast('Note created', 'success');
    if (S.mobile) showEd();
}

function pick(id) {
    const n = S.notes.find(x => x.id === id);
    if (!n) return;
    if (S.cur && S.editing && S.cur.id !== id) instantSave();
    S.cur = n; S.editing = false;
    q('#edBlank').style.display = 'none';
    q('#edActive').classList.add('on');
    q('#edTitle').value = n.title || '';
    q('#edContent').innerHTML = n.content || '';
    q('#edFolder').value = n.folder_id || '';
    savedTxt(n.updated_at); applyEdit(); pinUI(); archUI(); wc();
    qa('.nc').forEach(c => c.classList.toggle('active', c.dataset.id === id));
    if (S.mobile) showEd();
    clearToolbarState();
}

function clearToolbarState() {
    qa('.tb-b[data-c]').forEach(b => b.classList.remove('active'));
    const linkBtn = q('#tbLink');
    if (linkBtn) linkBtn.classList.remove('active');
    const unlinkBtn = q('#tbUnlink');
    if (unlinkBtn) unlinkBtn.classList.remove('active');
    const headSel = q('#tbHead');
    if (headSel) headSel.value = '';
    const sizeSel = q('#tbSize');
    if (sizeSel) sizeSel.value = '';
}

async function instantSave() {
    if (!S.cur || S.saving) return;
    const t = (q('#edTitle').value || '').trim() || 'Untitled Note';
    const c = q('#edContent').innerHTML;
    if (t === S.cur.title && c === S.cur.content) return;
    S.saving = true;
    const now = new Date().toISOString();
    await sb.from('notes').update({ title: t, content: c, updated_at: now }).eq('id', S.cur.id);
    S.cur.title = t; S.cur.content = c; S.cur.updated_at = now;
    const i = S.notes.findIndex(x => x.id === S.cur.id);
    if (i > -1) S.notes[i] = { ...S.cur };
    savedTxt(); renderList(); S.saving = false;
}

function scheduleSave() {
    clearTimeout(S.saveT);
    q('#edSaved').textContent = 'Saving...';
    S.saveT = setTimeout(() => { if (S.cur && S.editing) instantSave(); }, 1000);
}

async function moveNote() {
    if (!S.cur) return;
    const fid = q('#edFolder').value || null;
    await sb.from('notes').update({ folder_id: fid }).eq('id', S.cur.id);
    S.cur.folder_id = fid;
    const i = S.notes.findIndex(x => x.id === S.cur.id); if (i > -1) S.notes[i].folder_id = fid;
    renderList(); renderFolders(); counts(); toast('Moved', 'success');
}

async function doPin() {
    if (!S.cur) return;
    const v = !S.cur.is_pinned;
    await sb.from('notes').update({ is_pinned: v }).eq('id', S.cur.id);
    S.cur.is_pinned = v;
    const i = S.notes.findIndex(x => x.id === S.cur.id); if (i > -1) S.notes[i].is_pinned = v;
    pinUI(); renderList(); counts(); toast(v ? 'Pinned' : 'Unpinned', 'success');
}
function pinUI() { q('#bPin').classList.toggle('on', !!S.cur?.is_pinned); }

function doArchive() {
    if (!S.cur) return;
    const v = !S.cur.is_archived;
    confirm2(v ? 'Archive' : 'Restore', v ? 'Archive this note?' : 'Restore this note?', 'warn', async () => {
        await sb.from('notes').update({ is_archived: v }).eq('id', S.cur.id);
        S.cur.is_archived = v;
        const i = S.notes.findIndex(x => x.id === S.cur.id); if (i > -1) S.notes[i].is_archived = v;
        archUI(); renderList(); counts(); toast(v ? 'Archived' : 'Restored', 'success');
    });
}
function archUI() { q('#bArch').classList.toggle('on', !!S.cur?.is_archived); }

function doDelete() {
    if (!S.cur) return;
    confirm2('Delete', `Delete <strong>"${esc(S.cur.title)}"</strong> permanently?`, 'err', async () => {
        await sb.from('notes').delete().eq('id', S.cur.id);
        S.notes = S.notes.filter(x => x.id !== S.cur.id);
        S.cur = null;
        q('#edBlank').style.display = '';
        q('#edActive').classList.remove('on');
        renderList(); renderFolders(); counts();
        toast('Deleted', 'success');
        if (S.mobile) showList();
    });
}

// ===== EDIT =====
function toggleEdit() {
    if (S.editing) { S.editing = false; clearTimeout(S.saveT); applyEdit(); instantSave(); clearToolbarState(); }
    else { S.editing = true; applyEdit(); q('#edContent').focus(); }
}

function applyEdit() {
    const c = q('#edContent'), t = q('#edTitle'), tb = q('#tbWrap'), b = q('#bEdit');
    if (S.editing) {
        c.contentEditable = 'true'; t.readOnly = false; tb.classList.add('on');
        b.classList.add('editing'); b.querySelector('span').textContent = 'Done';
    } else {
        c.contentEditable = 'false'; t.readOnly = true; tb.classList.remove('on');
        b.classList.remove('editing'); b.querySelector('span').textContent = 'Edit';
    }
}

// ===== LIST =====
function renderList() {
    const c = q('#notesList');
    let ns = filtered();
    if (!ns.length) {
        c.innerHTML = `<div class="list-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><h3>No notes</h3><p>${S.search ? 'Try different search' : 'Create one to start'}</p></div>`;
        return;
    }
    ns = sorted(ns);
    if (S.filter !== 'pinned') { const p = ns.filter(x => x.is_pinned), u = ns.filter(x => !x.is_pinned); ns = [...p, ...u]; }

    c.innerHTML = ns.map(n => {
        const f = S.folders.find(x => x.id === n.folder_id);
        const pre = strip(n.content || '').substring(0, 120) || 'No content';
        return `<div class="nc${S.cur?.id === n.id ? ' active' : ''}" data-id="${n.id}">
            ${n.is_pinned ? '<span class="nc-pin"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17l-5 3 1.5-5.6L4 10.5l5.8-.5L12 5l2.2 5 5.8.5-4.5 3.9L17 20z"/></svg></span>' : ''}
            <div class="nc-t">${esc(n.title || 'Untitled')}</div>
            <div class="nc-p">${esc(pre)}</div>
            <div class="nc-m"><span>${fmtD(n.updated_at)}</span>${f ? `<span class="nc-tag"><i style="background:${f.color}"></i>${esc(f.name)}</span>` : ''}</div>
        </div>`;
    }).join('');

    c.querySelectorAll('.nc').forEach(el => el.onclick = () => pick(el.dataset.id));
}

function filtered() {
    let ns = [...S.notes];
    if (S.search) { const s = S.search.toLowerCase(); ns = ns.filter(n => (n.title || '').toLowerCase().includes(s) || strip(n.content || '').toLowerCase().includes(s)); }
    switch (S.filter) {
        case 'pinned': return ns.filter(n => n.is_pinned && !n.is_archived);
        case 'archived': return ns.filter(n => n.is_archived);
        case 'folder': return ns.filter(n => n.folder_id === S.folder && !n.is_archived);
        default: return ns.filter(n => !n.is_archived);
    }
}

function sorted(ns) {
    switch (S.sort) {
        case 'created': return ns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        case 'title': return ns.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        default: return ns.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }
}

// ===== FILTERS =====
function setFilter(f) {
    S.filter = f; S.folder = null; updateNav();
    q('#listTitle').textContent = { all: 'All Notes', pinned: 'Pinned', archived: 'Archived' }[f];
    renderFolders(); renderList(); closeSB();
}

function setFolderFilter(id, name) {
    S.filter = 'folder'; S.folder = id; updateNav();
    q('#listTitle').textContent = name; renderFolders(); renderList(); closeSB();
}

function updateNav() { qa('.sb-link').forEach(b => b.classList.toggle('active', b.dataset.f === S.filter && S.filter !== 'folder')); }

function setSort(s) { S.sort = s; qa('.sort').forEach(b => b.classList.toggle('active', b.dataset.s === s)); renderList(); }

function counts() {
    q('#cAll').textContent = S.notes.filter(n => !n.is_archived).length;
    q('#cPin').textContent = S.notes.filter(n => n.is_pinned && !n.is_archived).length;
    q('#cArch').textContent = S.notes.filter(n => n.is_archived).length;
    renderFolders();
}

// ===== TOOLBAR =====
function execCmd(c) {
    restoreSel();
    document.execCommand(c, false, null);
    q('#edContent').focus();
    saveSel();
    scheduleSave();
    updateToolbarState();
}

function openCP(mode) {
    saveSel(); S.cpMode = mode;
    q('#cpTitle').textContent = mode === 'text' ? 'Text Color' : 'Highlight Color';
    const colors = mode === 'text' ? TC : HC;
    const grid = q('#cpGrid'); grid.innerHTML = '';
    colors.forEach(c => {
        const b = document.createElement('button');
        b.className = 'cp-sw' + (c === 'transparent' ? ' none' : '');
        if (c !== 'transparent') b.style.background = c;
        b.addEventListener('click', () => applyColor(c));
        grid.appendChild(b);
    });
    if (S.mobile) q('#cpShade').classList.add('on');
    q('#cpanel').classList.add('on');
    if (!S.mobile) {
        const trigger = mode === 'text' ? q('#tbTextColor') : q('#tbHighlight');
        const r = trigger.getBoundingClientRect();
        const p = q('#cpanel');
        p.style.position = 'fixed';
        p.style.top = (r.bottom + 8) + 'px';
        p.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 292)) + 'px';
        p.style.bottom = 'auto'; p.style.right = 'auto';
    }
}

function closeCP() { q('#cpanel').classList.remove('on'); q('#cpShade').classList.remove('on'); }

function applyColor(c) {
    closeCP(); q('#edContent').focus(); restoreSel();
    if (S.cpMode === 'text') { document.execCommand('foreColor', false, c); q('#tcPreview').style.background = c; }
    else { if (c === 'transparent') document.execCommand('removeFormat', false, null); else { document.execCommand('hiliteColor', false, c); q('#hlPreview').style.background = c; } }
    saveSel(); scheduleSave();
}

// ===== LINKS =====
function insertLink() {
    saveSel();
    const sel = window.getSelection(), selText = sel.toString().trim();
    let parentLink = null;
    if (S.range) { let nd = S.range.commonAncestorContainer; while (nd && nd !== q('#edContent')) { if (nd.nodeType === 1 && nd.tagName === 'A') { parentLink = nd; break; } nd = nd.parentNode; } }

    modal('Insert Link', `
        <div class="lg-field"><label>URL</label><input type="text" id="lkUrl" placeholder="https://example.com" value="${parentLink ? esc(parentLink.href) : ''}"></div>
        <div class="lg-field"><label>Text (optional)</label><input type="text" id="lkTxt" placeholder="Display text" value="${esc(parentLink ? parentLink.textContent : selText)}"></div>
    `, [
        { t: 'Cancel', c: '', fn: closeModal },
        { t: parentLink ? 'Update' : 'Insert', c: 'pri', fn: () => applyLinkAction(parentLink, selText) }
    ]);
    setTimeout(() => q('#lkUrl')?.focus(), 80);
}

function applyLinkAction(existing, origText) {
    let url = (q('#lkUrl')?.value || '').trim(), txt = (q('#lkTxt')?.value || '').trim();
    if (!url) return toast('Enter a URL', 'warning');
    if (!/^(https?|ftp):\/\//i.test(url)) url = 'https://' + url;
    closeModal(); q('#edContent').focus();

    if (existing) { existing.href = url; existing.target = '_blank'; if (txt) existing.textContent = txt; scheduleSave(); return; }

    if (S.range) {
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(S.range);
        const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        if (origText && !S.range.collapsed) {
            if (txt && txt !== origText) { S.range.deleteContents(); a.textContent = txt; S.range.insertNode(a); }
            else { try { S.range.surroundContents(a); } catch { const f = S.range.extractContents(); a.appendChild(f); S.range.insertNode(a); } }
        } else {
            a.textContent = txt || url; S.range.deleteContents(); S.range.insertNode(a);
            const sp = document.createTextNode('\u00A0'); a.parentNode.insertBefore(sp, a.nextSibling);
        }
        const nr = document.createRange(); nr.setStartAfter(a); nr.collapse(true); s.removeAllRanges(); s.addRange(nr);
    }
    saveSel(); scheduleSave();
}

function removeLink() {
    restoreSel(); const s = window.getSelection(); if (!s.rangeCount) return;
    let nd = s.getRangeAt(0).commonAncestorContainer;
    while (nd && nd !== q('#edContent')) { if (nd.nodeType === 1 && nd.tagName === 'A') { nd.parentNode.replaceChild(document.createTextNode(nd.textContent), nd); toast('Link removed', 'success'); scheduleSave(); return; } nd = nd.parentNode; }
    document.execCommand('unlink', false, null); q('#edContent').focus(); scheduleSave();
}

// ===== CONTENT =====
function onChange() { scheduleSave(); wc(); updateToolbarState(); }

function linkClick(e) {
    if (S.editing) return;
    const a = e.target.closest('a'); if (!a) return;
    e.preventDefault();
    confirm2('Open Link', `<span style="color:var(--blue);word-break:break-all;font-size:12px;">${esc(a.href)}</span>`, 'warn', () => window.open(a.href, '_blank', 'noopener'));
}

function savedTxt(d) { q('#edSaved').textContent = d ? 'Saved ' + fmtD(d) : 'Saved'; }

function wc() {
    const t = strip(q('#edContent').innerHTML || '');
    const w = t.trim() ? t.trim().split(/\s+/).length : 0;
    q('#edWc').textContent = w + ' words'; q('#edCc').textContent = t.length + ' chars';
}

// ===== MODAL =====
function modal(title, body, btns = []) {
    q('#modal').innerHTML = `
        <div class="m-head"><h3>${title}</h3><button class="m-x" id="mx"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div class="m-body">${body}</div>
        <div class="m-foot">${btns.map(b => `<button class="m-btn ${b.c}" data-a="${b.t}">${b.t}</button>`).join('')}</div>`;
    q('#mx').onclick = closeModal;
    btns.forEach(b => { const el = q(`[data-a="${b.t}"]`); if (el) el.onclick = b.fn; });
    q('#modalBg').classList.add('on');
}

function confirm2(title, msg, type, fn) {
    const ico = type === 'err'
        ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
        : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    modal(title, `<div class="cf-ico ${type}">${ico}</div><div class="cf-txt"><h4>${title}</h4><p>${msg}</p></div>`,
        [{ t: 'Cancel', c: '', fn: closeModal }, { t: 'Confirm', c: type === 'err' ? 'dan' : 'pri', fn: () => { closeModal(); fn(); } }]);
}

function closeModal() { q('#modalBg').classList.remove('on'); }

// ===== TOASTS =====
function toast(msg, type = 'info') {
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
    q('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, 3000);
}

// ===== NAV =====
function closeSB() { q('#sidebar').classList.remove('open'); q('#shade').classList.remove('on'); }
function showEd() {
    if (!S.mobile) return;
    q('#list').classList.add('gone');
    q('#editor').classList.remove('gone');
    q('#editor').classList.add('on-mobile');
}

function showList() {
    if (!S.mobile) return;
    q('#editor').classList.add('gone');
    q('#editor').classList.remove('on-mobile');
    q('#list').classList.remove('gone');
}

function goBack() {
    if (S.editing) { S.editing = false; clearTimeout(S.saveT); applyEdit(); instantSave(); }
    if (S.fullscreen) toggleFullscreen();
    showList();
}

// ===== KEYS =====
function keys(e) {
    const m = e.ctrlKey || e.metaKey;
    if (m && e.key === 's') { e.preventDefault(); if (S.cur) instantSave(); }
    if (m && e.key === 'n') { e.preventDefault(); newNote(); }
    if (m && e.key === 'e') { e.preventDefault(); if (S.cur) toggleEdit(); }
    if (m && e.key === 'k') { e.preventDefault(); if (S.cur && S.editing) insertLink(); }
    if (m && e.shiftKey && e.key === 'F') { e.preventDefault(); if (S.cur && !S.mobile) toggleFullscreen(); }
    if (e.key === 'Escape') {
        if (S.fullscreen) { toggleFullscreen(); return; }
        closeModal(); closeCP(); if (S.mobile) closeSB();
    }
}

// ===== UTILS =====
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function strip(h) { const d = document.createElement('div'); d.innerHTML = h; return d.textContent || ''; }
function fmtD(d) {
    if (!d) return '';
    const dt = new Date(d), now = new Date(), diff = now - dt;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd';
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}