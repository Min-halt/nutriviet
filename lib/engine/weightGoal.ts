/**
 * Kiểm tra mục tiêu cân nặng: có an toàn không, nếu quá nhanh thì đề xuất thời hạn mới.
 */
import {
  BMI_TOI_THIEU,
  GIAM_CAN_TOI_DA_KG_MOI_TUAN,
  TOC_DO_TOI_DA_MOI_TUAN,
} from "@/lib/config";
import { calcBMI } from "./body";
import { EPSILON } from "./validate";

export type TrangThaiMucTieuCan =
  | "ok" // an toàn
  | "qua_nhanh" // tốc độ vượt ngưỡng → có soTuanDeXuat
  | "bmi_thap" // BMI ở cân mục tiêu < 18.5 → không nhận mục tiêu
  | "khong_hop_le"; // dữ liệu sai hoặc ngược chiều (vd giảm mỡ mà cân mục tiêu cao hơn)

export interface KetQuaMucTieuCan {
  trangThai: TrangThaiMucTieuCan;
  bmiMucTieu: number | null;
  kgMoiTuan: number | null; // tốc độ theo kế hoạch người dùng
  tiLeMoiTuan: number | null; // tốc độ tính theo % cân nặng hiện tại (0.01 = 1%)
  tiLeToiDa: number; // ngưỡng cho phép (% cân nặng/tuần)
  kgToiDaMoiTuan: number | null; // tốc độ tối đa thực tế (kg/tuần) — giảm cân: min(1% cân nặng, 1 kg)
  soTuanDeXuat: number | null; // chỉ có khi "qua_nhanh"
  canToiThieuKg: number | null; // cân nặng thấp nhất để BMI vẫn ≥ 18.5 (làm tròn lên 0.1 kg)
}

/** Cân nặng thấp nhất để BMI ≥ 18.5: 18.5 × (m)², làm tròn LÊN 0.1 kg cho chắc chắn đủ. */
export function calcCanToiThieu(chieuCaoCm: number): number {
  const m = chieuCaoCm / 100;
  return Math.ceil(BMI_TOI_THIEU * m * m * 10 - EPSILON) / 10;
}

/**
 * Thứ tự kiểm tra:
 *  1. Dữ liệu hợp lệ & đúng chiều (giảm thì cân mục tiêu phải thấp hơn, tăng thì cao hơn)
 *  2. BMI ở cân mục tiêu ≥ 18.5 (nếu không → không nhận, dù tốc độ ổn)
 *  3. Tốc độ mỗi tuần ≤ ngưỡng (giảm: 1% cân nặng hiện tại và không quá 1 kg; tăng: 0.5%)
 *     Nếu vượt → số tuần đề xuất = làm tròn lên( số kg cần đổi / (cân hiện tại × ngưỡng) )
 */
export function checkWeightGoal(params: {
  mucTieu: "giam_mo" | "tang_co";
  canHienTaiKg: number;
  canMucTieuKg: number;
  soTuan: number;
  chieuCaoCm: number;
}): KetQuaMucTieuCan {
  const { mucTieu, canHienTaiKg, canMucTieuKg, soTuan, chieuCaoCm } = params;
  const tiLeToiDa =
    mucTieu === "giam_mo"
      ? TOC_DO_TOI_DA_MOI_TUAN.giam
      : TOC_DO_TOI_DA_MOI_TUAN.tang;

  const khongHopLe: KetQuaMucTieuCan = {
    trangThai: "khong_hop_le",
    bmiMucTieu: null,
    kgMoiTuan: null,
    tiLeMoiTuan: null,
    tiLeToiDa,
    soTuanDeXuat: null,
    canToiThieuKg: null,
    kgToiDaMoiTuan: null,
  };

  const soHopLe = [canHienTaiKg, canMucTieuKg, soTuan, chieuCaoCm].every(
    (x) => Number.isFinite(x) && x > 0,
  );
  if (!soHopLe) return khongHopLe;

  const chenhLech = canMucTieuKg - canHienTaiKg; // âm = giảm, dương = tăng
  const dungChieu = mucTieu === "giam_mo" ? chenhLech < 0 : chenhLech > 0;
  if (!dungChieu) return khongHopLe;

  const bmiMucTieu = calcBMI(canMucTieuKg, chieuCaoCm);
  const kgCanDoi = Math.abs(chenhLech);
  const kgMoiTuan = kgCanDoi / soTuan;
  const tiLeMoiTuan = kgMoiTuan / canHienTaiKg;

  // Tốc độ tối đa (kg/tuần): % cân nặng; riêng giảm cân không quá 1 kg/tuần
  // (vd 220 kg × 1% = 2,2 kg/tuần là quá nhanh → giới hạn 1 kg/tuần)
  const kgToiDaMoiTuan =
    mucTieu === "giam_mo"
      ? Math.min(canHienTaiKg * tiLeToiDa, GIAM_CAN_TOI_DA_KG_MOI_TUAN)
      : canHienTaiKg * tiLeToiDa;

  const ketQua = {
    bmiMucTieu,
    kgMoiTuan,
    tiLeMoiTuan,
    tiLeToiDa,
    soTuanDeXuat: null,
    canToiThieuKg: calcCanToiThieu(chieuCaoCm),
    kgToiDaMoiTuan,
  };

  if (bmiMucTieu < BMI_TOI_THIEU) {
    return { ...ketQua, trangThai: "bmi_thap" };
  }

  if (kgMoiTuan > kgToiDaMoiTuan + EPSILON) {
    // trừ EPSILON trước khi làm tròn lên để 20.0000000001 không thành 21
    const soTuanDeXuat = Math.ceil(kgCanDoi / kgToiDaMoiTuan - EPSILON);
    return { ...ketQua, trangThai: "qua_nhanh", soTuanDeXuat };
  }

  return { ...ketQua, trangThai: "ok" };
}
