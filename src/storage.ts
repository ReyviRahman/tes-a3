import { initialState, stateSchema, type Result, type State } from './domain';

export const STORAGE_KEY = 'msi-awards-v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type Loaded = { state: State; warning: string | null };

export function loadState(storage: StoragePort): Loaded {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { state: initialState(), warning: null };
    const parsed = stateSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { state: parsed.data, warning: null };
    return { state: initialState(), warning: 'Data tersimpan tidak valid. Data lama belum ditimpa. Muat data contoh atau simpan data baru untuk menggantinya.' };
  } catch {
    return { state: initialState(), warning: 'Data lokal tidak dapat dibaca. Periksa izin penyimpanan browser. Data lama belum ditimpa.' };
  }
}

export function saveState(storage: StoragePort, state: State): Result<State> {
  const parsed = stateSchema.safeParse(state);
  if (!parsed.success) return { ok: false, error: 'Data tidak valid. Periksa nama, skor, dan total bobot.' };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(parsed.data));
    return { ok: true, value: parsed.data };
  } catch {
    return { ok: false, error: 'Penyimpanan gagal. Perubahan belum tersimpan; rekap dan ekspor tetap memakai data terakhir. Periksa izin atau kapasitas penyimpanan browser, lalu coba lagi.' };
  }
}

export const browserStorage: StoragePort = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
