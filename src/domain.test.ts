import { describe, expect, it } from 'vitest';
import { exampleState, formatValue, initialState, juryValue, parseAssessment, parseScore, parseWeights, participantIds, stateSchema, summary } from './domain';
import ExcelJS from 'exceljs';
import { exportXlsx } from './export';
import { loadState, saveState, STORAGE_KEY } from './storage';

describe('Perhitungan sesuai panduan A3', () => {
  it('menghasilkan seluruh nilai juri dan perusahaan acuan', () => {
    const state = exampleState();
    expect(participantIds.map(p => summary(state, p))).toEqual([
      { j1: 73, j2: 75, completed: 2, final: 74 },
      { j1: 72, j2: 73, completed: 2, final: 72.5 },
      { j1: 83, j2: 80, completed: 2, final: 81.5 },
    ]);
  });
  it('menghitung ulang bobot 50/30/20 untuk semua peserta', () => {
    const state = exampleState();
    state.weights = { strategi: 50, implementasi: 30, hasil: 20 };
    expect(summary(state, 'S01')).toEqual({ j1: 74, j2: 76, completed: 2, final: 75 });
    expect(summary(state, 'S02').final).toBe(72);
    expect(summary(state, 'S03').final).toBe(83);
  });
  it('tidak menghitung nilai final saat satu skor J2 kosong', () => {
    const state = exampleState();
    state.assessments.S01.J2.scores.hasil = null;
    expect(summary(state, 'S01')).toEqual({ j1: 73, j2: null, completed: 1, final: null });
  });
  it('membedakan nol dari kosong dan menerima skor batas', () => {
    const state = initialState();
    state.assessments.S01.J1.scores = { strategi: 0, implementasi: 0, hasil: 0 };
    state.assessments.S01.J2.scores = { strategi: 5, implementasi: 5, hasil: 5 };
    expect(summary(state, 'S01')).toEqual({ j1: 0, j2: 100, completed: 2, final: 50 });
  });
  it('tidak membulatkan nilai juri sebelum merata-ratakan', () => {
    const state = exampleState();
    state.assessments.S01.J1.scores = { strategi: 4.006, implementasi: 4.006, hasil: 4.006 };
    state.assessments.S01.J2.scores = { strategi: 4.001, implementasi: 4.001, hasil: 4.001 };
    expect(juryValue(state.assessments.S01.J1, state.weights)).toBeCloseTo(80.12);
    expect(summary(state, 'S01').final).toBeCloseTo(80.07);
    expect(formatValue(summary(state, 'S01').final)).toBe('80,1');
  });
});

describe('Validasi input', () => {
  it.each(['6', '-1', 'abc', 'NaN', 'Infinity', '0x05', '1e0', '4,2,1'])('menolak skor %s', input => {
    expect(parseScore(input).ok).toBe(false);
  });
  it.each([['0', 0], ['5', 5], ['3.5', 3.5], ['3,5', 3.5], ['', null], [' ', null]])('menerima skor %s', (input, value) => {
    expect(parseScore(String(input))).toEqual({ ok: true, value });
  });
  it('menerima isian belum lengkap dan menolak catatan terlalu panjang', () => {
    expect(parseAssessment({ strategi: '4', implementasi: '', hasil: '3' }, 'Draf').ok).toBe(true);
    expect(parseAssessment({ strategi: '4', implementasi: '3', hasil: '3' }, 'a'.repeat(2001)).ok).toBe(false);
  });
  it.each([
    { strategi: '40', implementasi: '35', hasil: '24' },
    { strategi: '101', implementasi: '0', hasil: '-1' },
    { strategi: '', implementasi: '50', hasil: '50' },
    { strategi: 'abc', implementasi: '35', hasil: '25' },
  ])('menolak bobot invalid %j', weights => { expect(parseWeights(weights).ok).toBe(false); });
  it('menerima bobot desimal dan bobot nol', () => {
    expect(parseWeights({ strategi: '33,3', implementasi: '33.3', hasil: '33.4' }).ok).toBe(true);
    expect(parseWeights({ strategi: '100', implementasi: '0', hasil: '0' }).ok).toBe(true);
  });
});

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

