/**
 * Hồ sơ người dùng: kiểu dữ liệu, bản nháp khi đang điền onboarding,
 * và hàm kiểm tra từng bước (bước đã điền đúng chưa).
 *
 * - "Draft" (bản nháp): dữ liệu đang gõ — số để dạng chữ để gõ "65,5" không bị mất dấu phẩy.
 * - "HoSo" (hồ sơ): dữ liệu đã kiểm tra, lưu vào localStorage.
 */
import {
  BMI_HOP_LY,
  DANH_SACH_DI_UNG,
  GIOI_HAN_NHAP,
  NGAN_SACH_MAC_DINH_VND,
  THOI_GIAN_NAU_LUA_CHON,
} from "@/lib/config";
import { bmiHopLy, calcBMI } from "@/lib/engine/body";
import { getSafetyTier, type SafetyResult } from "@/lib/engine/safety";
import type { HoSoTinhToan } from "@/lib/engine/plan";
import type {
  BenhNen,
  CongViec,
  CuongDo,
  GioiTinh,
  MucTieu,
  TraLoiVanDeAnUong,
} from "@/lib/engine/types";
import {
  checkWeightGoal,
  type KetQuaMucTieuCan,
} from "@/lib/engine/weightGoal";
import type { BoLoc } from "@/lib/engine/dishes";
import type { PhongCach } from "@/lib/engine/menu";
import type { CheDoAn, NoiAn } from "@/lib/labels";

export const PHIEN_BAN_HO_SO = 1;

export interface HoSo {
  phienBan: typeof PHIEN_BAN_HO_SO;
  // Bước 1 — Sàng lọc an toàn
  tuoi: number;
  mangThaiChoConBu: boolean;
  benhNen: BenhNen[]; // [] = không có
  vanDeAnUong: TraLoiVanDeAnUong;
  // Bước 2 — Cơ thể
  gioiTinh: GioiTinh;
  chieuCaoCm: number;
  canNangKg: number;
  // Bước 3 — Vận động
  congViec: CongViec;
  theThao: {
    mon: string;
    soBuoiMoiTuan: number;
    phutMoiBuoi: number;
    cuongDo: CuongDo;
  } | null;
  // Bước 4 — Mục tiêu
  mucTieu: MucTieu;
  canMucTieuKg: number | null;
  soTuan: number | null;
  tiLeDieuChinh: number | null; // % cắt/thêm calo người dùng tự chỉnh ở trang Kết quả
  // Bước 5 — Thói quen ăn
  diUng: string[];
  cheDoAn: CheDoAn;
  monKhongThich: string[]; // id món trong data/dishes.json
  nganSachMoiBuaVnd: number;
  thoiGianNauToiDa: number; // phút
  soBua: 3 | 4;
  noiAn: NoiAn;
}

export interface Draft {
  tuoi: string;
  mangThaiChoConBu: boolean | null;
  benhNen: BenhNen[];
  khongCoBenh: boolean;
  vanDeAnUong: TraLoiVanDeAnUong | null;
  gioiTinh: GioiTinh | null;
  chieuCaoCm: string;
  canNangKg: string;
  congViec: CongViec | null;
  coTheThao: boolean | null;
  monTheThao: string;
  soBuoiMoiTuan: string;
  phutMoiBuoi: string;
  cuongDo: CuongDo | null;
  mucTieu: MucTieu | null;
  canMucTieuKg: string;
  soTuan: string;
  tiLeDieuChinh: number | null;
  diUng: string[];
  cheDoAn: CheDoAn | null;
  monKhongThich: string[];
  nganSachMoiBuaVnd: string;
  thoiGianNauToiDa: number | null;
  soBua: 3 | 4 | null;
  noiAn: NoiAn | null;
}

export const DRAFT_TRONG: Draft = {
  tuoi: "",
  mangThaiChoConBu: null,
  benhNen: [],
  khongCoBenh: false,
  vanDeAnUong: null,
  gioiTinh: null,
  chieuCaoCm: "",
  canNangKg: "",
  congViec: null,
  coTheThao: null,
  monTheThao: "",
  soBuoiMoiTuan: "",
  phutMoiBuoi: "",
  cuongDo: null,
  mucTieu: null,
  canMucTieuKg: "",
  soTuan: "",
  tiLeDieuChinh: null,
  diUng: [],
  cheDoAn: null,
  monKhongThich: [],
  nganSachMoiBuaVnd: String(NGAN_SACH_MAC_DINH_VND),
  thoiGianNauToiDa: null,
  soBua: null,
  noiAn: null,
};

