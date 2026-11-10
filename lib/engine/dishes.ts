/**
 * Món ăn: kiểu dữ liệu, dinh dưỡng theo khẩu phần, và bộ lọc món (SPEC mục 4, 5, 6).
 * Số liệu dinh dưỡng LẤY TỪ data/dishes.json — engine chỉ nhân với hệ số khẩu phần.
 */
import { HE_SO_NGAN_SACH_LINH_HOAT } from "@/lib/config";

export type Bua = "sang" | "trua" | "toi" | "phu";
export type KhauPhan = "it" | "vua" | "nhieu";
export const CAC_KHAU_PHAN: KhauPhan[] = ["it", "vua", "nhieu"];

export interface DinhDuong {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

/** Đúng schema ở SPEC mục 5 */
export interface Mon {
  id: string;
  name: string;
  meal: Bua[];
  per_serving_vua: DinhDuong;
  portion_factor: Record<KhauPhan, number>;
  price_vnd: number;
  cook_minutes: number;
  eat_out: boolean;
  diet: ("chay" | "khong_heo")[];
  allergens: string[];
  health_tags: ("nhieu_duong" | "gi_thap" | "nhieu_purine" | "nhieu_muoi")[];
  style_tags: ("high_protein" | "tiet_kiem" | "nhanh_15p")[];
  ingredients: string[];
  verified: boolean;
  /** Nguồn số liệu khi đã kiểm tra, vd "Bảng thành phần thực phẩm VN 2007 + công thức nhóm" */
  source?: string;
}

/** Dinh dưỡng của món theo khẩu phần = số liệu phần "vừa" × hệ số khẩu phần (làm tròn). */
export function dinhDuongKhauPhan(mon: Mon, khauPhan: KhauPhan): DinhDuong {
  const h = mon.portion_factor[khauPhan];
  const v = mon.per_serving_vua;
  return {
    kcal: Math.round(v.kcal * h),
    protein: Math.round(v.protein * h),
    carb: Math.round(v.carb * h),
    fat: Math.round(v.fat * h),
  };
}

export interface BoLoc {
  tagLoai: string[]; // tầng 2: tag sức khỏe cần loại (vd nhieu_duong)
  diUng: string[]; // tầng 3: mã chất gây dị ứng
  cheDoAn: "khong_kieng" | "chay" | "khong_heo";
  monKhongThich: string[]; // id món
  nganSachMoiBuaVnd: number;
  thoiGianNauToiDa: number; // phút
}

export type LyDoLoai =
  | "benh_nen" // vi phạm luật an toàn tầng 2
  | "di_ung"
  | "che_do_an"
  | "khong_thich"
  | "ngan_sach"
  | "thoi_gian_nau";

/**
 * Trả về lý do loại món (lý do đầu tiên gặp), hoặc null nếu món hợp lệ.
 * Thứ tự kiểm tra = thứ tự ưu tiên: an toàn trước, sở thích sau.
 */
export function lyDoLoai(mon: Mon, b: BoLoc): LyDoLoai | null {
  if (mon.health_tags.some((t) => b.tagLoai.includes(t))) return "benh_nen";
  // Dị ứng: so với danh sách allergens của món — gồm cả allergen ẩn như nước mắm, mắm tôm
  if (mon.allergens.some((a) => b.diUng.includes(a))) return "di_ung";
  if (b.cheDoAn === "chay" && !mon.diet.includes("chay")) return "che_do_an";
  // Món chay thì chắc chắn không có thịt heo
  if (
    b.cheDoAn === "khong_heo" &&
    !mon.diet.includes("khong_heo") &&
    !mon.diet.includes("chay")
  )
    return "che_do_an";
  if (b.monKhongThich.includes(mon.id)) return "khong_thich";
  // Ngân sách là TRUNG BÌNH mỗi bữa: một bữa được linh hoạt tới 1,5 lần (tổng ngày kiểm tra ở menu.ts)
  if (mon.price_vnd > b.nganSachMoiBuaVnd * HE_SO_NGAN_SACH_LINH_HOAT)
    return "ngan_sach";
  if (mon.cook_minutes > b.thoiGianNauToiDa) return "thoi_gian_nau";
  return null;
}

export function locMon(mons: Mon[], b: BoLoc): Mon[] {
  return mons.filter((m) => lyDoLoai(m, b) === null);
}

/** Đếm số món bị loại theo từng lý do — dùng để gợi ý "nới bộ lọc nào" khi không đủ món. */
export function demLyDoLoai(
  mons: Mon[],
  b: BoLoc,
): Partial<Record<LyDoLoai, number>> {
  const dem: Partial<Record<LyDoLoai, number>> = {};
  for (const m of mons) {
    const l = lyDoLoai(m, b);
    if (l) dem[l] = (dem[l] ?? 0) + 1;
  }
  return dem;
}
