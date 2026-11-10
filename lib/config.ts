/**
 * lib/config.ts — NƠI DUY NHẤT chứa mọi hằng số dinh dưỡng & an toàn.
 *
 * Đây là các giá trị MẶC ĐỊNH ƯỚC LƯỢNG theo SPEC.md (mục 3 và 4).
 * Nhóm có thể chỉnh trực tiếp ở đây; engine sẽ tự dùng giá trị mới.
 */

// ─────────────────────────────────────────────
// BMR — công thức Mifflin-St Jeor
// BMR = 10 × kg + 6.25 × cm − 5 × tuổi + hằng số giới tính
// ─────────────────────────────────────────────
export const BMR = {
  HE_SO_CAN_NANG: 10, // nhân với cân nặng (kg)
  HE_SO_CHIEU_CAO: 6.25, // nhân với chiều cao (cm)
  HE_SO_TUOI: 5, // nhân với tuổi rồi TRỪ đi
  HANG_SO_NAM: 5, // nam: +5
  HANG_SO_NU: -161, // nữ: −161
} as const;

// ─────────────────────────────────────────────
// Hệ số công việc (nhân với BMR để ra năng lượng hằng ngày chưa tính tập)
// ─────────────────────────────────────────────
export const HE_SO_CONG_VIEC = {
  ngoi_nhieu: 1.2, // làm văn phòng, học nhiều, ít đi lại
  dung_di_lai: 1.35, // đứng bán hàng, đi lại nhiều
  lao_dong_chan_tay: 1.5, // bốc vác, xây dựng, công việc nặng
} as const;

// ─────────────────────────────────────────────
// MET theo cường độ tập (mức tiêu hao so với lúc nghỉ)
// Calo tập/ngày = (MET − 1) × kg × (giờ tập mỗi tuần) / 7
// Trừ 1 vì phần năng lượng lúc nghỉ đã nằm trong BMR, tránh tính trùng.
// ─────────────────────────────────────────────
export const MET_THEO_CUONG_DO = {
  nhe: 3.5, // đi bộ nhanh, yoga nhẹ
  vua: 5, // đá bóng phong trào, đạp xe vừa
  nang: 8, // chạy nhanh, tập cường độ cao
} as const;
export const MET_NGHI = 1; // phần năng lượng lúc nghỉ được trừ ra

// ─────────────────────────────────────────────
// Điều chỉnh calo theo mục tiêu (tỉ lệ so với TDEE)
// ─────────────────────────────────────────────
export const DIEU_CHINH_CALO = {
  giam_mo: { macDinh: 0.15, toiThieu: 0.1, toiDa: 0.2 }, // cắt 15% (cho chỉnh 10–20%)
  tang_co: { macDinh: 0.08, toiThieu: 0.05, toiDa: 0.1 }, // thêm 8% (cho chỉnh 5–10%)
} as const;

// ─────────────────────────────────────────────
// Mức sàn calo: calo mục tiêu KHÔNG BAO GIỜ thấp hơn max(BMR, mức tối thiểu theo giới)
// Áp dụng cho MỌI mục tiêu (nhóm đã thống nhất).
// ─────────────────────────────────────────────
export const MUC_SAN_CALO = {
  nu: 1200,
  nam: 1500,
} as const;

// ─────────────────────────────────────────────
// Macro
// ─────────────────────────────────────────────
// Protein theo g/kg cân nặng
export const PROTEIN_G_PER_KG = {
  duy_tri: 1.2,
  an_lanh_manh: 1.2,
  giam_mo: 1.6,
  tang_co: 1.8,
} as const;
export const PROTEIN_THEM_KHI_CHOI_THE_THAO = 0.2; // +0.2 g/kg nếu có chơi thể thao

export const TI_LE_CHAT_BEO = 0.25; // chất béo = 25% tổng calo; carb = phần còn lại

// Quy đổi năng lượng
export const KCAL_MOI_GAM = {
  protein: 4,
  carb: 4,
  fat: 9,
} as const;

// ─────────────────────────────────────────────
// Kiểm tra mục tiêu cân nặng
// Tốc độ tính theo % CÂN NẶNG HIỆN TẠI mỗi tuần.
// ─────────────────────────────────────────────
export const TOC_DO_TOI_DA_MOI_TUAN = {
  giam: 0.01, // giảm tối đa 1% cân nặng/tuần
  tang: 0.005, // tăng tối đa 0.5% cân nặng/tuần
} as const;

// ─────────────────────────────────────────────
// An toàn (SPEC mục 4)
// ─────────────────────────────────────────────
export const BMI_TOI_THIEU = 18.5; // dưới mức này là thiếu cân
export const TUOI_TOI_THIEU = 18; // dưới 18 tuổi → tầng 1

// Tầng 2: bệnh nền → tag món cần loại / ưu tiên
export const LOC_THEO_BENH = {
  tieu_duong: { loai: ["nhieu_duong"], uuTien: ["gi_thap"] },
  gout: { loai: ["nhieu_purine"], uuTien: [] },
  huyet_ap_cao: { loai: ["nhieu_muoi"], uuTien: [] },
} as const;

