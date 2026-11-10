/**
 * Sinh lời giải thích "Vì sao ra con số này?" — TEXT DO CODE GHÉP từ số thật, không dùng AI.
 * Mỗi bước tương ứng một hàm trong engine, để người dùng (và giảng viên) đối chiếu được.
 */
import {
  BMI_THAM_CHIEU_DAM,
  BMR,
  GIAM_CAN_TOI_DA_KG_MOI_TUAN,
  HE_SO_CONG_VIEC,
  KCAL_MOI_GAM,
  MET_NGHI,
  MET_THEO_CUONG_DO,
  MUC_SAN_CALO,
  PROTEIN_G_PER_KG,
  PROTEIN_THEM_KHI_CHOI_THE_THAO,
  TI_LE_CHAT_BEO,
} from "@/lib/config";
import {
  NHAN_AN_CAN_BANG,
  NHAN_CONG_VIEC,
  NHAN_CUONG_DO,
  NHAN_MUC_TIEU,
} from "@/lib/labels";
import { calcBMR } from "./body";
import type { HoSoTinhToan, KeHoach } from "./plan";
import type { LyDoTang1 } from "./safety";
import type { KetQuaMucTieuCan } from "./weightGoal";

/** Định dạng số kiểu Việt Nam: 1.618 (nghìn) và 6,25 (thập phân). */
export function so(n: number, chuSoThapPhan = 0): string {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: chuSoThapPhan });
}

export interface BuocGiaiThich {
  tieuDe: string;
  noiDung: string;
}

