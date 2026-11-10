"use client";
/**
 * Nội dung 5 bước nhập của onboarding (bước 6 là trang Kết quả).
 * Mỗi bước nhận bản nháp (d), hàm sửa (sua) và lỗi (loi) để hiện lời nhắc.
 */
import {
  DANH_SACH_DI_UNG,
  GIOI_HAN_NHAP,
  THOI_GIAN_NAU_LUA_CHON,
} from "@/lib/config";
import {
  LOI_BMI_THAP_AN_GIAM_MO,
  LOI_KHUYEN_CHUYEN_GIA,
  giaiThichMucTieuCan,
  giaiThichTang1,
  so,
} from "@/lib/engine/explain";
import { bmiHopLy, calcBMI, phanLoaiBMI } from "@/lib/engine/body";
import { mucTieuGoiY } from "@/lib/engine/safety";
import type { BenhNen, MucTieu } from "@/lib/engine/types";
import {
  NHAN_AN_CAN_BANG,
  NHAN_BENH_NEN,
  NHAN_CHE_DO_AN,
  NHAN_CONG_VIEC,
  NHAN_CUONG_DO,
  NHAN_GIOI_TINH,
  LOI_BMI_CAN_BAC_SI,
  NHAN_NHOM_BMI,
  NHAN_MUC_TIEU,
  NHAN_NOI_AN,
  NHAN_VAN_DE_AN_UONG,
  nhanThoiGianNau,
  type CheDoAn,
  type NoiAn,
} from "@/lib/labels";
import {
  anToanTuDraft,
  docSo,
  kiemTraCanTuDraft,
  type Draft,
  type LoiBuoc,
} from "@/lib/profile";
import {
  ChonMot,
  ChonNhieu,
  HopGhiChu,
  LoiNhac,
  NhanO,
  ONhapSo,
} from "@/components/ui";
import { TimMonKhongThich } from "./TimMon";

export interface PropsBuoc {
  d: Draft;
  sua: (thayDoi: Partial<Draft>) => void;
  loi: LoiBuoc;
}

const CO_KHONG = [
  { giaTri: true, nhan: "Có" },
  { giaTri: false, nhan: "Không" },
];

function TieuDe({ tieuDe, moTa }: { tieuDe: string; moTa?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{tieuDe}</h1>
      {moTa && <p className="mt-1 text-sm text-gray-600">{moTa}</p>}
    </div>
  );
}