describe('Penyimpanan', () => {
  it('memuat data kosong saat pertama kali dibuka', () => { expect(loadState(memoryStorage())).toEqual({ state: initialState(), warning: null }); });
  it('menyimpan lalu memuat ulang semua data', () => {
    const storage = memoryStorage();
    expect(saveState(storage, exampleState()).ok).toBe(true);
    expect(loadState(storage).state).toEqual(exampleState());
  });
  it('gagal simpan tidak mengubah data dan dapat dicoba kembali', () => {
    const storage = memoryStorage();
    saveState(storage, initialState());
    const unavailable = { ...storage, setItem: () => { throw new Error('Storage unavailable'); } };
    expect(saveState(unavailable, exampleState()).ok).toBe(false);
    expect(loadState(storage).state).toEqual(initialState());
    expect(saveState(storage, exampleState()).ok).toBe(true);
    expect(loadState(storage).state).toEqual(exampleState());
  });
  it('menangani penolakan akses browser', () => {
    const storage = { getItem: () => { throw new Error('Access denied'); }, setItem: () => { throw new Error('Quota'); } };
    expect(loadState(storage).warning).toBeTruthy();
    expect(saveState(storage, exampleState()).ok).toBe(false);
  });
  it.each(['{broken', '{"version":2}', '{"version":1,"weights":{"strategi":6}}'])('tidak menimpa data rusak saat dimuat', raw => {
    const storage = memoryStorage(); storage.setItem(STORAGE_KEY, raw);
    expect(loadState(storage).warning).toBeTruthy();
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });
  it('menolak state yang tidak memenuhi schema', () => {
    const state = exampleState(); state.weights.hasil = 50;
    expect(saveState(memoryStorage(), state).ok).toBe(false);
    expect(stateSchema.safeParse({ ...exampleState(), juries: { J1: 'Satu' } }).success).toBe(false);
  });
});

describe('Ekspor XLSX', () => {
  async function readExport(state = exampleState()) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await exportXlsx(state)).buffer);
    return workbook;
  }
  it('menulis workbook asli dengan nilai numerik, bobot, format, dan rekap yang sesuai', async () => {
    const state = exampleState();
    const workbook = await readExport(state);
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Rekap', 'Rincian']);
    const recap = workbook.getWorksheet('Rekap');
    const detail = workbook.getWorksheet('Rincian');
    expect(recap?.rowCount).toBe(4);
    expect(detail?.rowCount).toBe(7);
    participantIds.forEach((p, index) => {
      expect(recap?.getCell(`F${index + 2}`).value).toBe(summary(state, p).final);
      for (const row of [index * 2 + 2, index * 2 + 3]) expect(detail?.getCell(`O${row}`).value).toBe(summary(state, p).final);
    });
    expect(detail?.getCell('I2').value).toBe(40);
    expect(detail?.getCell('J2').value).toBe(35);
    expect(detail?.getCell('K2').value).toBe(25);
    expect(detail?.getCell('L2').value).toBe(73);
    expect(recap?.getCell('F3').numFmt).toBe('0.0');
    expect(recap?.views[0].state).toBe('frozen');
    expect(recap?.autoFilter).toBeTruthy();
  });
  it('membiarkan nilai tidak lengkap kosong dan mempertahankan nol sebagai angka', async () => {
    const state = initialState();
    state.assessments.S01.J1.scores = { strategi: 0, implementasi: 0, hasil: 0 };
    const workbook = await readExport(state);
    expect(workbook.getWorksheet('Rekap')?.getCell('C2').value).toBe(0);
    expect(workbook.getWorksheet('Rekap')?.getCell('D2').value).toBeNull();
    expect(workbook.getWorksheet('Rekap')?.getCell('F2').value).toBeNull();
    expect(workbook.getWorksheet('Rekap')?.getCell('E2').value).toBe('Belum lengkap');
    expect(workbook.getWorksheet('Rincian')?.getCell('G3').value).toBeNull();
  });
  it('menyimpan catatan formula, kutip, dan baris baru sebagai teks asli', async () => {
    const state = exampleState();
    state.assessments.S01.J1.note = '=SUM(1;2)';
    state.assessments.S01.J2.note = 'Baris "satu";\nbaris dua';
    const workbook = await readExport(state);
    expect(workbook.getWorksheet('Rincian')?.getCell('H2').value).toBe('=SUM(1;2)');
    expect(workbook.getWorksheet('Rincian')?.getCell('H2').type).toBe(ExcelJS.ValueType.String);
    expect(workbook.getWorksheet('Rincian')?.getCell('H3').value).toBe(state.assessments.S01.J2.note);
  });
  it('mengekspor hasil bobot baru tanpa membulatkan nilai mentah', async () => {
    const state = exampleState();
    state.weights = { strategi: 50, implementasi: 30, hasil: 20 };
    state.assessments.S01.J1.scores.strategi = 4.123;
    const workbook = await readExport(state);
    expect(workbook.getWorksheet('Rekap')?.getCell('F2').value).toBeCloseTo(summary(state, 'S01').final ?? NaN);
    expect(workbook.getWorksheet('Rincian')?.getCell('E2').value).toBe(4.123);
    expect(workbook.getWorksheet('Rincian')?.getCell('I2').value).toBe(50);
  });
});
