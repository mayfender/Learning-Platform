// ข้อความหน้านี้ไม่ได้อยู่ใน strings.ts โดยตั้งใจ: หน้านี้เป็น dev-only (โหลดเฉพาะ import.meta.env.DEV
// ผ่าน React.lazy — AC8) การอ้าง strings.ts ที่ใช้ร่วมกับหน้าอื่นจะทำให้ข้อความนี้ติดไปกับ
// production bundle แม้ตัว component จะถูกตัดออกก็ตาม
import { useState } from 'react';
import { TenFrame } from '@/manipulatives/TenFrame';

export function DevManipulatives() {
  const [flashKey, setFlashKey] = useState(0);
  const [ended, setEnded] = useState(false);

  return (
    <div>
      <h1>ห้องเครื่องมือ</h1>
      <h2>TenFrame</h2>
      {(['single', 'split-5'] as const).map((colorMode) => (
        <section key={colorMode}>
          <h3>{colorMode}</h3>
          <p>show</p>
          <TenFrame mode="show" filled={7} colorMode={colorMode} size="sm" />
          <p>hidden</p>
          <TenFrame mode="hidden" filled={7} colorMode={colorMode} size="sm" />
        </section>
      ))}
      <h3>flash</h3>
      <button
        type="button"
        onClick={() => {
          setEnded(false);
          setFlashKey((k) => k + 1);
        }}
      >
        แฟลช 1.5 วิ
      </button>
      {flashKey > 0 && (
        <TenFrame
          key={flashKey}
          mode="flash"
          flashMs={1500}
          filled={7}
          colorMode="single"
          size="sm"
          onFlashEnd={() => setEnded(true)}
        />
      )}
      {ended && <p>จบแฟลช</p>}
    </div>
  );
}

export default DevManipulatives;