/** Đổi chữ thành số; chấp nhận dấu phẩy thập phân ("65,5") và dấu chấm ngăn nghìn ("35.000" với tiền). */
export function docSo(chu: string, laTien = false): number {
  const s = chu.trim();
  if (s === "") return NaN;
  const chuan = laTien ? s.replace(/[.\s]/g, "") : s.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(chuan)) return NaN;
  return Number(chuan);
}

type GioiHan = { min: number; max: number };
function trongKhoang(x: number, g: GioiHan): boolean {
  return Number.isFinite(x) && x >= g.min && x <= g.max;
}

const NHAC_KIEM_TRA = "Bạn kiểm tra lại giúp mình nhé";
const NHAC_CHON = "Bạn chọn giúp mình một lựa chọn nhé";

/** Lỗi theo từng ô: { tenO: "lời nhắc" }. Rỗng = bước hợp lệ. */
export type LoiBuoc = Partial<Record<keyof Draft, string>>;

// ─────────────────────────────────────────────
// Thông tin an toàn & mục tiêu dùng ở bước 4
// ─────────────────────────────────────────────

/** Tính tầng an toàn từ bản nháp (dùng ở bước 4 để biết mục tiêu nào được chọn). */
export function anToanTuDraft(d: Draft, mucTieu?: MucTieu): SafetyResult {
  const can = docSo(d.canNangKg);
  const cao = docSo(d.chieuCaoCm);
  return getSafetyTier(
    {
      tuoi: docSo(d.tuoi),
      mangThaiChoConBu: d.mangThaiChoConBu === true,
      benhNen: d.benhNen,
      vanDeAnUong: d.vanDeAnUong ?? "khong_muon_tra_loi",
      canNangKg: Number.isFinite(can) ? can : undefined,
      chieuCaoCm: Number.isFinite(cao) ? cao : undefined,
    },
    mucTieu,
  );
}

/**
 * Chuẩn hóa mục tiêu khi vào bước 4:
 *  - Chỉ còn 1 lựa chọn (tầng 1) → tự chọn sẵn "Ăn cân bằng"
 *  - Mục tiêu cũ không còn được phép (vd vừa sửa cân nặng) → bỏ chọn
 */
export function chuanHoaMucTieu(d: Draft): Draft {
  const { mucTieuDuocChon } = anToanTuDraft(d);
  if (mucTieuDuocChon.length === 1)
    return { ...d, mucTieu: mucTieuDuocChon[0] };
  if (d.mucTieu && !mucTieuDuocChon.includes(d.mucTieu))
    return { ...d, mucTieu: null };
  return d;
}

/** Kiểm tra cân mục tiêu từ bản nháp (null nếu mục tiêu không cần cân mục tiêu). */
export function kiemTraCanTuDraft(d: Draft): KetQuaMucTieuCan | null {
  if (d.mucTieu !== "giam_mo" && d.mucTieu !== "tang_co") return null;
  return checkWeightGoal({
    mucTieu: d.mucTieu,
    canHienTaiKg: docSo(d.canNangKg),
    canMucTieuKg: docSo(d.canMucTieuKg),
    soTuan: docSo(d.soTuan),
    chieuCaoCm: docSo(d.chieuCaoCm),
  });
}

// ─────────────────────────────────────────────
// Kiểm tra từng bước
// ─────────────────────────────────────────────

