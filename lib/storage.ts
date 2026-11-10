/**
 * Đọc/ghi localStorage. Dữ liệu sức khỏe CHỈ nằm trên máy người dùng, không gửi đi đâu.
 *
 * Có "đăng ký theo dõi" (subscribe) để các trang tự cập nhật khi hồ sơ thay đổi.
 */
import { SO_LY_NUOC_TOI_DA } from "@/lib/config";
import type { PhongCach, ThucDonTuan } from "@/lib/engine/menu";
import type { MonDaAn, NhatKy, NhatKyNgay } from "@/lib/engine/tracking";
import { timMon } from "@/lib/monAn";
import {
  draftThanhHoSo,
  hoSoThanhDraft,
  laHoSoHopLe,
  type HoSo,
} from "@/lib/profile";

export const KHOA_HO_SO = "nutriviet.hoSo";
export const KHOA_THUC_DON = "nutriviet.thucDon";
export const KHOA_PHONG_CACH = "nutriviet.phongCach";
export const KHOA_NHAT_KY = "nutriviet.nhatKy";
export const KHOA_CAI_DAT = "nutriviet.caiDat";
const SU_KIEN_THAY_DOI = "nutriviet:storage";

/** Kho lưu trữ tối thiểu — trong trình duyệt là window.localStorage, trong test là bản giả. */
export interface KhoLuuTru {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function khoMacDinh(): KhoLuuTru | null {
  if (typeof window === "undefined") return null; // đang chạy trên server
  try {
    return window.localStorage;
  } catch {
    return null; // trình duyệt chặn localStorage (vd chế độ riêng tư)
  }
}

/** Đọc hồ sơ. Không có hoặc dữ liệu hỏng → null (coi như chưa có hồ sơ). */
export function docHoSo(kho: KhoLuuTru | null = khoMacDinh()): HoSo | null {
  return phanTichHoSo(kho?.getItem(KHOA_HO_SO) ?? null);
}

export function phanTichHoSo(raw: string | null): HoSo | null {
  if (!raw) return null;
  try {
    const x: unknown = JSON.parse(raw);
    // Trả về bản đã chuẩn hóa (vd hồ sơ cũ lỡ lưu "nam + mang thai" → "không")
    return laHoSoHopLe(x) ? draftThanhHoSo(hoSoThanhDraft(x)) : null;
  } catch {
    return null;
  }
}

export function luuHoSo(
  hoSo: HoSo,
  kho: KhoLuuTru | null = khoMacDinh(),
): void {
  if (!kho) return;
  kho.setItem(KHOA_HO_SO, JSON.stringify(hoSo));
  baoThayDoi();
}

export function xoaHoSo(kho: KhoLuuTru | null = khoMacDinh()): void {
  if (!kho) return;
  kho.removeItem(KHOA_HO_SO);
  baoThayDoi();
}

function baoThayDoi() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(SU_KIEN_THAY_DOI));
}

