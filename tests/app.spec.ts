import { expect, test, type Page } from '@playwright/test';
import ExcelJS from 'exceljs';

async function loadExample(page: Page) {
  await page.goto('/');
  await page.getByText('Peralatan demo & pengujian', { exact: false }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Muat data contoh' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'berhasil disimpan' })).toBeVisible();
}

test('A3-D01 input sampai ekspor, persistensi, dan rincian', async ({ page }) => {
  await loadExample(page);
  await expect(page.getByRole('cell', { name: '74,0', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '72,5', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '81,5', exact: true })).toBeVisible();
  await page.getByLabel('Tampilan peran').selectOption('J1');
  await page.getByLabel('Strategi', { exact: true }).fill('4,5');
  await page.getByLabel('Catatan penilaian', { exact: false }).fill('Strategi dinilai lebih kuat.');
  await page.getByRole('button', { name: 'Simpan penilaian' }).click();
  await page.reload();
  await expect(page.getByRole('cell', { name: '76,0', exact: true })).toBeVisible();
  await expect(page.getByText('Strategi dinilai lebih kuat.')).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Ekspor XLSX' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('MSI-Awards-rekap.xlsx');
  const file = await download.path();
  expect(file).not.toBeNull();
  if (file) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    expect(workbook.getWorksheet('Rekap')?.getCell('F2').value).toBe(76);
    expect(workbook.getWorksheet('Rincian')?.getCell('L2').value).toBe(77);
    expect(workbook.getWorksheet('Rincian')?.getCell('H2').value).toBe('Strategi dinilai lebih kuat.');
  }
});

test('A3-U01 skor invalid, kosong, nol, dan batas lima', async ({ page }) => {
  await loadExample(page);
  await page.getByLabel('Tampilan peran').selectOption('J2');
  const score = page.getByLabel('Strategi', { exact: true });
  for (const value of ['6', '-1', 'abc']) {
    await score.fill(value);
    await page.getByRole('button', { name: 'Simpan penilaian' }).click();
    await expect(page.getByRole('dialog')).toContainText('rentang 0–5');
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Perbaiki input' })).toBeFocused();
    if (value === '6') await page.screenshot({ path: 'docs/evidence/A3-U01-modal-validasi.png' });
    await page.getByRole('button', { name: 'Perbaiki input' }).click();
    await expect(score).toHaveValue(value);
  }
  await score.fill('');
  await page.getByRole('button', { name: 'Simpan penilaian' }).click();
  await page.getByLabel('Tampilan peran').selectOption('Admin');
  const row = page.getByRole('row').filter({ hasText: 'Peserta S01' });
  await expect(row).toContainText('Belum lengkap');
  await expect(row.getByRole('cell').last()).toHaveText('—');
  await page.getByLabel('Tampilan peran').selectOption('J2');
  await score.fill('0');
  await page.getByLabel('Implementasi', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Simpan penilaian' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'berhasil disimpan' })).toBeVisible();
  await page.getByLabel('Tampilan peran').selectOption('Admin');
  await expect(row).toContainText('61,5');
});

test('A3-U01 pengaturan, bobot baru, dan bobot invalid', async ({ page }) => {
  await loadExample(page);
  await page.getByRole('button', { name: 'Pengaturan', exact: false }).click();
  await page.getByLabel('Bobot Strategi').fill('50');
  await page.getByLabel('Bobot Implementasi').fill('30');
  await page.getByLabel('Bobot Hasil').fill('19');
  await page.getByRole('button', { name: 'Simpan pengaturan' }).click();
  await expect(page.getByRole('dialog')).toContainText('total bobot harus 100%');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Bobot Hasil').fill('20');
  await page.getByLabel('Nama S01').fill('Nusantara Satu');
  await page.getByLabel('Nama J1').fill('Rina');
  await page.getByRole('button', { name: 'Simpan pengaturan' }).click();
  await page.getByRole('button', { name: 'Rekap penilaian' }).click();
  const row = page.getByRole('row').filter({ hasText: 'Nusantara Satu' });
  await expect(row).toContainText('74,0');
  await expect(row.getByRole('cell').last()).toHaveText('75,0');
  await expect(page.getByRole('main').getByText('J1 · Rina', { exact: true })).toBeVisible();
});

test('A3-U01 gagal simpan mempertahankan draf dan data tersimpan, lalu coba lagi', async ({ page }) => {
  await loadExample(page);
  await page.getByLabel('Tampilan peran').selectOption('J1');
  const originalSetItem = await page.evaluateHandle(() => Storage.prototype.setItem);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
  await page.getByLabel('Strategi', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Simpan penilaian' }).click();
  await expect(page.getByRole('alert')).toContainText('Penyimpanan gagal');
  await expect(page.getByLabel('Strategi', { exact: true })).toHaveValue('5');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('msi-awards-v1') ?? '{}').assessments.S01.J1.scores.strategi)).toBe(4);
  await page.evaluate(original => { Storage.prototype.setItem = original; }, originalSetItem);
  await originalSetItem.dispose();
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await page.getByLabel('Tampilan peran').selectOption('Admin');
  await expect(page.getByRole('row').filter({ hasText: 'Peserta S01' }).getByRole('cell').last()).toHaveText('78,0');
});

test('A3-S01 peran juri terpisah, konfirmasi pindah dan reset', async ({ page }) => {
  await loadExample(page);
  await expect(page.getByLabel('Simulasikan kegagalan penyimpanan')).toHaveCount(0);
  await page.getByLabel('Tampilan peran').selectOption('J1');
  await expect(page.getByRole('button', { name: 'Pengaturan' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Muat data contoh' })).toHaveCount(0);
  await page.getByLabel('Strategi', { exact: true }).fill('5');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByLabel('Tampilan peran').selectOption('J2');
  await expect(page.getByLabel('Tampilan peran')).toHaveValue('J1');
  await page.getByRole('button', { name: 'Simpan penilaian' }).click();
  await page.getByLabel('Tampilan peran').selectOption('J2');
  await expect(page.getByLabel('Strategi', { exact: true })).toHaveValue('4');
  await page.getByLabel('Tampilan peran').selectOption('Admin');
  await page.getByText('Peralatan demo & pengujian', { exact: false }).click();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Kosongkan penilaian' }).click();
  await expect(page.getByRole('cell', { name: '78,0', exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Kosongkan penilaian' }).click();
  await expect(page.getByRole('cell', { name: /Belum lengkap/ })).toHaveCount(3);
});

test('A3-S01 bukti tampilan desktop dan seluler', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await loadExample(page);
  await page.getByText('Peralatan demo & pengujian', { exact: false }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/evidence/A3-S01-admin.png', fullPage: true });
  await page.getByLabel('Tampilan peran').selectOption('J1');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/evidence/A3-S01-juri.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/evidence/A3-S01-mobile.png', fullPage: true });
  await page.getByLabel('Tampilan peran').selectOption('Admin');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