// ─────────────────────────── Bước 1 ───────────────────────────
export function Buoc1({ d, sua, loi }: PropsBuoc) {
  const benh = Object.entries(NHAN_BENH_NEN).map(([giaTri, nhan]) => ({
    giaTri,
    nhan,
  }));
  return (
    <>
      <TieuDe
        tieuDe="Một vài câu hỏi an toàn"
        moTa="Giúp mình gợi ý phù hợp và an toàn hơn cho bạn. Thông tin chỉ lưu trên máy của bạn."
      />
      <div>
        <NhanO>Giới tính sinh học</NhanO>
        <ChonMot
          cot={2}
          tuyChon={[
            { giaTri: "nam" as const, nhan: NHAN_GIOI_TINH.nam },
            { giaTri: "nu" as const, nhan: NHAN_GIOI_TINH.nu },
          ]}
          giaTri={d.gioiTinh}
          onChon={(v) =>
            // Chọn Nam → câu mang thai không áp dụng, tự ghi "không"
            sua(
              v === "nam"
                ? { gioiTinh: v, mangThaiChoConBu: false }
                : { gioiTinh: v },
            )
          }
        />
        <p className="mt-1 text-xs text-gray-500">
          Công thức tính năng lượng khác nhau giữa nam và nữ.
        </p>
        <LoiNhac>{loi.gioiTinh}</LoiNhac>
      </div>
      <div>
        <NhanO htmlFor="tuoi">Bạn bao nhiêu tuổi?</NhanO>
        <ONhapSo
          id="tuoi"
          giaTri={d.tuoi}
          onDoi={(v) => sua({ tuoi: v })}
          donVi="tuổi"
          placeholder="vd: 20"
        />
        <LoiNhac>{loi.tuoi}</LoiNhac>
      </div>
      {/* Chỉ hỏi khi chọn Nữ */}
      {d.gioiTinh === "nu" && (
        <div>
          <NhanO>Bạn đang mang thai hoặc cho con bú?</NhanO>
          <ChonMot
            cot={2}
            tuyChon={CO_KHONG}
            giaTri={d.mangThaiChoConBu}
            onChon={(v) => sua({ mangThaiChoConBu: v })}
          />
          <LoiNhac>{loi.mangThaiChoConBu}</LoiNhac>
        </div>
      )}
      <div>
        <NhanO>Bạn có bệnh nền nào không? (chọn nhiều)</NhanO>
        <ChonNhieu
          tuyChon={benh}
          giaTri={d.benhNen}
          onDoi={(v) => sua({ benhNen: v as BenhNen[], khongCoBenh: false })}
        />
        <div className="mt-2">
          <ChonNhieu
            cot={1}
            tuyChon={[{ giaTri: "khong_co", nhan: "Không có" }]}
            giaTri={d.khongCoBenh ? ["khong_co"] : []}
            onDoi={(v) =>
              sua({
                khongCoBenh: v.length > 0,
                benhNen: v.length > 0 ? [] : d.benhNen,
              })
            }
          />
        </div>
        <LoiNhac>{loi.benhNen}</LoiNhac>
      </div>
      <div>
        <NhanO>Bạn có đang được theo dõi về vấn đề ăn uống không?</NhanO>
        <ChonMot
          tuyChon={Object.entries(NHAN_VAN_DE_AN_UONG).map(
            ([giaTri, nhan]) => ({
              giaTri: giaTri as Draft["vanDeAnUong"] & string,
              nhan,
            }),
          )}
          giaTri={d.vanDeAnUong}
          onChon={(v) => sua({ vanDeAnUong: v })}
        />
        <LoiNhac>{loi.vanDeAnUong}</LoiNhac>
      </div>
    </>
  );
}

// ─────────────────────────── Bước 2 ───────────────────────────
export function Buoc2({ d, sua, loi }: PropsBuoc) {
  return (
    <>
      <TieuDe
        tieuDe="Về cơ thể của bạn"
        moTa="Dùng để tính năng lượng cơ thể cần mỗi ngày."
      />
      <div>
        <NhanO htmlFor="cao">Chiều cao</NhanO>
        <ONhapSo
          id="cao"
          giaTri={d.chieuCaoCm}
          onDoi={(v) => sua({ chieuCaoCm: v })}
          donVi="cm"
          placeholder="vd: 165"
          thapPhan
        />
        <LoiNhac>{loi.chieuCaoCm}</LoiNhac>
      </div>
      <div>
        <NhanO htmlFor="can">Cân nặng</NhanO>
        <ONhapSo
          id="can"
          giaTri={d.canNangKg}
          onDoi={(v) => sua({ canNangKg: v })}
          donVi="kg"
          placeholder="vd: 55"
          thapPhan
        />
        <LoiNhac>{loi.canNangKg}</LoiNhac>
      </div>
    </>
  );
}

