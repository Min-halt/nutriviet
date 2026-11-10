"use client";
/** Trang Hồ sơ: xem lại thông tin đã nhập, sửa lại và tính lại (SPEC mục 2). */
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChonHoSoMau } from "@/components/ChonHoSoMau";
import { XoaDuLieu } from "@/components/XoaDuLieu";
import { DangTai, KhungTrang, NutLienKet } from "@/components/ui";
import { DANH_SACH_DI_UNG } from "@/lib/config";
import { so } from "@/lib/engine/explain";
import {
  NHAN_BENH_NEN,
  NHAN_CHE_DO_AN,
  NHAN_CONG_VIEC,
  NHAN_CUONG_DO,
  NHAN_GIOI_TINH,
  NHAN_MUC_TIEU,
  NHAN_NOI_AN,
  NHAN_VAN_DE_AN_UONG,
  nhanThoiGianNau,
} from "@/lib/labels";
import type { HoSo } from "@/lib/profile";
import { luuCaiDat } from "@/lib/storage";
import { useAnSoLieu, useCaiDat, useHoSo } from "@/lib/useHoSo";

export default function TrangHoSo() {
  const { daTai, hoSo } = useHoSo();
  const router = useRouter();
  useEffect(() => {
    if (daTai && !hoSo) router.replace("/onboarding");
  }, [daTai, hoSo, router]);

  if (!daTai || !hoSo) return <DangTai />;
  return <NoiDungHoSo h={hoSo} />;
}

function NoiDungHoSo({ h }: { h: HoSo }) {
  const tenDiUng = (ma: string) =>
    DANH_SACH_DI_UNG.find((x) => x.ma === ma)?.ten ?? ma;

  const nhom: { tieuDe: string; dong: [string, string][] }[] = [
    {
      tieuDe: "Sàng lọc an toàn",
      dong: [
        ["Tuổi", `${h.tuoi}`],
        ["Mang thai / cho con bú", h.mangThaiChoConBu ? "Có" : "Không"],
        [
          "Bệnh nền",
          h.benhNen.length
            ? h.benhNen.map((b) => NHAN_BENH_NEN[b]).join(", ")
            : "Không có",
        ],
        ["Đang được theo dõi về ăn uống", NHAN_VAN_DE_AN_UONG[h.vanDeAnUong]],
      ],
    },
    {
      tieuDe: "Cơ thể",
      dong: [
        ["Giới tính sinh học", NHAN_GIOI_TINH[h.gioiTinh]],
        ["Chiều cao", `${so(h.chieuCaoCm, 1)} cm`],
        ["Cân nặng", `${so(h.canNangKg, 1)} kg`],
      ],
    },
    {
      tieuDe: "Vận động",
      dong: [
        ["Công việc", NHAN_CONG_VIEC[h.congViec]],
        [
          "Thể thao",
          h.theThao
            ? `${h.theThao.mon}: ${h.theThao.soBuoiMoiTuan} buổi/tuần × ${h.theThao.phutMoiBuoi} phút, cường độ ${NHAN_CUONG_DO[h.theThao.cuongDo].toLowerCase()}`
            : "Không",
        ],
      ],
    },
    {
      tieuDe: "Mục tiêu",
      dong: [
        ["Mục tiêu", NHAN_MUC_TIEU[h.mucTieu]],
        ...(h.canMucTieuKg !== null && h.soTuan !== null
          ? ([
              [
                "Cân mục tiêu",
                `${so(h.canMucTieuKg, 1)} kg trong ${h.soTuan} tuần`,
              ],
            ] as [string, string][])
          : []),
      ],
    },
    {
      tieuDe: "Thói quen ăn",
      dong: [
        ["Dị ứng", h.diUng.length ? h.diUng.map(tenDiUng).join(", ") : "Không"],
        ["Chế độ ăn", NHAN_CHE_DO_AN[h.cheDoAn]],
        [
          "Món không thích",
          h.monKhongThich.length
            ? `${h.monKhongThich.length} món`
            : "Chưa chọn",
        ],
        ["Ngân sách TB mỗi bữa", `${so(h.nganSachMoiBuaVnd)} đ`],
        ["Thời gian nấu tối đa", nhanThoiGianNau(h.thoiGianNauToiDa)],
        ["Số bữa mỗi ngày", `${h.soBua} bữa`],
        ["Thường ăn ở", NHAN_NOI_AN[h.noiAn]],
      ],
    },
  ];

  return (
    <KhungTrang rong>
      <h1 className="text-2xl font-bold text-gray-900">Hồ sơ của bạn</h1>
      <p className="-mt-3 text-sm text-gray-600">
        Thông tin chỉ lưu trên máy của bạn.
      </p>
      <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-start">
        {nhom.map((n) => (
          <section
            key={n.tieuDe}
            className="rounded-2xl border border-gray-200 bg-white p-4"
          >
            <h2 className="mb-2 font-semibold text-gray-900">{n.tieuDe}</h2>
            <dl className="flex flex-col gap-1.5 text-sm">
              {n.dong.map(([nhan, giaTri]) => (
                <div key={nhan} className="flex justify-between gap-4">
                  <dt className="text-gray-500">{nhan}</dt>
                  <dd className="text-right font-medium text-gray-900">
                    {giaTri}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <CongTacDonGian hoSo={h} />
      <div className="flex flex-col gap-2">
        <NutLienKet href="/onboarding">Sửa hồ sơ và tính lại</NutLienKet>
        <NutLienKet href="/ket-qua" chinh={false}>
          Xem kết quả
        </NutLienKet>
        <ChonHoSoMau coHoSo />
        <XoaDuLieu />
      </div>
    </KhungTrang>
  );
}

/** Công tắc chế độ "Đơn giản": ẩn số liệu, chỉ hiện "bữa tới nên ăn gì" (SPEC mục 7) */
function CongTacDonGian({ hoSo }: { hoSo: HoSo }) {
  const { cheDoDonGian } = useCaiDat();
  const { doAnToan } = useAnSoLieu(hoSo); // tầng 1 → luôn bật, không tắt được
  const bat = cheDoDonGian || doAnToan;
  return (
    <section className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4">
      <div>
        <p className="font-semibold text-gray-900">Chế độ Đơn giản</p>
        <p className="text-sm text-gray-600">
          {doAnToan
            ? "Đang luôn bật vì lý do an toàn: mình không hiển thị con số calo cho hồ sơ của bạn."
            : "Ẩn calo và các con số, chỉ hiện bữa tới nên ăn gì."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={bat}
        aria-label="Chế độ Đơn giản"
        disabled={doAnToan}
        onClick={() => luuCaiDat({ cheDoDonGian: !cheDoDonGian })}
        className="group flex h-11 w-14 shrink-0 items-center justify-center rounded-full disabled:opacity-60"
      >
        <span
          className={`relative h-7 w-12 rounded-full transition ${bat ? "bg-emerald-600" : "bg-gray-300"}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${bat ? "left-[1.375rem]" : "left-0.5"}`}
          />
        </span>
      </button>
    </section>
  );
}
