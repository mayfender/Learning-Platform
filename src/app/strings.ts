// ข้อความ UI ของหน้าที่ไม่ใช่เนื้อหาบทเรียน (ข้อเสนอของ Architect, Designer ปรับได้ที่ไฟล์นี้ที่เดียว — คำถามเปิด Q3)
export const strings = {
  home: {
    welcomeTitle: 'ยินดีต้อนรับ',
    nicknameLabel: 'ชื่อเล่นของลูก',
    nicknameHint: 'เก็บแค่ชื่อเล่นไว้ในเครื่องนี้เท่านั้น',
    startButton: 'เริ่มใช้งาน',
    greeting: (nickname: string) => `สวัสดี ${nickname}`,
    noActivity: 'ยังไม่มีกิจกรรม',
  },
  parent: {
    title: 'หน้าสำหรับพ่อ',
    backHome: 'กลับหน้าหลัก',
    learnerSectionTitle: 'ผู้เรียน',
    currentLearnerLabel: 'ผู้เรียนปัจจุบัน',
    backupSectionTitle: 'สำรองข้อมูล',
    exportButton: 'ดาวน์โหลดไฟล์สำรอง (export)',
    importButton: 'นำเข้าไฟล์ (import)',
    importResult: (a: number, e: number, s: number, i: number) =>
      `นำเข้าแล้ว: ผู้เรียนใหม่ ${a} คน, รายการใหม่ ${e} รายการ, ซ้ำ ${s}, เสีย ${i}`,
    importErrorNotOurFile: 'ไฟล์นี้ไม่ใช่ไฟล์ของแอปนี้',
    importErrorNewerSchema: 'ไฟล์นี้มาจากแอปเวอร์ชันใหม่กว่า กรุณาอัปเดตแอปก่อน',
    backupOverdueWarning: 'ยังไม่ได้สำรองข้อมูลเกิน 7 วัน',
    storageSectionTitle: 'สถานะการเก็บข้อมูล',
    persistGranted: 'เก็บข้อมูลแบบถาวร: ได้',
    persistDenied: 'เก็บข้อมูลแบบถาวร: ไม่ได้',
    persistUnsupported: 'เก็บข้อมูลแบบถาวร: เบราว์เซอร์ไม่รองรับ',
    memoryFallbackWarning: 'บันทึกลงเครื่องไม่ได้ ข้อมูลจะหายเมื่อปิดแอป',
    outboxPending: (n: number) => `มีข้อมูลรอบันทึก ${n} รายการ กำลังลองใหม่`,
    iosInstallHint:
      'บน iPad/iPhone ให้กด แชร์ → เพิ่มไปยังหน้าจอโฮม เพื่อไม่ให้ข้อมูลถูกลบเมื่อไม่ได้เปิด 7 วัน',
    themeSectionTitle: 'ธีม',
    themeSystem: 'ตามเครื่อง',
    themeLight: 'สว่าง',
    themeDark: 'มืด',
  },
  play: {
    notFound: 'ไม่พบกิจกรรมนี้',
    backHome: 'กลับหน้าหลัก',
  },
  updateBanner: {
    message: 'มีเวอร์ชันใหม่',
    action: 'อัปเดตเลย',
  },
  loading: 'กำลังโหลด…',
};