export function kiemTraBuoc(buoc: number, d: Draft): LoiBuoc {
  const loi: LoiBuoc = {};
  const G = GIOI_HAN_NHAP;

  if (buoc === 1) {
    // Giới tính hỏi ĐẦU TIÊN: câu mang thai / cho con bú chỉ hỏi khi chọn Nữ
    if (d.gioiTinh === null) loi.gioiTinh = NHAC_CHON;
    if (!trongKhoang(docSo(d.tuoi), G.tuoi))
      loi.tuoi = `${NHAC_KIEM_TRA} (từ ${G.tuoi.min} đến ${G.tuoi.max} tuổi)`;
    if (d.gioiTinh === "nu" && d.mangThaiChoConBu === null)
      loi.mangThaiChoConBu = NHAC_CHON;
    if (!d.khongCoBenh && d.benhNen.length === 0)
      loi.benhNen = 'Bạn chọn bệnh nền, hoặc chọn "Không có" nhé';
    if (d.vanDeAnUong === null) loi.vanDeAnUong = NHAC_CHON;
  }

  if (buoc === 2) {
    if (!trongKhoang(docSo(d.chieuCaoCm), G.chieuCaoCm))
      loi.chieuCaoCm = `${NHAC_KIEM_TRA} (từ ${G.chieuCaoCm.min} đến ${G.chieuCaoCm.max} cm)`;
    if (!trongKhoang(docSo(d.canNangKg), G.canNangKg))
      loi.canNangKg = `${NHAC_KIEM_TRA} (từ ${G.canNangKg.min} đến ${G.canNangKg.max} kg)`;
    // Từng số hợp lệ nhưng ghép lại vô lý (vd 120 cm / 220 kg → BMI 153) → gần như chắc chắn gõ nhầm
    if (
      !loi.chieuCaoCm &&
      !loi.canNangKg &&
      !bmiHopLy(docSo(d.canNangKg), docSo(d.chieuCaoCm))
    )
      loi.canNangKg = `Chiều cao và cân nặng này có vẻ chưa khớp (BMI ≈ ${Math.round(calcBMI(docSo(d.canNangKg), docSo(d.chieuCaoCm)))}). ${NHAC_KIEM_TRA}`;
  }

  if (buoc === 3) {
    if (d.congViec === null) loi.congViec = NHAC_CHON;
    if (d.coTheThao === null) loi.coTheThao = NHAC_CHON;
    if (d.coTheThao) {
      if (d.monTheThao.trim() === "")
        loi.monTheThao = "Bạn ghi tên môn thể thao giúp mình nhé";
      if (!trongKhoang(docSo(d.soBuoiMoiTuan), G.soBuoiMoiTuan))
        loi.soBuoiMoiTuan = `${NHAC_KIEM_TRA} (từ ${G.soBuoiMoiTuan.min} đến ${G.soBuoiMoiTuan.max} buổi)`;
      if (!trongKhoang(docSo(d.phutMoiBuoi), G.phutMoiBuoi))
        loi.phutMoiBuoi = `${NHAC_KIEM_TRA} (từ ${G.phutMoiBuoi.min} đến ${G.phutMoiBuoi.max} phút)`;
      if (d.cuongDo === null) loi.cuongDo = NHAC_CHON;
    }
  }

  if (buoc === 4) {
    const { mucTieuDuocChon } = anToanTuDraft(d);
    if (d.mucTieu === null || !mucTieuDuocChon.includes(d.mucTieu)) {
      loi.mucTieu = NHAC_CHON;
    } else if (d.mucTieu === "giam_mo" || d.mucTieu === "tang_co") {
      if (!trongKhoang(docSo(d.canMucTieuKg), G.canNangKg))
        loi.canMucTieuKg = `${NHAC_KIEM_TRA} (từ ${G.canNangKg.min} đến ${G.canNangKg.max} kg)`;
      if (!trongKhoang(docSo(d.soTuan), G.soTuan))
        loi.soTuan = `${NHAC_KIEM_TRA} (từ ${G.soTuan.min} đến ${G.soTuan.max} tuần)`;
      // Cân mục tiêu ghép với chiều cao phải hợp lý (BMI không quá 60)
      const cao = docSo(d.chieuCaoCm);
      if (
        !loi.canMucTieuKg &&
        cao > 0 &&
        calcBMI(docSo(d.canMucTieuKg), cao) > BMI_HOP_LY.max
      )
        loi.canMucTieuKg = `Cân mục tiêu này có vẻ chưa khớp với chiều cao. ${NHAC_KIEM_TRA}`;
      if (!loi.canMucTieuKg && !loi.soTuan) {
        // Luật cân mục tiêu: BMI thấp hoặc ngược chiều thì chưa nhận.
        // "Quá nhanh" vẫn cho đi tiếp — trang Kết quả sẽ đề xuất thời hạn mới.
        const kq = kiemTraCanTuDraft(d);
        if (kq?.trangThai === "bmi_thap" || kq?.trangThai === "khong_hop_le")
          loi.canMucTieuKg = "MUC_TIEU_CHUA_NHAN"; // giao diện tự hiện lời giải thích chi tiết
      }
    }
  }

  if (buoc === 5) {
    const maHopLe: string[] = DANH_SACH_DI_UNG.map((x) => x.ma);
    if (d.diUng.some((x) => !maHopLe.includes(x))) loi.diUng = NHAC_KIEM_TRA;
    if (d.cheDoAn === null) loi.cheDoAn = NHAC_CHON;
    const nganSach = docSo(d.nganSachMoiBuaVnd, true);
    if (nganSach < G.nganSachMoiBuaVnd.min)
      // Dưới 10.000 đ: không đủ cho một bữa đủ chất → nói rõ lý do thay vì chỉ báo "sai"
      loi.nganSachMoiBuaVnd = `Với dưới ${G.nganSachMoiBuaVnd.min.toLocaleString("vi-VN")} đ mỗi bữa, mình chưa tìm được món đủ chất cho bạn. Bạn chọn từ ${G.nganSachMoiBuaVnd.min.toLocaleString("vi-VN")} đ trở lên nhé.`;
    else if (!trongKhoang(nganSach, G.nganSachMoiBuaVnd))
      loi.nganSachMoiBuaVnd = `${NHAC_KIEM_TRA} (từ 10.000 đến 500.000 đ)`;
    if (
      d.thoiGianNauToiDa === null ||
      !(THOI_GIAN_NAU_LUA_CHON as readonly number[]).includes(
        d.thoiGianNauToiDa,
      )
    )
      loi.thoiGianNauToiDa = NHAC_CHON;
    if (d.soBua !== 3 && d.soBua !== 4) loi.soBua = NHAC_CHON;
    if (d.noiAn === null) loi.noiAn = NHAC_CHON;
  }

  return loi;
}

