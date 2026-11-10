/**
 * Chữ tiếng Việt hiển thị cho các mã trong code.
 * Đổi chữ trên giao diện thì sửa ở đây.
 */
import type {
  BenhNen,
  CongViec,
  CuongDo,
  GioiTinh,
  MucTieu,
  TraLoiVanDeAnUong,
} from "@/lib/engine/types";

export const NHAN_GIOI_TINH: Record<GioiTinh, string> = {
  nam: "Nam",
  nu: "Nữ",
};

export const NHAN_CONG_VIEC: Record<CongViec, string> = {
  ngoi_nhieu: "Ngồi nhiều",
  dung_di_lai: "Đứng, đi lại nhiều",
  lao_dong_chan_tay: "Lao động chân tay",
};

export const NHAN_CUONG_DO: Record<CuongDo, string> = {
  nhe: "Nhẹ",
  vua: "Vừa",
  nang: "Nặng",
};

export const NHAN_MUC_TIEU: Record<MucTieu, string> = {
  giam_mo: "Giảm mỡ",
  tang_co: "Tăng cơ",
  duy_tri: "Duy trì cân nặng",
  an_lanh_manh: "Ăn lành mạnh hơn",
};

/** Ở tầng 1, "Ăn lành mạnh hơn" được gọi là "Ăn cân bằng" (SPEC mục 4). */
export const NHAN_AN_CAN_BANG = "Ăn cân bằng";

export const NHAN_BENH_NEN: Record<BenhNen, string> = {
  tieu_duong: "Tiểu đường",
  gout: "Gout",
  huyet_ap_cao: "Huyết áp cao",
  benh_than: "Bệnh thận",
};

export const NHAN_VAN_DE_AN_UONG: Record<TraLoiVanDeAnUong, string> = {
  co: "Có",
  khong: "Không",
  khong_muon_tra_loi: "Không muốn trả lời",
};

export type CheDoAn = "khong_kieng" | "chay" | "khong_heo";
export const NHAN_CHE_DO_AN: Record<CheDoAn, string> = {
  khong_kieng: "Không kiêng",
  chay: "Ăn chay",
  khong_heo: "Không ăn thịt heo",
};

export type NoiAn = "an_ngoai" | "nau_nha";
export const NHAN_NOI_AN: Record<NoiAn, string> = {
  an_ngoai: "Chủ yếu ăn ngoài",
  nau_nha: "Chủ yếu nấu ở nhà",
};

export function nhanThoiGianNau(phut: number): string {
  if (phut >= 120) return "Thoải mái";
  if (phut >= 60) return `${phut / 60} tiếng`;
  return `${phut} phút`;
}

export const NHAN_PHONG_CACH = {
  can_bang: "Cân bằng",
  high_protein: "High-protein",
  tiet_kiem: "Tiết kiệm",
} as const;

export const NHAN_BUA = {
  sang: "Bữa sáng",
  trua: "Bữa trưa",
  toi: "Bữa tối",
  phu: "Bữa phụ",
} as const;

export const NHAN_KHAU_PHAN = {
  it: "Ít",
  vua: "Vừa",
  nhieu: "Nhiều",
} as const;

export const NHAN_THU = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];
export const NHAN_THU_NGAN = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Gợi ý nới bộ lọc khi không đủ món (theo lý do loại nhiều món nhất) */
export const GOI_Y_NOI_BO_LOC = {
  benh_nen:
    "Một số món được loại vì không phù hợp với bệnh nền — phần này mình giữ nguyên để an toàn cho bạn.",
  di_ung: "Nhiều món có chứa chất bạn dị ứng.",
  che_do_an: "Danh sách món phù hợp chế độ ăn của bạn còn ít.",
  khong_thich: 'Bạn có thể bỏ bớt vài món trong danh sách "Món không thích".',
  ngan_sach:
    "Bạn có thể tăng ngân sách mỗi bữa thêm một chút, hoặc nấu ở nhà nhiều hơn — món nấu ở nhà thường rẻ hơn.",
  thoi_gian_nau: "Bạn có thể chọn thời gian nấu dài hơn.",
} as const;

/** Mô tả nhóm BMI — lời nhẹ nhàng, không dùng chữ "béo phì" trên giao diện */
export const NHAN_NHOM_BMI = {
  thieu_can: "thấp hơn khoảng khỏe mạnh",
  binh_thuong: "trong khoảng khỏe mạnh",
  thua_can: "cao hơn khoảng khỏe mạnh một chút",
  beo_phi_1: "cao hơn khoảng khỏe mạnh",
  beo_phi_2: "cao hơn khoảng khỏe mạnh",
} as const;

export const LOI_BMI_CAN_BAC_SI =
  "Với chỉ số BMI từ 30 trở lên, giảm cân an toàn và hiệu quả nhất là khi có bác sĩ hoặc chuyên gia dinh dưỡng theo dõi.";
