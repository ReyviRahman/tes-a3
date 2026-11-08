import type { Worksheet } from 'exceljs';
import { criteria, juryIds, juryValue, participantIds, summary, type State } from './domain';

function styleSheet(sheet: Worksheet, widths: number[]) {
  sheet.columns.forEach((column, index) => { column.width = widths[index]; });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: widths.length } };
  sheet.eachRow((row, index) => {
    row.height = index === 1 ? 34 : 32;
    row.eachCell(cell => {
      cell.font = { name: 'Calibri', size: 11, color: { argb: index === 1 ? 'FFFFFFFF' : 'FF20334A' }, bold: index === 1 };
      cell.alignment = { vertical: 'middle', wrapText: true };
      if (index === 1 || index % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index === 1 ? 'FF122D50' : 'FFF0F5FA' } };
    });
  });
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:1' };
}

export async function exportXlsx(state: State): Promise<Uint8Array<ArrayBuffer>> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MSI Awards';
  workbook.title = 'Rekap penilaian MSI Awards';
  workbook.subject = 'Salinan data tersimpan saat ekspor; bukan penetapan penghargaan';
  const recap = workbook.addWorksheet('Rekap');
  recap.addRow(['Kode peserta', 'Nama peserta', 'Nilai J1', 'Nilai J2', 'Status peserta', 'Nilai perusahaan']);
  for (const p of participantIds) {
    const result = summary(state, p);
    recap.addRow([p, state.participants[p], result.j1, result.j2, result.final === null ? 'Belum lengkap' : 'Lengkap', result.final]);
  }
  styleSheet(recap, [16, 34, 15, 15, 22, 22]);
  for (const column of ['C', 'D', 'F']) recap.getColumn(column).numFmt = '0.0';

  const detail = workbook.addWorksheet('Rincian');
  detail.addRow(['Kode peserta', 'Nama peserta', 'Kode juri', 'Nama juri', 'Strategi', 'Implementasi', 'Hasil', 'Catatan', 'Bobot strategi (%)', 'Bobot implementasi (%)', 'Bobot hasil (%)', 'Nilai juri', 'Status juri', 'Status peserta', 'Nilai perusahaan']);
  for (const p of participantIds) for (const j of juryIds) {
    const assessment = state.assessments[p][j];
    const value = juryValue(assessment, state.weights);
    const result = summary(state, p);
    const row = detail.addRow([p, state.participants[p], j, state.juries[j], ...criteria.map(c => assessment.scores[c]), assessment.note,
      ...criteria.map(c => state.weights[c]), value, value === null ? 'Belum lengkap' : 'Lengkap',
      result.final === null ? 'Belum lengkap' : 'Lengkap', result.final]);
    row.getCell('H').numFmt = '@';
  }
  styleSheet(detail, [16, 34, 14, 28, 13, 18, 13, 58, 20, 24, 19, 16, 22, 22, 22]);
  for (const column of ['L', 'O']) detail.getColumn(column).numFmt = '0.0';
  for (const column of ['E', 'F', 'G', 'I', 'J', 'K']) detail.getColumn(column).numFmt = '0.########';
  detail.eachRow((row, index) => {
    if (index === 1) return;
    const lines = String(row.getCell('H').value ?? '').split('\n').reduce((count, line) => count + Math.max(1, Math.ceil(line.length / 50)), 0);
    row.height = Math.min(409, Math.max(32, lines * 16));
  });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function downloadXlsx(state: State): Promise<void> {
  const bytes = await exportXlsx(state);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'MSI-Awards-rekap.xlsx';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