export const SO_BUOC_NHAP = 5; // bước 6 là trang Kết quả

// ─────────────────────────────────────────────
// Chuyển đổi Draft ⇄ HoSo
// ─────────────────────────────────────────────

/** Bản nháp → hồ sơ. Trả về null nếu còn bước chưa hợp lệ. */
export function draftThanhHoSo(d: Draft): HoSo | null {
  for (let b = 1; b <= SO_BUOC_NHAP; b++) {
    if (Object.keys(kiemTraBuoc(b, d)).length > 0) return null;
  }
  const canMucTieu = d.mucTieu === "giam_mo" || d.mucTieu === "tang_co";
  return {
    phienBan: PHIEN_BAN_HO_SO,
    tuoi: docSo(d.tuoi),
    // Nam → luôn "không" (câu này không được hỏi)
    mangThaiChoConBu: d.gioiTinh === "nu" ? d.mangThaiChoConBu! : false,
    benhNen: d.khongCoBenh ? [] : [...d.benhNen],
    vanDeAnUong: d.vanDeAnUong!,
    gioiTinh: d.gioiTinh!,
    chieuCaoCm: docSo(d.chieuCaoCm),
    canNangKg: docSo(d.canNangKg),
    congViec: d.congViec!,
    theThao: d.coTheThao
      ? {
          mon: d.monTheThao.trim(),
          soBuoiMoiTuan: docSo(d.soBuoiMoiTuan),
          phutMoiBuoi: docSo(d.phutMoiBuoi),
          cuongDo: d.cuongDo!,
        }
      : null,
    mucTieu: d.mucTieu!,
    canMucTieuKg: canMucTieu ? docSo(d.canMucTieuKg) : null,
    soTuan: canMucTieu ? docSo(d.soTuan) : null,
    tiLeDieuChinh: canMucTieu ? d.tiLeDieuChinh : null,
    diUng: [...d.diUng],
    cheDoAn: d.cheDoAn!,
    monKhongThich: [...d.monKhongThich],
    nganSachMoiBuaVnd: docSo(d.nganSachMoiBuaVnd, true),
    thoiGianNauToiDa: d.thoiGianNauToiDa!,
    soBua: d.soBua!,
    noiAn: d.noiAn!,
  };
}

