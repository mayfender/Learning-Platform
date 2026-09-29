import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestPersistence } from '@/store/persist';

const originalStorage = navigator.storage;

afterEach(() => {
  Object.defineProperty(navigator, 'storage', { value: originalStorage, configurable: true });
});

describe('requestPersistence', () => {
  it('คืน unsupported ถ้าเบราว์เซอร์ไม่มี navigator.storage.persist', async () => {
    Object.defineProperty(navigator, 'storage', { value: {}, configurable: true });
    expect(await requestPersistence()).toBe('unsupported');
  });

  it('คืน granted ถ้า persisted() เป็นจริงอยู่แล้ว', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { persisted: vi.fn().mockResolvedValue(true), persist: vi.fn() },
      configurable: true,
    });
    expect(await requestPersistence()).toBe('granted');
  });

  it('เรียก persist() แล้วคืนผลตามที่ได้ (granted)', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        persisted: vi.fn().mockResolvedValue(false),
        persist: vi.fn().mockResolvedValue(true),
      },
      configurable: true,
    });
    expect(await requestPersistence()).toBe('granted');
  });

  it('เรียก persist() แล้วคืน denied ถ้าไม่อนุญาต', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        persisted: vi.fn().mockResolvedValue(false),
        persist: vi.fn().mockResolvedValue(false),
      },
      configurable: true,
    });
    expect(await requestPersistence()).toBe('denied');
  });
});