export const GHI_CHU_BAC_SI =
  "Đây là gợi ý chung, không thay thế chỉ định của bác sĩ.";

// ─────────────────────────────────────────────
// Onboarding (SPEC mục 2)
// ─────────────────────────────────────────────

// Danh sách dị ứng ở bước 5. Mã (ma) phải trùng với trường "allergens" trong data/dishes.json.
// Gồm cả "allergen ẩn" hay có sẵn trong món Việt: nước mắm, mắm tôm, đậu phộng.
export const DANH_SACH_DI_UNG = [
  { ma: "dau_phong", ten: "Đậu phộng" },
  { ma: "hai_san_vo", ten: "Tôm, cua (hải sản có vỏ)" },
  { ma: "ca", ten: "Cá" },
  { ma: "trung", ten: "Trứng" },
  { ma: "sua", ten: "Sữa" },
  { ma: "dau_nanh", ten: "Đậu nành" },
  { ma: "gluten", ten: "Lúa mì (gluten)" },
  { ma: "nuoc_mam", ten: "Nước mắm" },
  { ma: "mam_tom", ten: "Mắm tôm" },
] as const;

// Giới hạn nhập liệu hợp lý — ngoài khoảng này app nhờ người dùng kiểm tra lại
export const GIOI_HAN_NHAP = {
  tuoi: { min: 13, max: 100 },
  chieuCaoCm: { min: 120, max: 220 },
  canNangKg: { min: 30, max: 250 },
  soTuan: { min: 1, max: 104 }, // tối đa 2 năm
  soBuoiMoiTuan: { min: 1, max: 14 },
  phutMoiBuoi: { min: 10, max: 300 },
  nganSachMoiBuaVnd: { min: 10000, max: 500000 },
} as const;

// Lựa chọn thời gian nấu tối đa (phút) ở bước 5
export const THOI_GIAN_NAU_LUA_CHON = [15, 30, 60, 120] as const;

// Ngân sách mặc định gợi ý mỗi bữa (VNĐ) — mức phổ biến của sinh viên
export const NGAN_SACH_MAC_DINH_VND = 35000;

// ─────────────────────────────────────────────
// Thực đơn 7 ngày (SPEC mục 5, 6)
// ─────────────────────────────────────────────

// Chia calo theo bữa (tổng = 1)
export const TI_LE_BUA = {
  3: { sang: 0.3, trua: 0.35, toi: 0.35 },
  4: { sang: 0.25, trua: 0.35, toi: 0.3, phu: 0.1 },
} as const;

// Hệ số khẩu phần (ít/vừa/nhiều) nằm trong từng món: trường "portion_factor" của data/dishes.json

export const SO_LAN_TOI_DA_MOI_TUAN = 2; // một món không lặp quá 2 lần/tuần
export const SAI_LECH_CALO_NGAY = 0.1; // tổng ngày phải trong ±10% calo mục tiêu
export const SO_NGAY_THUC_DON = 7;
export const SO_MON_THAY_THE = 3; // nút "Đổi món" đưa ra 3 lựa chọn

// Phong cách High-protein: cộng thêm protein mục tiêu (g/kg)
export const PROTEIN_THEM_HIGH_PROTEIN = 0.4;

// Điểm ưu tiên khi chọn món (điểm càng THẤP càng được chọn).
// Điểm gốc = độ lệch calo so với bữa (vd lệch 10% = 0.1), rồi cộng/trừ các mục dưới.
export const DIEM_CHON_MON = {
  phatMoiLanDaDung: 0.15, // món đã dùng trong tuần bị cộng điểm → thực đơn đa dạng hơn
  thuongHighProtein: 0.15, // phong cách High-protein: món có tag high_protein được trừ điểm
  phatGiaTietKiem: 0.3, // phong cách Tiết kiệm: cộng điểm theo giá (giá / ngân sách × hệ số)
  thuongTagUuTien: 0.1, // tầng 2: món có tag ưu tiên (vd gi_thap với tiểu đường)
  thuongDungNoiAn: 0.03, // ưu tiên nhẹ món hợp thói quen ăn ngoài / nấu nhà
  phatVuotNganSachBua: 0.5, // món đắt hơn ngân sách bữa (vẫn trong mức linh hoạt) bị cộng điểm theo phần vượt
} as const;

// ─────────────────────────────────────────────
// Theo dõi hằng ngày — trang "Hôm nay" (SPEC mục 4 "Theo dõi" và mục 7)
// ─────────────────────────────────────────────
export const MUC_TIEU_NUOC_LY = 8; // mục tiêu mặc định 8 ly nước/ngày
export const SO_LY_NUOC_TOI_DA = 30; // chặn bấm nhầm quá nhiều

// "Lỡ ăn rồi": phần calo dư (so với mục tiêu gốc) được chia đều cho mấy ngày tới
export const SO_NGAY_CHIA_BU = 3;
// Mỗi ngày giảm tối đa 10% mục tiêu, và không bao giờ xuống dưới mức sàn
export const GIAM_BU_TOI_DA_MOI_NGAY = 0.1;

