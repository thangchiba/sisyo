**Trạng thái:** {{STATUS}}

**Chế độ:** Duyệt trước · **Gửi:** {{DATE}} · **Agent:** <model> trên <máy>

**Cách duyệt:** mỗi mục có ô *Đồng ý* và dòng *Phản hồi*. Câu hỏi anh không tick thì làm theo đề xuất. Xong thì tick ở phần cuối trang và nhắn agent "đã duyệt {{REQ}}". Muốn gửi ảnh chụp thì dán thẳng vào trang.

## Tóm tắt

| # | Hạng mục | Đề xuất ngắn | Độ lớn |
|---|---|---|---|
| A | … | … | S / M / L |

## A. <Tên mục>

> "<lời anh, trích ngắn>"

**Hiện có:** <đọc code rồi mới viết>

**Đề xuất:**
- <cụ thể: kích thước, phím tắt, giới hạn, chỗ trong giao diện>

**Chọn:** <câu hỏi, chỉ khi thật sự cần anh quyết>
- [ ] A. <lựa chọn agent khuyên> (đề xuất)
- [ ] B. <lựa chọn khác>

**Độ lớn:** S / M / L

- [ ] Đồng ý

**Phản hồi:**

## Đề xuất thêm

<ý của agent ngoài yêu cầu, ghi rõ là đề xuất thêm; mỗi ý có Đồng ý + Phản hồi như một mục>

## Kế hoạch triển khai (sau khi duyệt)

1. <thứ tự, việc nào trước>
2. <chia agent theo vùng code>
3. <test, kiểm tra trình duyệt, bằng chứng>
4. <backup, test gate, deploy, ghi Phát hành>

## Duyệt

- [ ] Duyệt tất cả theo đề xuất (câu hỏi không tick = theo đề xuất)
- [ ] Chỉ làm các mục đã tick Đồng ý; mục chưa tick để lại
- [ ] Duyệt nhanh: làm luôn mục đã tick, chờ anh ở mục có phản hồi

**Phản hồi chung:**

## Báo cáo

_Agent điền khi triển khai: việc đã làm, ảnh và video bằng chứng, kết quả test, commit, deploy._

## Nguyên văn yêu cầu

> <toàn bộ tin nhắn của anh>
