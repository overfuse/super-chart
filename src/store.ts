import { create } from "zustand";

export interface Row {
	x: number;
	y: number;
}

interface Store {
	x: Float64Array | null;
	y: Float64Array | null;
	setXY: (x: Float64Array | null, y: Float64Array | null) => void;
	S: number; // start index
	N: number; // window size
	P: number; // step per tick
	T: number; // ms per tick
	isPlaying: boolean;
	wrap: boolean; // loop playback
	downsampleRatio: number; // divider for width to compute target points
	useExternalStorage: boolean; // true when rows are stored in worker/IndexedDB
	totalRows: number; // total count when using external storage
	csvProcessMs: number; // time to parse/process CSV in ms
	csvProcessing: boolean; // true while worker is parsing
	csvError: string | null; // set when CSV processing fails
	dataVersion: number; // bump when a new dataset is loaded
	setS: (s: number) => void;
	setN: (n: number) => void;
	setP: (p: number) => void;
	setT: (t: number) => void;
	setIsPlaying: (v: boolean) => void;
	setWrap: (v: boolean) => void;
	setDownsampleRatio: (v: number) => void;
	setUseExternalStorage: (v: boolean) => void;
	setTotalRows: (n: number) => void;
	setCsvProcessMs: (n: number) => void;
	setCsvProcessing: (v: boolean) => void;
	setCsvError: (m: string | null) => void;
	bumpDataVersion: () => void;
	reset: () => void;
	resetControls: () => void;
	jumpToEnd: () => void;
}

export const useStore = create<Store>((set, get) => ({
	x: null,
	y: null,
	setXY: (x, y) => set({ x, y }),
	S: 0,
	N: 5_000,
	P: 10,
	T: 500,
	isPlaying: false,
	wrap: false,
	downsampleRatio: 2,
	useExternalStorage: false,
	totalRows: 0,
	csvProcessMs: 0,
	csvProcessing: false,
	csvError: null,
	dataVersion: 0,
	setS: (S) => set({ S }),
	setN: (N) =>
		set((state) => {
			const localLen = state.x ? state.x.length : 0;
			const total = state.useExternalStorage ? state.totalRows : localLen;
			const clamped = Math.max(1, Math.min(N, total > 0 ? total : N));
			// If S + N exceeds total, adjust S to keep window in bounds
			const maxStart = Math.max(0, total - clamped);
			const newS = Math.min(state.S, maxStart);
			return { N: clamped, S: newS };
		}),
	setP: (P) => set({ P }),
	setT: (T) => set({ T }),
	setIsPlaying: (isPlaying) => set({ isPlaying }),
	setWrap: (wrap) => set({ wrap }),
	setDownsampleRatio: (v) => set({ downsampleRatio: Math.max(1, Math.floor(v)) }),
	setUseExternalStorage: (v) => set({ useExternalStorage: v }),
	setTotalRows: (n) => set({ totalRows: Math.max(0, n) }),
	setCsvProcessMs: (n) => set({ csvProcessMs: Math.max(0, n) }),
	setCsvProcessing: (v) => set({ csvProcessing: v }),
	setCsvError: (m: string | null) => set({ csvError: m }),
	bumpDataVersion: () => set((s) => ({ dataVersion: (s.dataVersion || 0) + 1 })),
	reset: () => set({ S: 0 }),
	resetControls: () =>
		set((state) => {
			const localLen = state.x ? state.x.length : 0;
			const total = state.useExternalStorage ? state.totalRows : localLen;
			const defaultN = 5_000;
			const clampedN = Math.max(1, Math.min(defaultN, total > 0 ? total : defaultN));
			return {
				S: 0,
				N: clampedN,
				P: 10,
				T: 500,
				isPlaying: false,
				wrap: false,
				downsampleRatio: 2,
				useExternalStorage: false,
				totalRows: 0,
				csvProcessMs: 0,
			};
		}),
	jumpToEnd: () => {
		const state = get();
		const localLen = state.x ? state.x.length : 0;
		const total = state.useExternalStorage ? state.totalRows : localLen;
		set({ S: Math.max(0, total - state.N) });
	},
}));
