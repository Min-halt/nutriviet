/**
 * Test trình duyệt cho các luồng chính của NutriViet (chạy trên màn hình cỡ điện thoại).
 * Máy chủ chạy KHÔNG có API key → các tính năng AI phải tự dùng phương án dự phòng.
 */
import { expect, test, type Page } from "@playwright/test";
import { DANH_SACH_HO_SO_MAU } from "../lib/hoSoMau";
import type { HoSo } from "../lib/profile";

const hoSoMau = (id: string) =>
  DANH_SACH_HO_SO_MAU.find((m) => m.id === id)!.hoSo;

/** Nạp hồ sơ thẳng vào localStorage (bỏ qua onboarding cho nhanh) */
async function datHoSo(page: Page, hoSo: HoSo) {
  await page.goto("/");
  await page.evaluate((h) => {
    localStorage.clear();
    localStorage.setItem("nutriviet.hoSo", JSON.stringify(h));
  }, hoSo);
}

const nut = (page: Page, ten: string | RegExp) =>
  page.getByRole("button", { name: ten, exact: typeof ten === "string" });

test("Onboarding đầy đủ → trang Kết quả ra đúng ca tính tay A (1.650 kcal)", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.getByRole("link", { name: "Bắt đầu" }).click();

  // Bước 1 — giới tính hỏi đầu tiên; chọn Nam thì không có câu mang thai
  await page.getByRole("radio", { name: /^Nam/ }).click();
  await page.fill("#tuoi", "20");
  await page.getByRole("checkbox", { name: "Không có" }).click();
  await page
    .getByRole("radio", { name: /^Không$/ })
    .last()
    .click();
  await nut(page, "Tiếp").click();
  // Bước 2
  await page.fill("#cao", "170");
  await page.fill("#can", "65");
  await nut(page, "Tiếp").click();
  // Bước 3
  await page.getByRole("radio", { name: /^Ngồi nhiều/ }).click();
  await page
    .getByRole("radiogroup")
    .nth(1)
    .getByRole("radio", { name: "Không" })
    .click();
  await nut(page, "Tiếp").click();
  // Bước 4
  await page.getByRole("radio", { name: /^Giảm mỡ/ }).click();
  await page.fill("#canMT", "60");
  await page.fill("#tuan", "12");
  await nut(page, "Tiếp").click();
  // Bước 5
  await page.getByRole("radio", { name: /^Không kiêng/ }).click();
  await page.getByRole("radio", { name: /^30 phút/ }).click();
  await page.getByRole("radio", { name: /^3 bữa/ }).click();
  await page.getByRole("radio", { name: /^Chủ yếu ăn ngoài/ }).click();
  await nut(page, "Xem kết quả").click();

  await expect(page).toHaveURL(/ket-qua/);
  await expect(page.locator("main:visible")).toContainText("1.650");
  await expect(page.locator("main:visible")).toContainText("104 g");
});