export function giaiThichKeHoach(
  hs: HoSoTinhToan,
  k: KeHoach,
): BuocGiaiThich[] {
  const buoc: BuocGiaiThich[] = [];
  const laNam = hs.gioiTinh === "nam";

  // 1. BMR — hiện tới 1 chữ số thập phân để các bước sau bấm máy tính lại vẫn khớp
  const bmrChinhXac = calcBMR(
    hs.gioiTinh,
    hs.canNangKg,
    hs.chieuCaoCm,
    hs.tuoi,
  );
  const hangSo = laNam
    ? `+ ${BMR.HANG_SO_NAM}`
    : `− ${Math.abs(BMR.HANG_SO_NU)}`;
  buoc.push({
    tieuDe: "1. Năng lượng lúc nghỉ (BMR)",
    noiDung:
      `Đây là năng lượng cơ thể cần để duy trì sự sống khi nghỉ ngơi hoàn toàn. ` +
      `Theo công thức Mifflin-St Jeor cho ${laNam ? "nam" : "nữ"}: ` +
      `${BMR.HE_SO_CAN_NANG} × ${so(hs.canNangKg, 1)} kg + ${so(BMR.HE_SO_CHIEU_CAO, 2)} × ${so(hs.chieuCaoCm, 1)} cm ` +
      `− ${BMR.HE_SO_TUOI} × ${hs.tuoi} tuổi ${hangSo} = ${so(bmrChinhXac, 1)} kcal.`,
  });

  // 2. Hệ số công việc
  const heSo = HE_SO_CONG_VIEC[hs.congViec];
  const nangLuongCongViec = Math.round(bmrChinhXac * heSo);
  buoc.push({
    tieuDe: "2. Năng lượng cho sinh hoạt hằng ngày",
    noiDung:
      `Công việc "${NHAN_CONG_VIEC[hs.congViec].toLowerCase()}" có hệ số ${so(heSo, 2)}: ` +
      `${so(bmrChinhXac, 1)} × ${so(heSo, 2)} ≈ ${so(nangLuongCongViec)} kcal.`,
  });

  // 3. Calo tập
  if (hs.theThao && hs.theThao.soBuoiMoiTuan > 0) {
    const t = hs.theThao;
    const met = MET_THEO_CUONG_DO[t.cuongDo];
    const gio = (t.soBuoiMoiTuan * t.phutMoiBuoi) / 60;
    buoc.push({
      tieuDe: "3. Năng lượng cho tập luyện",
      noiDung:
        `Bạn tập ${t.soBuoiMoiTuan} buổi × ${t.phutMoiBuoi} phút = ${so(gio, 2)} giờ mỗi tuần, ` +
        `cường độ ${NHAN_CUONG_DO[t.cuongDo].toLowerCase()} (MET ${so(met, 1)}). ` +
        `Trung bình mỗi ngày: (${so(met, 1)} − ${MET_NGHI}) × ${so(hs.canNangKg, 1)} kg × ${so(gio, 2)} giờ ÷ 7 ≈ ${so(k.caloTap)} kcal. ` +
        `Mình trừ ${MET_NGHI} để không tính trùng phần năng lượng lúc nghỉ đã có trong BMR.`,
    });
  } else {
    buoc.push({
      tieuDe: "3. Năng lượng cho tập luyện",
      noiDung: "Bạn chưa chơi thể thao thường xuyên nên phần này bằng 0 kcal.",
    });
  }

  // 4. TDEE
  buoc.push({
    tieuDe: "4. Tổng năng lượng mỗi ngày (TDEE)",
    noiDung: `${so(nangLuongCongViec)} + ${so(k.caloTap)} ≈ ${so(k.tdee)} kcal (làm tròn). Ăn đúng mức này thì cân nặng gần như giữ nguyên.`,
  });

  // 5. Calo mục tiêu
  const phanTram = so(Math.abs(k.tiLeDieuChinh) * 100, 1);
  let noiDungMucTieu: string;
  if (k.mucTieuApDung !== k.mucTieuNguoiDung) {
    noiDungMucTieu =
      `Vì lý do an toàn, mình áp dụng chế độ "${NHAN_AN_CAN_BANG}" thay cho mục tiêu bạn chọn, ` +
      `nên calo mục tiêu bằng TDEE: ${so(k.caloTruocMucSan)} kcal.`;
  } else if (k.mucTieuApDung === "giam_mo") {
    noiDungMucTieu =
      `Để giảm mỡ nhẹ nhàng, mình bớt ${phanTram}% so với TDEE: ` +
      `${so(k.tdee)} × (1 − ${phanTram}%) ≈ ${so(k.caloTruocMucSan)} kcal.`;
  } else if (k.mucTieuApDung === "tang_co") {
    noiDungMucTieu =
      `Để tăng cơ, mình thêm ${phanTram}% so với TDEE: ` +
      `${so(k.tdee)} × (1 + ${phanTram}%) ≈ ${so(k.caloTruocMucSan)} kcal.`;
  } else {
    noiDungMucTieu = `Với mục tiêu "${NHAN_MUC_TIEU[k.mucTieuApDung].toLowerCase()}", calo mục tiêu bằng TDEE: ${so(k.caloTruocMucSan)} kcal.`;
  }
  const mucToiThieu = MUC_SAN_CALO[hs.gioiTinh];
  noiDungMucTieu += ` Mức sàn an toàn của bạn là ${so(k.mucSan)} kcal (số lớn hơn giữa BMR và ${so(mucToiThieu)} kcal với ${laNam ? "nam" : "nữ"}).`;
  noiDungMucTieu += k.daNangLenMucSan
    ? ` Vì con số trên thấp hơn mức sàn, mình dùng ${so(k.caloMucTieu)} kcal để cơ thể vẫn đủ năng lượng.`
    : ` Con số của bạn cao hơn mức sàn nên giữ nguyên: ${so(k.caloMucTieu)} kcal.`;
  buoc.push({ tieuDe: "5. Calo mục tiêu mỗi ngày", noiDung: noiDungMucTieu });

  // Bệnh thận: không đưa con số đạm/béo/carb — lượng đạm cần bác sĩ chỉ định riêng
  if (k.an_toan.anGoiYMacro) {
    buoc.push({ tieuDe: "6. Chia theo nhóm chất", noiDung: LOI_DAM_BENH_THAN });
    return buoc;
  }

  // 6. Protein
  const coTheThao = hs.theThao !== null && hs.theThao.soBuoiMoiTuan > 0;
  const proteinGoc = PROTEIN_G_PER_KG[k.mucTieuApDung];
  const giaiThichGPerKg = coTheThao
    ? `${so(proteinGoc, 1)} g/kg cho mục tiêu của bạn + ${so(PROTEIN_THEM_KHI_CHOI_THE_THAO, 1)} g/kg vì bạn có chơi thể thao = ${so(k.macro.proteinGPerKg, 1)} g/kg`
    : `${so(proteinGoc, 1)} g/kg cho mục tiêu của bạn`;
  buoc.push({
    tieuDe: "6. Chất đạm (protein)",
    noiDung:
      `${giaiThichGPerKg}. ${so(k.macro.proteinGPerKg, 1)} × ${so(k.canNangTinhDam, 1)} kg ≈ ${so(k.macro.proteinG)} g ` +
      `(mỗi gam ${KCAL_MOI_GAM.protein} kcal → ${so(k.macro.proteinKcal)} kcal).` +
      // BMI > 25: đạm tính theo cân nặng ứng với BMI 25 thay vì cân nặng thật
      (k.canNangTinhDam < hs.canNangKg
        ? ` Vì BMI của bạn cao hơn ${BMI_THAM_CHIEU_DAM}, mình dùng cân nặng ứng với BMI ${BMI_THAM_CHIEU_DAM} ` +
          `(${BMI_THAM_CHIEU_DAM} × ${so(hs.chieuCaoCm / 100, 2)}² ≈ ${so(k.canNangTinhDam, 1)} kg) thay cho ${so(hs.canNangKg, 1)} kg, ` +
          `để lượng đạm không cao quá mức cần.`
        : ""),
  });

  // 7. Chất béo
  const tiLeBeo = so(TI_LE_CHAT_BEO * 100);
  buoc.push({
    tieuDe: "7. Chất béo",
    noiDung:
      `Chiếm ${tiLeBeo}% tổng calo: ${tiLeBeo}% × ${so(k.caloMucTieu)} ≈ ${so(k.macro.fatKcal)} kcal, ` +
      `chia ${KCAL_MOI_GAM.fat} kcal/gam ≈ ${so(k.macro.fatG)} g.`,
  });

  // 8. Carb
  buoc.push({
    tieuDe: "8. Tinh bột (carb)",
    noiDung:
      `Phần calo còn lại: ${so(k.caloMucTieu)} − ${so(k.macro.proteinKcal)} − ${so(k.macro.fatKcal)} = ${so(k.macro.carbKcal)} kcal, ` +
      `chia ${KCAL_MOI_GAM.carb} kcal/gam ≈ ${so(k.macro.carbG)} g.`,
  });

  return buoc;
}