// ─────────────────────────── Bước 3 ───────────────────────────
export function Buoc3({ d, sua, loi }: PropsBuoc) {
  return (
    <>
      <TieuDe tieuDe="Bạn vận động thế nào?" />
      <div>
        <NhanO>Công việc / việc học hằng ngày của bạn</NhanO>
        <ChonMot
          tuyChon={[
            {
              giaTri: "ngoi_nhieu" as const,
              nhan: NHAN_CONG_VIEC.ngoi_nhieu,
              moTa: "Học, làm văn phòng, ít đi lại",
            },
            {
              giaTri: "dung_di_lai" as const,
              nhan: NHAN_CONG_VIEC.dung_di_lai,
              moTa: "Bán hàng, phục vụ, đi lại nhiều",
            },
            {
              giaTri: "lao_dong_chan_tay" as const,
              nhan: NHAN_CONG_VIEC.lao_dong_chan_tay,
              moTa: "Bốc vác, xây dựng, việc nặng",
            },
          ]}
          giaTri={d.congViec}
          onChon={(v) => sua({ congViec: v })}
        />
        <LoiNhac>{loi.congViec}</LoiNhac>
      </div>
      <div>
        <NhanO>Bạn có chơi thể thao thường xuyên không?</NhanO>
        <ChonMot
          cot={2}
          tuyChon={CO_KHONG}
          giaTri={d.coTheThao}
          onChon={(v) => sua({ coTheThao: v })}
        />
        <LoiNhac>{loi.coTheThao}</LoiNhac>
      </div>
      {d.coTheThao && (
        <>
          <div>
            <NhanO htmlFor="mon">Môn thể thao</NhanO>
            <input
              id="mon"
              type="text"
              value={d.monTheThao}
              onChange={(e) => sua({ monTheThao: e.target.value })}
              placeholder="vd: bóng đá, cầu lông, chạy bộ"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
            <LoiNhac>{loi.monTheThao}</LoiNhac>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <NhanO htmlFor="buoi">Số buổi/tuần</NhanO>
              <ONhapSo
                id="buoi"
                giaTri={d.soBuoiMoiTuan}
                onDoi={(v) => sua({ soBuoiMoiTuan: v })}
                placeholder="vd: 3"
              />
              <LoiNhac>{loi.soBuoiMoiTuan}</LoiNhac>
            </div>
            <div>
              <NhanO htmlFor="phut">Phút/buổi</NhanO>
              <ONhapSo
                id="phut"
                giaTri={d.phutMoiBuoi}
                onDoi={(v) => sua({ phutMoiBuoi: v })}
                placeholder="vd: 60"
              />
              <LoiNhac>{loi.phutMoiBuoi}</LoiNhac>
            </div>
          </div>
          <div>
            <NhanO>Cường độ</NhanO>
            <ChonMot
              tuyChon={[
                {
                  giaTri: "nhe" as const,
                  nhan: NHAN_CUONG_DO.nhe,
                  moTa: "Vẫn nói chuyện thoải mái (đi bộ nhanh, yoga)",
                },
                {
                  giaTri: "vua" as const,
                  nhan: NHAN_CUONG_DO.vua,
                  moTa: "Thở nhanh, hơi khó nói (đá bóng phong trào, đạp xe)",
                },
                {
                  giaTri: "nang" as const,
                  nhan: NHAN_CUONG_DO.nang,
                  moTa: "Thở dốc, khó nói thành câu (chạy nhanh, HIIT)",
                },
              ]}
              giaTri={d.cuongDo}
              onChon={(v) => sua({ cuongDo: v })}
            />
            <LoiNhac>{loi.cuongDo}</LoiNhac>
          </div>
        </>
      )}
    </>
  );
}

// ─────────────────────────── Bước 4 ───────────────────────────
const MO_TA_MUC_TIEU: Record<MucTieu, string> = {
  giam_mo: "Giảm mỡ từ từ, an toàn",
  tang_co: "Tăng cân nạc, kết hợp tập luyện",
  duy_tri: "Giữ cân nặng hiện tại",
  an_lanh_manh: "Không cần đổi cân nặng, chỉ ăn đủ chất hơn",
};