test("Tầng 1 (17 tuổi): chỉ còn 'Ăn cân bằng', không hiện con số calo ở mọi trang", async ({
  page,
}) => {
  // Hồ sơ tầng 1 hợp lệ luôn có mục tiêu "Ăn cân bằng" (onboarding tự ép như vậy)
  await datHoSo(page, {
    ...hoSoMau("giam-mo"),
    tuoi: 17,
    mucTieu: "an_lanh_manh",
    canMucTieuKg: null,
    soTuan: null,
  });
  await page.goto("/ket-qua");
  await expect(page.locator("main:visible")).toContainText("Ăn cân bằng");
  await expect(page.locator("main:visible")).toContainText(
    "không hiển thị con số calo",
  );
  await expect(page.locator("main:visible")).not.toContainText("kcal");

  await page.goto("/hom-nay");
  await expect(
    page.getByRole("heading", { name: "Hôm nay", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main:visible")).not.toContainText("kcal");

  await page.goto("/thuc-don");
  await expect(
    page.getByRole("heading", { name: "Thực đơn 7 ngày" }),
  ).toBeVisible();
  await expect(page.locator("main:visible")).not.toContainText("kcal");

  await page.goto("/ho-so");
  await expect(
    page.getByRole("switch", { name: "Chế độ Đơn giản" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("switch", { name: "Chế độ Đơn giản" }),
  ).toHaveAttribute("aria-checked", "true");
});

test("Dùng hồ sơ mẫu từ trang chủ → sang trang Kết quả", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await nut(page, "Dùng hồ sơ mẫu").click();
  await nut(page, /Sinh viên chơi bóng đá/).click();
  await expect(page).toHaveURL(/ket-qua/);
  await expect(page.locator("main:visible")).toContainText("2.246");
});

test("Thực đơn: Đổi món được lưu lại, có cảnh báo trước khi mất, và khôi phục được", async ({
  page,
}) => {
  await datHoSo(page, hoSoMau("giam-mo"));
  await page.goto("/thuc-don?ngay=0");
  const tenMon = page.locator("ul li a p.text-lg");
  const truoc = await tenMon.nth(1).textContent();

  await page.locator("ul li a").nth(1).click();
  await nut(page, "Đổi món").click();
  const luaChon = page.locator("section ul li button").first();
  const moi = (await luaChon.locator("span").first().textContent())!;
  await luaChon.click();
  await expect(page).toHaveURL(/thuc-don\?ngay=0/);
  await expect(tenMon.nth(1)).toHaveText(moi);

  await page.reload();
  await expect(tenMon.nth(1)).toHaveText(moi);

  // Trang Kết quả nhắc rằng kéo thanh trượt sẽ làm mất món đã đổi
  await page.goto("/ket-qua");
  await expect(page.locator("main:visible")).toContainText(
    "các món bạn đã đổi sẽ quay về gợi ý ban đầu",
  );

  await page.goto("/thuc-don?ngay=0");
  await nut(page, /Khôi phục/).click();
  await expect(tenMon.nth(1)).toHaveText(truoc!);
});

test("Hôm nay: 'Lỡ ăn rồi' nói nhẹ nhàng, không dùng màu đỏ", async ({
  page,
}) => {
  await datHoSo(page, hoSoMau("giam-mo"));
  await page.goto("/hom-nay");
  for (const ten of ["Bún bò Huế", "Cơm tấm sườn", "Phở bò"]) {
    await nut(page, "Lỡ ăn rồi").click();
    await nut(page, ten).click();
    await nut(page, /^Nhiều/).click();
    await nut(page, "Lưu").click();
  }
  await expect(page.locator("main:visible")).toContainText("không sao cả");
  await expect(page.locator("main:visible")).not.toContainText("vượt mức");
  expect(await page.locator('main:visible [class*="red-"]').count()).toBe(0);

  await nut(page, "+1 ly").click();
  await expect(page.locator("main:visible")).toContainText("1 / 8 ly");
});

test("Nhập nhanh không có API key → dùng dự phòng, vẫn hiểu câu và ghi được món", async ({
  page,
}) => {
  await datHoSo(page, hoSoMau("giam-mo"));
  await page.goto("/hom-nay");
  await page.fill("#nhap-nhanh", "trưa ăn cơm tấm sườn hơi nhiều");
  await nut(page, "Gửi").click();
  await expect(page.getByText("Gợi ý tự động")).toBeVisible();
  await expect(
    page.locator('[aria-label="Khẩu phần"] [aria-pressed=true]'),
  ).toContainText("Nhiều");
  await expect(
    page.locator('[aria-label="Bữa"] [aria-pressed=true]'),
  ).toHaveText("Bữa trưa");
  await nut(page, "Lưu").click();
  await expect(
    page.getByRole("button", { name: /^Xóa Cơm tấm sườn/ }),
  ).toBeVisible();
});

test("Ăn chay + ngân sách thấp → báo 'chưa đủ món', không ép thực đơn", async ({
  page,
}) => {
  await datHoSo(page, {
    ...hoSoMau("giam-mo"),
    cheDoAn: "chay",
    nganSachMoiBuaVnd: 15000,
  });
  await page.goto("/thuc-don?ngay=6");
  await expect(page.getByText("Ngày này chưa đủ món phù hợp")).toBeVisible();
});

test("Hồ sơ tiểu đường: có ghi chú bác sĩ ở trang Thực đơn", async ({
  page,
}) => {
  await datHoSo(page, hoSoMau("tieu-duong"));
  await page.goto("/thuc-don");
  await expect(
    page.getByText("không thay thế chỉ định của bác sĩ"),
  ).toBeVisible();
});

test("Lịch sử: hiện các ngày trước có ghi chép, ẩn số calo khi bật chế độ Đơn giản", async ({
  page,
}) => {
  await datHoSo(page, hoSoMau("giam-mo"));
  // Ghi sẵn nhật ký hôm qua
  await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const homQua = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    localStorage.setItem(
      "nutriviet.nhatKy",
      JSON.stringify({
        [homQua]: {
          mon: [
            {
              id: "a",
              monId: "pho-bo",
              khauPhan: "vua",
              bua: "sang",
              ngoaiKeHoach: false,
              dinhDuong: { kcal: 450, protein: 25, carb: 60, fat: 12 },
            },
          ],
          nuoc: 5,
        },
      }),
    );
  });
  await page.goto("/hom-nay");
  await page.getByRole("link", { name: "Xem các ngày trước" }).click();
  await expect(page).toHaveURL(/lich-su/);
  await expect(page.locator("main:visible")).toContainText(
    "450 kcal · 1 món · 5 ly nước",
  );
  await page.locator("main:visible details summary").first().click();
  await expect(page.locator("main:visible")).toContainText("Phở bò");

  await page.evaluate(() =>
    localStorage.setItem(
      "nutriviet.caiDat",
      JSON.stringify({ cheDoDonGian: true }),
    ),
  );
  await page.reload();
  await expect(page.locator("main:visible")).toContainText("1 món · 5 ly nước");
  await expect(page.locator("main:visible")).not.toContainText("kcal");
});

test("Xóa toàn bộ dữ liệu: phải xác nhận, xóa xong về trang chủ", async ({
  page,
}) => {
  await datHoSo(page, hoSoMau("giam-mo"));
  await page.goto("/ho-so");
  await nut(page, "Xóa toàn bộ dữ liệu").click();
  await nut(page, "Hủy").click(); // bấm Hủy thì chưa xóa gì
  expect(
    await page.evaluate(() => localStorage.getItem("nutriviet.hoSo")),
  ).not.toBeNull();

  await nut(page, "Xóa toàn bộ dữ liệu").click();
  await nut(page, "Xóa hết").click();
  await expect(page.getByRole("link", { name: "Bắt đầu" })).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("nutriviet.")),
    ),
  ).toEqual([]);
});

