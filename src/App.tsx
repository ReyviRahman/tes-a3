import { useEffect, useRef, useState } from 'react';
import { criteria, emptyAssessment, exampleState, formatValue, juryIds, juryValue, labels, parseAssessment, parseScore, parseWeights, participantIds, scoreInputs, summary, type JuryId, type ParticipantId, type Role, type ScoreInputs, type State } from './domain';
import { browserStorage, loadState, saveState } from './storage';
import { downloadXlsx } from './export';

type Notice = { kind: 'success' | 'error'; text: string } | null;
type EditorProps = { state: State; save: (next: State) => void; changed: () => void };

function ValidationDialog({ message, dismiss }: { message: string; dismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className="validation-dialog" aria-labelledby="validation-title" aria-describedby="validation-message" onCancel={dismiss}>
    <h2 id="validation-title">Data gagal disimpan</h2>
    <p id="validation-message">{message}</p>
    <p className="hint">Isian Anda tetap tersedia. Perbaiki input, lalu simpan kembali.</p>
    <button type="button" className="button primary" onClick={dismiss} autoFocus>Perbaiki input</button>
  </dialog>;
}

function AwardMark() {
  return <svg viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M11 4h18v12c0 7-4 12-9 12S11 23 11 16V4Z" stroke="currentColor" strokeWidth="2.2"/><path d="M11 8H5v6c0 6 4 9 9 9M29 8h6v6c0 6-4 9-9 9M20 28v10m-8 5h16m-12-5h8v5H16v-5Z" stroke="currentColor" strokeWidth="2.2"/><path d="m20 9 1.6 3.3 3.6.5-2.6 2.6.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.6 3.6-.5L20 9Z" fill="currentColor"/></svg>;
}

function Status({ complete }: { complete: boolean }) {
  return <span className={`status ${complete ? 'complete' : 'incomplete'}`}><span />{complete ? 'Lengkap' : 'Belum lengkap'}</span>;
}

function Breakdown({ state, participant }: { state: State; participant: ParticipantId }) {
  return <div className="breakdown">{juryIds.map(j => {
    const assessment = state.assessments[participant][j];
    const value = juryValue(assessment, state.weights);
    return <div key={j}><div className="section-line"><strong>{j} · {state.juries[j]}</strong><b>{formatValue(value)}</b></div>
      {criteria.map(c => <div className="calculation" key={c}><span>{labels[c]}</span><span>{assessment.scores[c] ?? '…'} ÷ 5 × {state.weights[c]}</span><strong>{formatValue(assessment.scores[c] === null ? null : assessment.scores[c] / 5 * state.weights[c])}</strong></div>)}
      <p className="note">{assessment.note || 'Tidak ada catatan.'}</p>
    </div>;
  })}<p className="formula-foot">Nilai perusahaan = (nilai J1 + nilai J2) ÷ 2. Pembulatan satu desimal hanya pada tampilan dan ekspor.</p></div>;
}

function Dashboard({ state }: { state: State }) {
  const [detail, setDetail] = useState<ParticipantId>('S01');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  async function download() {
    setExporting(true);
    setExportError('');
    try { await downloadXlsx(state); }
    catch { setExportError('Ekspor XLSX gagal. Coba unduh lagi. Data penilaian tetap tersimpan.'); }
    finally { setExporting(false); }
  }
  return <>
    <section className="panel results" aria-labelledby="rekap-title">
      <div className="panel-heading"><div><h2 id="rekap-title">Rekap penilaian</h2><p>Nilai tersimpan, pada skala 0–100.</p></div><button className="button secondary" disabled={exporting} onClick={download}>{exporting ? 'Menyiapkan XLSX…' : '↓ Ekspor XLSX'}</button></div>
      {exportError && <p role="alert" className="notice error">{exportError}</p>}
      <div className="table-scroll"><table><thead><tr><th>Peserta</th><th>Juri J1</th><th>Juri J2</th><th>Kelengkapan</th><th>Nilai perusahaan</th></tr></thead><tbody>
        {participantIds.map(p => { const result = summary(state, p); return <tr key={p}>
          <td><div className="participant-cell"><span className="code">{p}</span><strong>{state.participants[p]}</strong></div></td>
          <td>{formatValue(result.j1)}</td><td>{formatValue(result.j2)}</td><td><Status complete={result.final !== null} /><small>{result.completed}/2 juri</small></td>
          <td><strong className="final-score">{formatValue(result.final)}</strong></td>
        </tr>; })}
      </tbody></table></div>
      <div className="table-footer">Nilai final tersedia setelah kedua juri melengkapi seluruh skor. Rekap ini bukan penetapan penghargaan.</div>
    </section>
    <section className="panel" aria-labelledby="rincian-title"><div className="panel-heading"><div><h2 id="rincian-title">Di balik angkanya</h2><p>Skor ÷ 5 × bobot, lalu jumlahkan kontribusinya.</p></div><label className="inline-select">Peserta rincian<select value={detail} onChange={e => { const id = participantIds.find(p => p === e.target.value); if (id) setDetail(id); }}>{participantIds.map(p => <option key={p} value={p}>{p}</option>)}</select></label></div><Breakdown state={state} participant={detail} /></section>
  </>;
}

function JuryForm({ state, jury, participant, save, changed }: EditorProps & { jury: JuryId; participant: ParticipantId }) {
  const assessment = state.assessments[participant][jury];
  const [inputs, setInputs] = useState<ScoreInputs>(() => scoreInputs(assessment));
  const [note, setNote] = useState(assessment.note);
  const [error, setError] = useState('');
  const parsed = parseAssessment(inputs, note);
  const preview = parsed.ok ? juryValue(parsed.value, state.weights) : null;
  return <form className="panel jury-form" noValidate onSubmit={e => {
    e.preventDefault();
    if (!parsed.ok) { setError(parsed.error); return; }
    const next = structuredClone(state);
    next.assessments[participant][jury] = parsed.value;
    save(next);
  }}>
    <div className="panel-heading"><div><h2>Penilaian {participant}</h2><p>{state.participants[participant]} · Diisi oleh {jury}, {state.juries[jury]}</p></div><span className="tag">Skala 0–5</span></div>
    <div className="score-fields">{criteria.map(c => {
      const validation = parseScore(inputs[c]);
      return <div className="score-field" key={c}><div className="section-line"><label htmlFor={`score-${c}`}>{labels[c]}</label><span>Bobot {state.weights[c]}%</span></div>
        <input id={`score-${c}`} inputMode="decimal" autoComplete="off" value={inputs[c]} placeholder="0–5" aria-invalid={!validation.ok} aria-describedby={`help-${c}`} onChange={e => { setInputs({ ...inputs, [c]: e.target.value }); setError(''); changed(); }} />
        <small id={`help-${c}`} className={!validation.ok ? 'field-error' : ''}>{!validation.ok ? validation.error : `Kontribusi: ${formatValue(validation.value === null ? null : validation.value / 5 * state.weights[c])} poin`}</small>
      </div>;
    })}</div>
    <div className="form-body"><label htmlFor="note">Catatan penilaian <span className="muted">· opsional</span></label><textarea id="note" rows={3} maxLength={2000} value={note} placeholder="Tuliskan pertimbangan di balik skor Anda…" onChange={e => { setNote(e.target.value); changed(); }} /><small>{note.length}/2.000 karakter</small>
      <p className="hint">Isian kosong dapat disimpan sebagai penilaian belum lengkap. Angka 0 adalah skor yang sah.</p>
      {error && <ValidationDialog message={error} dismiss={() => setError('')} />}
    </div>
    <div className="form-bottom"><div><small>Pratinjau nilai juri · belum disimpan</small><strong className="preview-value">{formatValue(preview)}<span>/100</span></strong></div><button className="button primary" type="submit">Simpan penilaian</button></div>
  </form>;
}

function Settings({ state, save, changed }: EditorProps) {
  const [weights, setWeights] = useState<ScoreInputs>({ strategi: String(state.weights.strategi), implementasi: String(state.weights.implementasi), hasil: String(state.weights.hasil) });
  const [participants, setParticipants] = useState(state.participants);
  const [juries, setJuries] = useState(state.juries);
  const [error, setError] = useState('');
  return <form className="panel settings" noValidate onSubmit={e => {
    e.preventDefault();
    const result = parseWeights(weights);
    if (!result.ok) { setError(result.error); return; }
    if ([...Object.values(participants), ...Object.values(juries)].some(name => !name.trim())) { setError('Nama peserta dan juri tidak boleh kosong.'); return; }
    setError('');
    save({ ...state, weights: result.value, participants, juries });
  }}>
    <div className="panel-heading"><div><h2>Pengaturan penjurian</h2><p>Perubahan bobot menghitung ulang seluruh nilai tersimpan.</p></div><span className="tag">Admin</span></div>
    <div className="settings-content"><fieldset><legend>Bobot kriteria</legend><div className="weight-fields">{criteria.map(c => <label key={c}>{labels[c]}<div className="input-suffix"><input aria-label={`Bobot ${labels[c]}`} inputMode="decimal" value={weights[c]} onChange={e => { setWeights({ ...weights, [c]: e.target.value }); setError(''); changed(); }} /><span>%</span></div></label>)}</div><small>Total bobot harus 100%. Setiap bobot berada dalam rentang 0–100%.</small></fieldset>
    <div className="name-fields"><fieldset><legend>Nama peserta</legend>{participantIds.map(p => <label key={p}>{p}<input aria-label={`Nama ${p}`} maxLength={80} value={participants[p]} onChange={e => { setParticipants({ ...participants, [p]: e.target.value }); changed(); }} /></label>)}</fieldset>
    <fieldset><legend>Nama juri</legend>{juryIds.map(j => <label key={j}>{j}<input aria-label={`Nama ${j}`} maxLength={80} value={juries[j]} onChange={e => { setJuries({ ...juries, [j]: e.target.value }); changed(); }} /></label>)}</fieldset></div>
    {error && <ValidationDialog message={error} dismiss={() => setError('')} />}
    <button className="button primary" type="submit">Simpan pengaturan</button></div>
  </form>;
}

export default function App() {
  const [loaded] = useState(() => loadState(browserStorage));
  const [state, setState] = useState(loaded.state);
  const [role, setRole] = useState<Role>('Admin');
  const [page, setPage] = useState<'rekap' | 'pengaturan'>('rekap');
  const [participant, setParticipant] = useState<ParticipantId>('S01');
  const [notice, setNotice] = useState<Notice>(loaded.warning ? { kind: 'error', text: loaded.warning } : null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<State | null>(null);
  const [revision, setRevision] = useState(0);
  const completeCount = participantIds.reduce((n, p) => n + summary(state, p).completed, 0);

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  function changed() { setDirty(true); setPending(null); setNotice(null); }
  function save(next: State) {
    const result = saveState(browserStorage, next);
    if (result.ok) {
      setState(result.value); setPending(null); setDirty(false); setRevision(r => r + 1);
      setNotice({ kind: 'success', text: 'Data berhasil disimpan. Rekap dan ekspor sudah diperbarui.' });
    } else { setPending(next); setDirty(true); setNotice({ kind: 'error', text: result.error }); }
  }
  function navigate(action: () => void) {
    if (dirty && !window.confirm('Ada perubahan belum tersimpan. Buang perubahan dan pindah tampilan?')) return;
    setDirty(false); setPending(null); setNotice(null); setRevision(r => r + 1); action();
  }
  function replace(kind: 'example' | 'clear') {
    if (!window.confirm(kind === 'example' ? 'Ganti seluruh data dan perubahan belum tersimpan dengan data contoh dari panduan?' : 'Kosongkan seluruh skor dan catatan? Nama serta bobot tetap dipertahankan. Perubahan belum tersimpan akan dibuang.')) return;
    if (kind === 'example') { save(exampleState()); return; }
    const next = structuredClone(state);
    for (const p of participantIds) for (const j of juryIds) next.assessments[p][j] = emptyAssessment();
    save(next);
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><AwardMark /></div><div><strong>MSI Group</strong><span>Awards workspace</span></div></div>
      <div className="edition"><span className="edition-line" /><span>Simulasi penjurian A3</span></div>
      <nav aria-label="Navigasi utama"><button className={page === 'rekap' ? 'nav-item active' : 'nav-item'} onClick={() => navigate(() => setPage('rekap'))}><span aria-hidden="true">▦</span>{role === 'Admin' ? 'Rekap penilaian' : 'Meja penilaian'}<span className="nav-count">{role === 'Admin' ? '03' : '3'}</span></button>{role === 'Admin' && <button className={page === 'pengaturan' ? 'nav-item active' : 'nav-item'} onClick={() => navigate(() => setPage('pengaturan'))}><span aria-hidden="true">⚙</span>Pengaturan</button>}</nav>
      <div className="sidebar-guide"><AwardMark /><h2>Setiap nilai punya dasar.</h2><p>Tiga kriteria. Dua sudut pandang. Satu perhitungan yang dapat diperiksa.</p><div className="sidebar-weights">{criteria.map(c => <div key={c}><span>{labels[c]}</span><b>{state.weights[c]}%</b></div>)}</div></div>
      <div className="sidebar-footer"><span className="local-dot" /> Demo lokal<span>Data tersimpan di browser ini</span></div>
    </aside>
    <div className="workspace"><header className="topbar"><div>MSI Awards <span>/</span> {role === 'Admin' ? 'Ruang admin' : 'Ruang juri'}</div><label className="role-switch">Tampilan peran<select value={role} onChange={e => { const selected = e.target.value; if (selected === 'Admin' || selected === 'J1' || selected === 'J2') navigate(() => { setRole(selected); setPage('rekap'); }); }}><option value="Admin">Admin</option>{juryIds.map(j => <option key={j} value={j}>{j} · {state.juries[j]}</option>)}</select></label></header>
    <main>
      <div className="simulation-banner"><span aria-hidden="true">ⓘ</span> Simulasi peran, bukan autentikasi produksi</div>
      <div className="page-heading"><div><h1>{role !== 'Admin' ? 'Meja penilaian' : page === 'rekap' ? 'Ruang rekap awards' : 'Atur penjurian'}</h1><p>{role !== 'Admin' ? 'Nilai setiap peserta berdasarkan tiga kriteria yang sama.' : page === 'rekap' ? 'Pantau kelengkapan, telusuri angka, dan siapkan laporan.' : 'Siapkan identitas dan bobot sebelum melanjutkan penilaian.'}</p></div><span className="session-tag">Sesi simulasi <b>A3</b></span></div>
      {notice && <div className={`notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}><span>{notice.text}</span>{pending && <button className="button secondary" onClick={() => save(pending)}>Coba lagi</button>}</div>}
      {dirty && <div className="unsaved" role="status">Ada perubahan belum tersimpan. Simpan sebelum berpindah tampilan.</div>}
      <section className="overview" aria-label="Ringkasan sesi"><div><span>Peserta</span><strong>03</strong><small>Perusahaan fiktif</small></div><div><span>Juri</span><strong>02</strong><small>Penilaian independen</small></div><div className="progress-stat"><span>Penilaian lengkap</span><strong>{completeCount}<em>/ 6</em></strong><div className="progress-track"><div style={{ width: `${completeCount / 6 * 100}%` }} /></div></div><div><span>Status sesi</span><strong className="session-status">{completeCount === 6 ? 'Siap direkap' : 'Dalam proses'}</strong><small>{completeCount === 6 ? 'Seluruh skor telah terisi' : `${6 - completeCount} penilaian belum lengkap`}</small></div></section>
      {role === 'Admin' ? page === 'rekap' ? <Dashboard state={state} /> : <Settings key={revision} state={state} save={save} changed={changed} /> : <>
        <div className="participant-tabs" aria-label="Pilih peserta">{participantIds.map(p => <button key={p} aria-pressed={participant === p} className={participant === p ? 'selected' : ''} onClick={() => navigate(() => setParticipant(p))}><span>{p}</span><strong>{state.participants[p]}</strong><Status complete={juryValue(state.assessments[p][role], state.weights) !== null} /></button>)}</div>
        <JuryForm key={`${role}-${participant}-${revision}`} state={state} jury={role} participant={participant} save={save} changed={changed} />
        <div className="jury-reminder">Anda mengisi penilaian sebagai {role}. Rekap seluruh juri tersedia pada tampilan Admin.</div>
      </>}
      {role === 'Admin' && <details className="demo-tools"><summary>Peralatan demo & pengujian <span>Data contoh dan reset penilaian</span></summary><div className="demo-tools-body"><div className="demo-actions"><button className="button secondary" onClick={() => replace('example')}>Muat data contoh</button><button className="button danger" onClick={() => replace('clear')}>Kosongkan penilaian</button></div><p>Data contoh mengikuti angka pada panduan A3. Untuk menguji validasi, masukkan skor di luar 0–5 atau total bobot selain 100%.</p></div></details>}
      <footer className="main-footer"><span>MSI Group · Simulasi tes praktik</span><span>Disimpan di perangkat ini · Tanpa sinkronisasi</span></footer>
    </main></div>
  </div>;
}