/** Đăng ký nhận thông báo khi dữ liệu thay đổi (cùng tab hoặc tab khác). Trả về hàm hủy. */
export function theoDoiThayDoi(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SU_KIEN_THAY_DOI, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SU_KIEN_THAY_DOI, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Đọc chuỗi thô của một khóa (dùng cho hook React để so sánh thay đổi). */
export function docRaw(
  khoa: string,
  kho: KhoLuuTru | null = khoMacDinh(),
): string | null {
  return kho?.getItem(khoa) ?? null;
}

// ─────────────────────────────────────────────
// Thực đơn 7 ngày (Giai đoạn 3)
// Lưu kèm "dấu vân tay" của hồ sơ: hồ sơ đổi → thực đơn cũ không dùng nữa, tạo lại tự động.
// ─────────────────────────────────────────────
interface ThucDonDaLuu {
  phienBan: 1;
  dauHoSo: string; // JSON hồ sơ lúc tạo thực đơn
  theoPhongCach: Partial<Record<PhongCach, ThucDonTuan>>;
}

function dauHoSo(h: HoSo): string {
  return JSON.stringify(h);
}

export function phanTichThucDonDaLuu(
  raw: string | null,
  hoSo: HoSo,
): ThucDonDaLuu | null {
  if (!raw) return null;
  try {
    const x = JSON.parse(raw) as ThucDonDaLuu;
    if (
      x?.phienBan !== 1 ||
      x.dauHoSo !== dauHoSo(hoSo) ||
      typeof x.theoPhongCach !== "object"
    )
      return null;
    return x;
  } catch {
    return null;
  }
}

/** Thực đơn đã lưu (đã đổi món) của một phong cách — null nếu chưa có / hồ sơ đã đổi / dữ liệu hỏng. */
export function layThucDonDaLuu(
  raw: string | null,
  hoSo: HoSo,
  phongCach: PhongCach,
): ThucDonTuan | null {
  const t = phanTichThucDonDaLuu(raw, hoSo)?.theoPhongCach[phongCach];
  if (!t || !Array.isArray(t.ngay) || t.ngay.length !== 7) return null;
  // Món phải còn trong database (phòng khi nhóm sửa dishes.json)
  const conDuMon = t.ngay.every(
    (n) => Array.isArray(n.bua) && n.bua.every((b) => timMon(b.monId)),
  );
  return conDuMon ? t : null;
}

export function luuThucDon(
  hoSo: HoSo,
  thucDon: ThucDonTuan,
  kho: KhoLuuTru | null = khoMacDinh(),
): void {
  if (!kho) return;
  const cu = phanTichThucDonDaLuu(kho.getItem(KHOA_THUC_DON), hoSo);
  const moi: ThucDonDaLuu = {
    phienBan: 1,
    dauHoSo: dauHoSo(hoSo),
    theoPhongCach: {
      ...(cu?.theoPhongCach ?? {}),
      [thucDon.phongCach]: thucDon,
    },
  };
  kho.setItem(KHOA_THUC_DON, JSON.stringify(moi));
  baoThayDoi();
}

/** Bỏ các lần đổi món của một phong cách → quay về thực đơn gốc do thuật toán tạo. */
export function xoaThucDonPhongCach(
  hoSo: HoSo,
  phongCach: PhongCach,
  kho: KhoLuuTru | null = khoMacDinh(),
): void {
  if (!kho) return;
  const cu = phanTichThucDonDaLuu(kho.getItem(KHOA_THUC_DON), hoSo);
  if (!cu) return;
  delete cu.theoPhongCach[phongCach];
  kho.setItem(KHOA_THUC_DON, JSON.stringify(cu));
  baoThayDoi();
}

export function luuPhongCach(
  p: PhongCach,
  kho: KhoLuuTru | null = khoMacDinh(),
): void {
  if (!kho) return;
  kho.setItem(KHOA_PHONG_CACH, p);
  baoThayDoi();
}

// ─────────────────────────────────────────────
// Nhật ký ăn uống (Giai đoạn 4)
// ─────────────────────────────────────────────
function laMonDaAnHopLe(x: unknown): x is MonDaAn {
  const m = x as MonDaAn;
  return (
    !!m &&
    typeof m.id === "string" &&
    typeof m.monId === "string" &&
    ["it", "vua", "nhieu"].includes(m.khauPhan) &&
    ["sang", "trua", "toi", "phu"].includes(m.bua) &&
    typeof m.ngoaiKeHoach === "boolean" &&
    !!m.dinhDuong &&
    ["kcal", "protein", "carb", "fat"].every((k) =>
      Number.isFinite(m.dinhDuong[k as "kcal"]),
    )
  );
}

/** Đọc nhật ký; ngày nào hỏng thì bỏ ngày đó, không làm sập app. */
export function phanTichNhatKy(raw: string | null): NhatKy {
  if (!raw) return {};
  try {
    const x = JSON.parse(raw) as Record<string, unknown>;
    if (!x || typeof x !== "object") return {};
    const kq: NhatKy = {};
    for (const [ngay, v] of Object.entries(x)) {
      const n = v as NhatKyNgay;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay) || !n || !Array.isArray(n.mon))
        continue;
      kq[ngay] = {
        mon: n.mon.filter(laMonDaAnHopLe),
        nuoc: Number.isFinite(n.nuoc)
          ? Math.max(0, Math.min(SO_LY_NUOC_TOI_DA, n.nuoc))
          : 0,
      };
    }
    return kq;
  } catch {
    return {};
  }
}