test("Góp ý 1: chọn Nam thì không hỏi mang thai; chọn Nữ thì có", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/onboarding");
  await page.getByRole("radio", { name: /^Nam/ }).click();
  await expect(page.getByText("mang thai hoặc cho con bú")).toHaveCount(0);
  await page.getByRole("radio", { name: /^Nữ/ }).click();
  await expect(
    page.getByText("Bạn đang mang thai hoặc cho con bú?"),
  ).toBeVisible();
});

test("Góp ý 2: 120 cm / 220 kg bị chặn; BMI cao được gợi ý Giảm mỡ và tính đạm hợp lý", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/onboarding");
  await page.getByRole("radio", { name: /^Nam/ }).click();
  await page.fill("#tuoi", "30");
  await page.getByRole("checkbox", { name: "Không có" }).click();
  await page
    .getByRole("radio", { name: /^Không$/ })
    .last()
    .click();
  await nut(page, "Tiếp").click();
  await page.fill("#cao", "120");
  await page.fill("#can", "220");
  await nut(page, "Tiếp").click();
  await expect(page.getByText(/có vẻ chưa khớp/)).toBeVisible();

  // Sửa thành 170 cm / 100 kg (BMI 34,6) → đi tiếp được
  await page.fill("#cao", "170");
  await page.fill("#can", "100");
  await nut(page, "Tiếp").click();
  await page.getByRole("radio", { name: /^Ngồi nhiều/ }).click();
  await page
    .getByRole("radiogroup")
    .nth(1)
    .getByRole("radio", { name: "Không" })
    .click();
  await nut(page, "Tiếp").click();
  await expect(
    page.getByRole("radio", { name: /^Giảm mỡ.*Gợi ý cho bạn/ }),
  ).toBeVisible();
  await expect(page.getByText(/BMI của bạn khoảng/)).toContainText("34,6");
  await expect(
    page.getByText(/bác sĩ hoặc chuyên gia dinh dưỡng theo dõi/),
  ).toBeVisible();
});

test("Góp ý 3: ngân sách 20.000 đ/bữa vẫn có thực đơn đủ 7 ngày", async ({
  page,
}) => {
  await datHoSo(page, { ...hoSoMau("giam-mo"), nganSachMoiBuaVnd: 20000 });
  for (let ngay = 0; ngay < 7; ngay++) {
    await page.goto(`/thuc-don?ngay=${ngay}`);
    await expect(
      page.getByRole("heading", { name: "Thực đơn 7 ngày" }),
    ).toBeVisible();
    await expect(page.getByText("Ngày này chưa đủ món phù hợp")).toHaveCount(0);
  }
});
