/**
 * Phân tầng an toàn (SPEC mục 4) — ƯU TIÊN CAO NHẤT, thắng mọi mục tiêu người dùng.
 *
 * Tầng 1: khóa giảm/tăng cân, chỉ cho "Ăn cân bằng" (= an_lanh_manh) + khuyên gặp chuyên gia.
 * Tầng 2: vẫn dùng được nhưng lọc món theo bệnh nền + luôn hiện ghi chú bác sĩ.
 * (Tầng 3 — dị ứng, chay, ngân sách... — là bộ lọc món, sẽ làm ở Giai đoạn 3.)
 */
import {
  BMI_CAN_BAC_SI,
  BMI_TOI_THIEU,
  GOI_Y_MUC_TIEU_THEO_BMI,
  LOC_THEO_BENH,
  TUOI_TOI_THIEU,
} from "@/lib/config";
import { bmiHopLy, calcBMI, phanLoaiBMI } from "./body";
import type { BenhNen, MucTieu, TraLoiVanDeAnUong } from "./types";

export type LyDoTang1 =
  | "duoi_18_tuoi"
  | "mang_thai_cho_con_bu"
  | "benh_than"
  | "van_de_an_uong" // trả lời "có" HOẶC "không muốn trả lời" (nhóm chọn phương án an toàn hơn)
  | "bmi_thap_giam_mo"; // BMI hiện tại < 18.5 mà chọn giảm mỡ

export interface SafetyInput {
  tuoi: number;
  mangThaiChoConBu: boolean;
  benhNen: BenhNen[];
  vanDeAnUong: TraLoiVanDeAnUong;
  canNangKg?: number; // cần để tính BMI (bước 2)
  chieuCaoCm?: number;
}

export interface SafetyResult {
  tang1: boolean;
  lyDoTang1: LyDoTang1[];
  /** Các mục tiêu được phép chọn ở bước 4 */
  mucTieuDuocChon: MucTieu[];
  /** Tầng 2 */
  tang2: boolean;
  benhTang2: BenhNen[];
  tagLoai: string[]; // món có tag này sẽ bị loại
  tagUuTien: string[]; // món có tag này được ưu tiên
  canGhiChuBacSi: boolean;
  /** Bệnh thận: lượng đạm cần bác sĩ chỉ định → app KHÔNG hiện gợi ý protein/macro */
  anGoiYMacro: boolean;
  /**
   * Tầng 1 → ẨN mọi con số calo/macro và tự bật chế độ Đơn giản.
   * Lý do: mang thai/cho con bú cần nhiều năng lượng hơn TDEE, dưới 18 tuổi công thức người lớn
   * không chính xác, và đếm calo có thể gây hại cho người có vấn đề ăn uống.
   */
  anSoLieu: boolean;
  /** Tầng 1 → TẮT giảm bù sau "Lỡ ăn rồi" (không bao giờ siết calo với nhóm này) */
  tatGiamBu: boolean;
  /** BMI ≥ 30 → nhắc: giảm cân an toàn nhất là khi có bác sĩ theo dõi (KHÔNG khóa chức năng) */
  bmiCanBacSi: boolean;
}

const TAT_CA_MUC_TIEU: MucTieu[] = [
  "giam_mo",
  "tang_co",
  "duy_tri",
  "an_lanh_manh",
];

/**
 * @param mucTieu mục tiêu người dùng đã chọn (bỏ trống nếu chưa tới bước 4).
 */
export function getSafetyTier(
  input: SafetyInput,
  mucTieu?: MucTieu,
): SafetyResult {
  const lyDo: LyDoTang1[] = [];

  // Tuổi không hợp lệ → coi như chưa đủ tuổi (phương án an toàn hơn)
  if (!Number.isFinite(input.tuoi) || input.tuoi < TUOI_TOI_THIEU)
    lyDo.push("duoi_18_tuoi");
  if (input.mangThaiChoConBu) lyDo.push("mang_thai_cho_con_bu");
  if (input.benhNen.includes("benh_than")) lyDo.push("benh_than");
  if (input.vanDeAnUong !== "khong") lyDo.push("van_de_an_uong");

  const bmiThap =
    input.canNangKg !== undefined &&
    input.chieuCaoCm !== undefined &&
    input.canNangKg > 0 &&
    input.chieuCaoCm > 0 &&
    calcBMI(input.canNangKg, input.chieuCaoCm) < BMI_TOI_THIEU;
  if (bmiThap && mucTieu === "giam_mo") lyDo.push("bmi_thap_giam_mo");

  const bmiCanBacSi =
    input.canNangKg !== undefined &&
    input.chieuCaoCm !== undefined &&
    input.canNangKg > 0 &&
    input.chieuCaoCm > 0 &&
    calcBMI(input.canNangKg, input.chieuCaoCm) >= BMI_CAN_BAC_SI;

  const tang1 = lyDo.length > 0;

  // Mục tiêu được chọn:
  //  - Tầng 1 → chỉ "Ăn cân bằng"
  //  - BMI thấp (chưa chọn giảm mỡ) → không hiện "Giảm mỡ"
  let mucTieuDuocChon: MucTieu[];
  if (tang1) mucTieuDuocChon = ["an_lanh_manh"];
  else if (bmiThap)
    mucTieuDuocChon = TAT_CA_MUC_TIEU.filter((m) => m !== "giam_mo");
  else mucTieuDuocChon = [...TAT_CA_MUC_TIEU];

  // Tầng 2: lọc món theo bệnh nền
  const benhTang2 = input.benhNen.filter(
    (b): b is keyof typeof LOC_THEO_BENH => b in LOC_THEO_BENH,
  );
  const tagLoai = unique(benhTang2.flatMap((b) => LOC_THEO_BENH[b].loai));
  const tagUuTien = unique(benhTang2.flatMap((b) => LOC_THEO_BENH[b].uuTien));
  const tang2 = benhTang2.length > 0;

  return {
    tang1,
    lyDoTang1: lyDo,
    mucTieuDuocChon,
    tang2,
    benhTang2,
    tagLoai,
    tagUuTien,
    // Có bệnh nền (kể cả bệnh thận ở tầng 1) → luôn hiện ghi chú bác sĩ
    canGhiChuBacSi: tang2 || input.benhNen.length > 0 || bmiCanBacSi,
    anGoiYMacro: input.benhNen.includes("benh_than"),
    anSoLieu: tang1,
    tatGiamBu: tang1,
    bmiCanBacSi,
  };
}

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/** Mục tiêu GỢI Ý theo BMI (bước 4 hiện nhãn "Gợi ý cho bạn"); chỉ gợi ý trong số mục tiêu được phép. */
export function mucTieuGoiY(
  canNangKg: number,
  chieuCaoCm: number,
  duocChon: MucTieu[],
): MucTieu[] {
  if (!bmiHopLy(canNangKg, chieuCaoCm)) return [];
  const nhom = phanLoaiBMI(calcBMI(canNangKg, chieuCaoCm));
  return (GOI_Y_MUC_TIEU_THEO_BMI[nhom] as readonly MucTieu[]).filter((m) =>
    duocChon.includes(m),
  );
}