// Luật quan tâm: bao nhiêu ngày liền (có ghi chép) dưới mức sàn thì hiện thông điệp quan tâm
export const SO_NGAY_DUOI_SAN_CANH_BAO = 3;

// ─────────────────────────────────────────────
// Tính năng AI (SPEC mục 8) — AI chỉ chọn món & viết giải thích, KHÔNG tạo số liệu
// ─────────────────────────────────────────────
export const AI_MODEL_MAC_DINH = "claude-opus-5-5"; // dùng khi .env.local không đặt ANTHROPIC_MODEL
export const AI_THOI_GIAN_CHO_MS = 20000; // quá 20 giây → dùng phương án dự phòng
export const AI_SO_LAN_THU_LAI = 1; // thử lại 1 lần nếu lỗi mạng tạm thời
export const AI_MAX_TOKENS = 4000; // đủ cho JSON thực đơn 7 ngày
export const DO_DAI_CAU_NHAP_TOI_DA = 200; // ký tự — chặn câu quá dài / lạm dụng
export const DO_DAI_GIAI_THICH_TOI_DA = 600; // ký tự — câu giải thích dài hơn thì bỏ
export const SO_MON_GAN_TEN = 3; // AI không nhận ra món → hiện 3 món gần tên nhất

// Giới hạn số lần gọi AI cho mỗi địa chỉ mạng (chống người lạ dùng hết API key khi deploy công khai).
// Vượt giới hạn → vẫn trả kết quả bằng phương án dự phòng, chỉ không gọi AI.
export const AI_GIOI_HAN_SO_LAN = 20; // tối đa 20 lần gọi AI...
export const AI_GIOI_HAN_CUA_SO_MS = 10 * 60 * 1000; // ...trong mỗi 10 phút

// Trang "Lịch sử"
export const SO_NGAY_LICH_SU = 30; // hiện tối đa 30 ngày gần nhất có ghi chép
export const SO_NGAY_BIEU_DO = 7; // biểu đồ cột: 7 ngày gần nhất

// ─────────────────────────────────────────────
// Nhập số liệu món từ file CSV (npm run nhap-mon)
// ─────────────────────────────────────────────
export const SO_MON_TOI_THIEU = 10; // SPEC mục 5 ghi 10–15 món; nhóm đã đồng ý nới giới hạn trên
export const SO_MON_TOI_DA = 25; // nhóm đã đồng ý nới từ 15 (SPEC mục 5) để thêm món giá rẻ
export const LECH_KCAL_TOI_DA = 0.1; // 4×đạm + 4×tinh bột + 9×béo được lệch tối đa 10% so với kcal ghi

// ─────────────────────────────────────────────
// BMI — phân loại theo chuẩn châu Á (WHO khu vực châu Á – Thái Bình Dương, Bộ Y tế VN đang dùng)
// ─────────────────────────────────────────────
// BMI ngoài khoảng này gần như chắc chắn là gõ nhầm (vd 120 cm / 220 kg → BMI 153) → nhờ kiểm tra lại
export const BMI_HOP_LY = { min: 12, max: 60 } as const;

// Ngưỡng phân loại (BMI nhỏ hơn "duoi" thì thuộc nhóm đó)
export const PHAN_LOAI_BMI = [
  { duoi: 18.5, ma: "thieu_can" }, // < 18,5
  { duoi: 23, ma: "binh_thuong" }, // 18,5 – 22,9
  { duoi: 25, ma: "thua_can" }, // 23 – 24,9
  { duoi: 30, ma: "beo_phi_1" }, // 25 – 29,9
  { duoi: Infinity, ma: "beo_phi_2" }, // ≥ 30
] as const;

// BMI cao hơn mức này → tính chất đạm theo "cân nặng ứng với BMI 25" thay vì cân nặng thật,
// tránh lượng đạm quá cao (vd 220 kg × 1,6 = 352 g). Nhóm kiểm tra lại với tài liệu môn học.
export const BMI_THAM_CHIEU_DAM = 25;

// BMI từ mức này trở lên → ghi chú nên có bác sĩ theo dõi khi giảm cân (không khóa)
export const BMI_CAN_BAC_SI = 30;

// Giảm cân: tối đa 1% cân nặng/tuần VÀ không quá 1 kg/tuần (lấy mức nhỏ hơn)
export const GIAM_CAN_TOI_DA_KG_MOI_TUAN = 1;

// Gợi ý mục tiêu ở bước 4 theo nhóm BMI (chỉ GỢI Ý — người dùng vẫn tự chọn)
export const GOI_Y_MUC_TIEU_THEO_BMI = {
  thieu_can: ["an_lanh_manh", "tang_co"],
  binh_thuong: ["duy_tri", "an_lanh_manh"],
  thua_can: ["giam_mo"],
  beo_phi_1: ["giam_mo"],
  beo_phi_2: ["giam_mo"],
} as const;

// Ngân sách là "TRUNG BÌNH mỗi bữa": tổng tiền cả ngày ≤ ngân sách × số bữa,
// từng bữa được linh hoạt tối đa 1,5 lần ngân sách (vd ngân sách 20k: sáng xôi 12k → trưa được món 28k)
export const HE_SO_NGAN_SACH_LINH_HOAT = 1.5;