function suaNgay(
  ngay: string,
  sua: (n: NhatKyNgay) => NhatKyNgay,
  kho: KhoLuuTru | null,
) {
  if (!kho) return;
  const nk = phanTichNhatKy(kho.getItem(KHOA_NHAT_KY));
  nk[ngay] = sua(nk[ngay] ?? { mon: [], nuoc: 0 });
  kho.setItem(KHOA_NHAT_KY, JSON.stringify(nk));
  baoThayDoi();
}

export function themMonDaAn(
  ngay: string,
  mon: MonDaAn,
  kho: KhoLuuTru | null = khoMacDinh(),
): void {
  suaNgay(ngay, (n) => ({ ...n, mon: [...n.mon, mon] }), kho);
}

export function xoaMonDaAn(
  ngay: string,
  id: string,
  kho: KhoLuuTru | null = khoMacDinh(),
): void {
  suaNgay(ngay, (n) => ({ ...n, mon: n.mon.filter((m) => m.id !== id) }), kho);
}

/** Thêm/bớt ly nước (không âm, không quá giới hạn) */
export function doiNuoc(
  ngay: string,
  them: number,
  kho: KhoLuuTru | null = khoMacDinh(),
): void {
  suaNgay(
    ngay,
    (n) => ({
      ...n,
      nuoc: Math.max(0, Math.min(SO_LY_NUOC_TOI_DA, n.nuoc + them)),
    }),
    kho,
  );
}

// ─────────────────────────────────────────────
// Cài đặt (tách khỏi hồ sơ để bật/tắt không làm thực đơn bị tạo lại)
// ─────────────────────────────────────────────
export interface CaiDat {
  cheDoDonGian: boolean; // ẩn số liệu, chỉ hiện "bữa tới nên ăn gì"
}

export function phanTichCaiDat(raw: string | null): CaiDat {
  try {
    const x = raw ? (JSON.parse(raw) as Partial<CaiDat>) : {};
    return { cheDoDonGian: x?.cheDoDonGian === true };
  } catch {
    return { cheDoDonGian: false };
  }
}

export function luuCaiDat(
  c: CaiDat,
  kho: KhoLuuTru | null = khoMacDinh(),
): void {
  if (!kho) return;
  kho.setItem(KHOA_CAI_DAT, JSON.stringify(c));
  baoThayDoi();
}

/** Hồ sơ hiện tại có thực đơn đã đổi món (hoặc do AI chọn) đang lưu không? Dùng để nhắc trước khi mất. */
export function coThucDonDaDoi(raw: string | null, hoSo: HoSo): boolean {
  const t = phanTichThucDonDaLuu(raw, hoSo);
  return !!t && Object.keys(t.theoPhongCach).length > 0;
}

/** Xóa TOÀN BỘ dữ liệu NutriViet trên máy này (chỉ các khóa "nutriviet.", không đụng trang khác). */
export function xoaToanBoDuLieu(kho: KhoLuuTru | null = khoMacDinh()): void {
  if (!kho) return;
  for (const khoa of [
    KHOA_HO_SO,
    KHOA_THUC_DON,
    KHOA_PHONG_CACH,
    KHOA_NHAT_KY,
    KHOA_CAI_DAT,
  ])
    kho.removeItem(khoa);
  baoThayDoi();
}