/** Hồ sơ → bản nháp (để "Sửa hồ sơ" điền sẵn thông tin cũ). */
export function hoSoThanhDraft(h: HoSo): Draft {
  return {
    tuoi: String(h.tuoi),
    mangThaiChoConBu: h.gioiTinh === "nu" ? h.mangThaiChoConBu : false,
    benhNen: [...h.benhNen],
    khongCoBenh: h.benhNen.length === 0,
    vanDeAnUong: h.vanDeAnUong,
    gioiTinh: h.gioiTinh,
    chieuCaoCm: String(h.chieuCaoCm),
    canNangKg: String(h.canNangKg),
    congViec: h.congViec,
    coTheThao: h.theThao !== null,
    monTheThao: h.theThao?.mon ?? "",
    soBuoiMoiTuan: h.theThao ? String(h.theThao.soBuoiMoiTuan) : "",
    phutMoiBuoi: h.theThao ? String(h.theThao.phutMoiBuoi) : "",
    cuongDo: h.theThao?.cuongDo ?? null,
    mucTieu: h.mucTieu,
    canMucTieuKg: h.canMucTieuKg !== null ? String(h.canMucTieuKg) : "",
    soTuan: h.soTuan !== null ? String(h.soTuan) : "",
    tiLeDieuChinh: h.tiLeDieuChinh,
    diUng: [...h.diUng],
    cheDoAn: h.cheDoAn,
    monKhongThich: [...h.monKhongThich],
    nganSachMoiBuaVnd: String(h.nganSachMoiBuaVnd),
    thoiGianNauToiDa: h.thoiGianNauToiDa,
    soBua: h.soBua,
    noiAn: h.noiAn,
  };
}

/** Kiểm tra dữ liệu đọc từ localStorage có đúng là hồ sơ hợp lệ không (phòng dữ liệu hỏng/cũ). */
export function laHoSoHopLe(x: unknown): x is HoSo {
  try {
    const h = x as HoSo;
    if (!h || typeof h !== "object" || h.phienBan !== PHIEN_BAN_HO_SO)
      return false;
    return draftThanhHoSo(hoSoThanhDraft(h)) !== null;
  } catch {
    return false;
  }
}

/** Hồ sơ → dữ liệu đầu vào cho engine. */
export function hoSoThanhTinhToan(h: HoSo): HoSoTinhToan {
  return {
    tuoi: h.tuoi,
    mangThaiChoConBu: h.mangThaiChoConBu,
    benhNen: h.benhNen,
    vanDeAnUong: h.vanDeAnUong,
    gioiTinh: h.gioiTinh,
    canNangKg: h.canNangKg,
    chieuCaoCm: h.chieuCaoCm,
    congViec: h.congViec,
    theThao: h.theThao
      ? {
          soBuoiMoiTuan: h.theThao.soBuoiMoiTuan,
          phutMoiBuoi: h.theThao.phutMoiBuoi,
          cuongDo: h.theThao.cuongDo,
        }
      : null,
    mucTieu: h.mucTieu,
    canMucTieuKg: h.canMucTieuKg ?? undefined,
    soTuan: h.soTuan ?? undefined,
    tiLeDieuChinh: h.tiLeDieuChinh ?? undefined,
  };
}

// ─────────────────────────────────────────────
// Hồ sơ → bộ lọc món & phong cách thực đơn (Giai đoạn 3)
// ─────────────────────────────────────────────

/** An toàn của hồ sơ đã lưu (tầng 1, tầng 2, tag lọc món...). */
export function anToanTuHoSo(h: HoSo): SafetyResult {
  return getSafetyTier(h, h.mucTieu);
}

/** Bộ lọc món: tầng 2 (bệnh nền) + tầng 3 (dị ứng, chế độ ăn, món ghét, ngân sách, thời gian nấu). */
export function boLocTuHoSo(h: HoSo): BoLoc {
  return {
    tagLoai: anToanTuHoSo(h).tagLoai,
    diUng: h.diUng,
    cheDoAn: h.cheDoAn,
    monKhongThich: h.monKhongThich,
    nganSachMoiBuaVnd: h.nganSachMoiBuaVnd,
    thoiGianNauToiDa: h.thoiGianNauToiDa,
  };
}

/** Phong cách được phép: bệnh thận không có High-protein (luật an toàn thắng). */
export function phongCachChoPhep(h: HoSo): PhongCach[] {
  return anToanTuHoSo(h).anGoiYMacro
    ? ["can_bang", "tiet_kiem"]
    : ["can_bang", "high_protein", "tiet_kiem"];
}
