/**
 * Các phép tính về cơ thể: BMR, BMI.
 */
import {
  BMI_HOP_LY,
  BMI_THAM_CHIEU_DAM,
  BMR,
  PHAN_LOAI_BMI,
} from "@/lib/config";
import type { GioiTinh } from "./types";
import { assertPositive } from "./validate";

/**
 * BMR (năng lượng cơ thể cần khi nghỉ hoàn toàn) — công thức Mifflin-St Jeor.
 *   Nam: 10 × kg + 6.25 × cm − 5 × tuổi + 5
 *   Nữ : 10 × kg + 6.25 × cm − 5 × tuổi − 161
 */
export function calcBMR(
  gioiTinh: GioiTinh,
  canNangKg: number,
  chieuCaoCm: number,
  tuoi: number,
): number {
  assertPositive(canNangKg, "cân nặng");
  assertPositive(chieuCaoCm, "chiều cao");
  assertPositive(tuoi, "tuổi");

  const hangSo = gioiTinh === "nam" ? BMR.HANG_SO_NAM : BMR.HANG_SO_NU;
  return (
    BMR.HE_SO_CAN_NANG * canNangKg +
    BMR.HE_SO_CHIEU_CAO * chieuCaoCm -
    BMR.HE_SO_TUOI * tuoi +
    hangSo
  );
}

/** BMI = kg / (m × m) */
export function calcBMI(canNangKg: number, chieuCaoCm: number): number {
  assertPositive(canNangKg, "cân nặng");
  assertPositive(chieuCaoCm, "chiều cao");
  const m = chieuCaoCm / 100;
  return canNangKg / (m * m);
}

export type NhomBMI = (typeof PHAN_LOAI_BMI)[number]["ma"];

/** Phân loại BMI theo chuẩn châu Á: < 18,5 · 18,5–22,9 · 23–24,9 · 25–29,9 · ≥ 30 */
export function phanLoaiBMI(bmi: number): NhomBMI {
  return PHAN_LOAI_BMI.find((n) => bmi < n.duoi)!.ma;
}

/** Chiều cao & cân nặng có hợp lý không (BMI trong 12–60). Ngoài khoảng → gần như chắc chắn gõ nhầm. */
export function bmiHopLy(canNangKg: number, chieuCaoCm: number): boolean {
  if (!(canNangKg > 0) || !(chieuCaoCm > 0)) return false;
  const bmi = calcBMI(canNangKg, chieuCaoCm);
  return bmi >= BMI_HOP_LY.min && bmi <= BMI_HOP_LY.max;
}

/**
 * Cân nặng dùng để tính chất đạm:
 *  - BMI ≤ 25 → cân nặng thật
 *  - BMI > 25 → cân nặng ứng với BMI 25 (= 25 × m²), tránh lượng đạm quá cao
 * Ví dụ 170 cm, 100 kg (BMI 34,6) → 25 × 1,7² = 72,25 kg.
 */
export function canNangTinhDam(canNangKg: number, chieuCaoCm: number): number {
  const m = chieuCaoCm / 100;
  const canThamChieu = BMI_THAM_CHIEU_DAM * m * m;
  return calcBMI(canNangKg, chieuCaoCm) > BMI_THAM_CHIEU_DAM
    ? canThamChieu
    : canNangKg;
}
