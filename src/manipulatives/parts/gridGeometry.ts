// ขนาดของกล่อง 10 ช่องใน viewBox (ใช้ร่วมกันโดย TenFrame และ MakeTenBoard ในรอบถัดไป)
export type CellState = 'empty' | 'dot' | 'added';

export const COLS = 5;
export const ROWS = 2;
export const CELL = 40;
export const PAD = 10;
export const VB_WIDTH = COLS * CELL + PAD * 2;
export const VB_HEIGHT = ROWS * CELL + PAD * 2;
export const DOT_R = 12;
