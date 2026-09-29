// ข้อความหน้านี้ไม่ได้อยู่ใน strings.ts โดยตั้งใจ: หน้านี้เป็น dev-only (โหลดเฉพาะ import.meta.env.DEV
// ผ่าน React.lazy — AC8) การอ้าง strings.ts ที่ใช้ร่วมกับหน้าอื่นจะทำให้ข้อความนี้ติดไปกับ
// production bundle แม้ตัว component จะถูกตัดออกก็ตาม
export function DevManipulatives() {
  return (
    <div>
      <h1>ห้องเครื่องมือ</h1>
      <p>ยังไม่มีอุปกรณ์จำลอง</p>
    </div>
  );
}

export default DevManipulatives;