// ─────────────────────────────────────────────
// Lời giải thích nhẹ nhàng cho tầng 1
// ─────────────────────────────────────────────
const LOI_TANG_1: Record<LyDoTang1, string> = {
  duoi_18_tuoi:
    "Bạn đang ở độ tuổi cơ thể còn phát triển, nên ăn đủ và cân bằng quan trọng hơn việc giảm hay tăng cân.",
  mang_thai_cho_con_bu:
    "Khi mang thai hoặc cho con bú, cơ thể cần nhiều dưỡng chất hơn bình thường, nên mình chỉ gợi ý ăn cân bằng.",
  benh_than:
    "Với bệnh thận, lượng đạm và muối cần được bác sĩ điều chỉnh riêng cho bạn, nên mình chỉ gợi ý ăn cân bằng.",
  van_de_an_uong:
    "Cảm ơn bạn đã chia sẻ. Để an toàn, mình sẽ không đặt mục tiêu giảm hay tăng cân mà chỉ đồng hành cùng bạn ăn cân bằng.",
  bmi_thap_giam_mo:
    "Cân nặng hiện tại của bạn đã ở mức thấp so với chiều cao, nên mình không gợi ý giảm mỡ.",
};

export const LOI_KHUYEN_CHUYEN_GIA =
  "Bạn nên trò chuyện thêm với bác sĩ hoặc chuyên gia dinh dưỡng để có lời khuyên phù hợp nhất với mình nhé.";

export const LOI_DAM_BENH_THAN =
  "Với bệnh thận, lượng đạm phù hợp nên do bác sĩ chỉ định riêng cho bạn, nên mình không đưa ra con số chia theo nhóm chất.";

export const LOI_BMI_THAP_AN_GIAM_MO =
  "Cân nặng hiện tại của bạn đã ở mức thấp so với chiều cao, nên mình chưa gợi ý giảm mỡ.";

export function giaiThichTang1(lyDo: LyDoTang1[]): string[] {
  return lyDo.map((l) => LOI_TANG_1[l]);
}

// ─────────────────────────────────────────────
// Lời giải thích về cân mục tiêu
// ─────────────────────────────────────────────
export function giaiThichMucTieuCan(
  kq: KetQuaMucTieuCan,
  thongTin: {
    mucTieu: "giam_mo" | "tang_co";
    canHienTaiKg: number;
    canMucTieuKg: number;
    soTuan: number;
  },
): string | null {
  const { mucTieu, canHienTaiKg, canMucTieuKg, soTuan } = thongTin;
  const giam = mucTieu === "giam_mo";

  switch (kq.trangThai) {
    case "ok":
      return null;
    case "khong_hop_le":
      return giam
        ? `Với mục tiêu giảm mỡ, cân mục tiêu cần thấp hơn cân hiện tại (${so(canHienTaiKg, 1)} kg) bạn nhé.`
        : `Với mục tiêu tăng cơ, cân mục tiêu cần cao hơn cân hiện tại (${so(canHienTaiKg, 1)} kg) bạn nhé.`;
    case "bmi_thap":
      return (
        `Ở mức ${so(canMucTieuKg, 1)} kg, chỉ số BMI của bạn sẽ khoảng ${so(kq.bmiMucTieu ?? 0, 1)}, ` +
        `thấp hơn mức khỏe mạnh (18,5). Mình chưa thể đồng hành với mục tiêu này. ` +
        `Bạn thử chọn cân mục tiêu từ ${so(kq.canToiThieuKg ?? 0, 1)} kg trở lên nhé.`
      );
    case "qua_nhanh":
      return (
        `${giam ? "Giảm" : "Tăng"} ${so(Math.abs(canMucTieuKg - canHienTaiKg), 1)} kg trong ${soTuan} tuần ` +
        `là khoảng ${so((kq.tiLeMoiTuan ?? 0) * 100, 1)}% cân nặng mỗi tuần, hơi gấp so với mức an toàn ` +
        (giam
          ? `(tối đa ${so(kq.tiLeToiDa * 100, 1)}% cân nặng và không quá ${so(GIAM_CAN_TOI_DA_KG_MOI_TUAN)} kg mỗi tuần). `
          : `(tối đa ${so(kq.tiLeToiDa * 100, 1)}%/tuần). `) +
        `Mình đề xuất khoảng ${kq.soTuanDeXuat} tuần ` +
        `để cơ thể thích nghi nhẹ nhàng hơn.`
      );
  }
}