export function Buoc4({ d, sua, loi }: PropsBuoc) {
  const anToan = anToanTuDraft(d);
  const choPhep = anToan.mucTieuDuocChon;
  const biKhoa = anToan.tang1; // tầng 1: chỉ còn "Ăn cân bằng"
  const anGiamMo = !biKhoa && !choPhep.includes("giam_mo"); // BMI thấp

  // BMI hiện tại + mục tiêu gợi ý (chỉ gợi ý, người dùng vẫn tự chọn)
  const can = docSo(d.canNangKg);
  const cao = docSo(d.chieuCaoCm);
  const bmi = bmiHopLy(can, cao) ? calcBMI(can, cao) : null;
  const goiY = biKhoa ? [] : mucTieuGoiY(can, cao, choPhep);

  const canNhapCan = d.mucTieu === "giam_mo" || d.mucTieu === "tang_co";
  const kq = canNhapCan ? kiemTraCanTuDraft(d) : null;
  const loiMucTieuCan =
    loi.canMucTieuKg === "MUC_TIEU_CHUA_NHAN" && kq && canNhapCan
      ? giaiThichMucTieuCan(kq, {
          mucTieu: d.mucTieu as "giam_mo" | "tang_co",
          canHienTaiKg: docSo(d.canNangKg),
          canMucTieuKg: docSo(d.canMucTieuKg),
          soTuan: docSo(d.soTuan),
        })
      : loi.canMucTieuKg;

  return (
    <>
      <TieuDe tieuDe="Mục tiêu của bạn" />

      {biKhoa && (
        <HopGhiChu tieuDe={`Mình gợi ý chế độ "${NHAN_AN_CAN_BANG}"`}>
          {giaiThichTang1(anToan.lyDoTang1).map((c) => (
            <p key={c} className="mb-1">
              {c}
            </p>
          ))}
          <p className="mt-2">{LOI_KHUYEN_CHUYEN_GIA}</p>
        </HopGhiChu>
      )}
      {anGiamMo && <HopGhiChu>{LOI_BMI_THAP_AN_GIAM_MO}</HopGhiChu>}

      {bmi !== null && !biKhoa && (
        <p className="-mt-2 text-sm text-gray-600">
          Chỉ số BMI của bạn khoảng <strong>{so(bmi, 1)}</strong> —{" "}
          {NHAN_NHOM_BMI[phanLoaiBMI(bmi)]} theo chuẩn châu Á (18,5–22,9).
        </p>
      )}
      {anToan.bmiCanBacSi && !biKhoa && (
        <HopGhiChu kieu="luu_y">{LOI_BMI_CAN_BAC_SI}</HopGhiChu>
      )}

      <div>
        <ChonMot
          tuyChon={choPhep.map((m) => ({
            giaTri: m,
            nhan: biKhoa ? NHAN_AN_CAN_BANG : NHAN_MUC_TIEU[m],
            moTa: goiY.includes(m)
              ? `✓ Gợi ý cho bạn · ${MO_TA_MUC_TIEU[m]}`
              : MO_TA_MUC_TIEU[m],
          }))}
          giaTri={d.mucTieu}
          onChon={(v) => sua({ mucTieu: v })}
        />
        <LoiNhac>{loi.mucTieu}</LoiNhac>
      </div>

      {canNhapCan && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <NhanO htmlFor="canMT">Cân mục tiêu</NhanO>
            <ONhapSo
              id="canMT"
              giaTri={d.canMucTieuKg}
              onDoi={(v) => sua({ canMucTieuKg: v })}
              donVi="kg"
              thapPhan
            />
          </div>
          <div>
            <NhanO htmlFor="tuan">Trong vòng</NhanO>
            <ONhapSo
              id="tuan"
              giaTri={d.soTuan}
              onDoi={(v) => sua({ soTuan: v })}
              donVi="tuần"
            />
          </div>
          <div className="col-span-2 -mt-2">
            <LoiNhac>{loiMucTieuCan}</LoiNhac>
            <LoiNhac>{loi.soTuan}</LoiNhac>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────── Bước 5 ───────────────────────────
export function Buoc5({ d, sua, loi }: PropsBuoc) {
  const G = GIOI_HAN_NHAP.nganSachMoiBuaVnd;
  return (
    <>
      <TieuDe
        tieuDe="Thói quen ăn uống"
        moTa="Để thực đơn hợp khẩu vị và túi tiền của bạn."
      />
      <div>
        <NhanO>
          Bạn bị dị ứng với gì không? (chọn nhiều, bỏ trống nếu không)
        </NhanO>
        <ChonNhieu
          tuyChon={DANH_SACH_DI_UNG.map((x) => ({ giaTri: x.ma, nhan: x.ten }))}
          giaTri={d.diUng}
          onDoi={(v) => sua({ diUng: v })}
        />
        <LoiNhac>{loi.diUng}</LoiNhac>
      </div>
      <div>
        <NhanO>Chế độ ăn</NhanO>
        <ChonMot
          tuyChon={(Object.keys(NHAN_CHE_DO_AN) as CheDoAn[]).map((k) => ({
            giaTri: k,
            nhan: NHAN_CHE_DO_AN[k],
          }))}
          giaTri={d.cheDoAn}
          onChon={(v) => sua({ cheDoAn: v })}
        />
        <LoiNhac>{loi.cheDoAn}</LoiNhac>
      </div>
      <div>
        <NhanO>Món bạn không thích</NhanO>
        <TimMonKhongThich
          daChon={d.monKhongThich}
          onDoi={(v) => sua({ monKhongThich: v })}
        />
      </div>
      <div>
        <NhanO htmlFor="tien">Ngân sách trung bình mỗi bữa</NhanO>
        <ONhapSo
          id="tien"
          giaTri={d.nganSachMoiBuaVnd}
          onDoi={(v) => sua({ nganSachMoiBuaVnd: v })}
          donVi="đồng"
        />
        <p className="mt-1 text-xs text-gray-500">
          Từ {G.min.toLocaleString("vi-VN")} đến {G.max.toLocaleString("vi-VN")}{" "}
          đồng. Có bữa rẻ hơn, có bữa đắt hơn một chút, miễn tổng cả ngày không
          vượt ngân sách.
        </p>
        <LoiNhac>{loi.nganSachMoiBuaVnd}</LoiNhac>
      </div>
      <div>
        <NhanO>Thời gian nấu tối đa mỗi bữa</NhanO>
        <ChonMot
          cot={2}
          tuyChon={THOI_GIAN_NAU_LUA_CHON.map((p) => ({
            giaTri: p as number,
            nhan: nhanThoiGianNau(p),
          }))}
          giaTri={d.thoiGianNauToiDa}
          onChon={(v) => sua({ thoiGianNauToiDa: v })}
        />
        <LoiNhac>{loi.thoiGianNauToiDa}</LoiNhac>
      </div>
      <div>
        <NhanO>Số bữa mỗi ngày</NhanO>
        <ChonMot
          cot={2}
          tuyChon={[
            { giaTri: 3 as const, nhan: "3 bữa" },
            {
              giaTri: 4 as const,
              nhan: "4 bữa",
              moTa: "3 bữa chính + 1 bữa phụ",
            },
          ]}
          giaTri={d.soBua}
          onChon={(v) => sua({ soBua: v })}
        />
        <LoiNhac>{loi.soBua}</LoiNhac>
      </div>
      <div>
        <NhanO>Bạn thường ăn ở đâu?</NhanO>
        <ChonMot
          cot={2}
          tuyChon={(Object.keys(NHAN_NOI_AN) as NoiAn[]).map((k) => ({
            giaTri: k,
            nhan: NHAN_NOI_AN[k],
          }))}
          giaTri={d.noiAn}
          onChon={(v) => sua({ noiAn: v })}
        />
        <LoiNhac>{loi.noiAn}</LoiNhac>
      </div>
      {d.noiAn === "an_ngoai" && d.diUng.length > 0 && <GhiChuDiUngAnNgoai />}
    </>
  );
}

export function GhiChuDiUngAnNgoai() {
  return (
    <HopGhiChu kieu="luu_y">
      Khi ăn ở ngoài, app không thể đảm bảo món ăn không bị lẫn chất gây dị ứng.
      Bạn nhớ hỏi kỹ người bán nhé.
    </HopGhiChu>
  );
}
