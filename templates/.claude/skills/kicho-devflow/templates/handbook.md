Mọi yêu cầu, duyệt, tiến độ, bằng chứng và báo cáo của dự án nằm ở đây, xem được trên mọi máy và điện thoại, không phụ thuộc máy dev hay worktree. Tài liệu kỹ thuật (kiến trúc, quyết định, hướng dẫn code) vẫn ở `docs/` trong repo.

## Vòng đời một yêu cầu

1. **Gửi**: anh gửi một loạt việc trong Claude Code.
2. **Xác nhận** 🟡: agent tạo trang `REQ-NNN` trong 📥 Yêu cầu. Trang ghi agent hiểu thế nào, đề xuất, câu hỏi, độ lớn. Các việc vào ✅ Việc của agent với trạng thái *Chờ duyệt*.
3. **Duyệt**: anh phản hồi ngay trên trang (cách làm ở dưới), rồi nhắn agent "đã duyệt REQ-NNN".
4. **Triển khai** 🔨: agent đọc lại trang, chốt kế hoạch, chia việc. Mỗi việc đi Sẵn sàng → Đang làm → Kiểm thử → Xong.
5. **Kiểm thử** 🧪: ảnh chụp, video ngắn, kết quả test được đưa thẳng vào phần Báo cáo của trang REQ.
6. **Phát hành** ✅: deploy xong thì ghi một dòng vào 🚀 Phát hành (commit, backup, kết quả). Trang REQ có báo cáo cuối.

## Ba chế độ

- **Duyệt trước** (mặc định): chờ anh duyệt rồi mới làm.
- **Duyệt nhanh**: mục nào rõ ràng thì làm luôn, mục có câu hỏi thì chờ anh. Anh nói "duyệt nhanh".
- **Làm luôn**: khi anh bận, nói "làm luôn, không cần duyệt". Agent vẫn viết trang xác nhận, ghi rõ các giả định đã chọn, để anh xem lại sau.

## Cách phản hồi trên trang REQ

- Mỗi mục có ô **Đồng ý**: tick là duyệt mục đó như đề xuất.
- Muốn đổi: gõ ngay dưới dòng **Phản hồi** của mục đó, hoặc sửa thẳng vào đề xuất.
- Câu hỏi có lựa chọn A / B: tick lựa chọn anh muốn.
- Không làm mục nào thì ghi "bỏ" vào Phản hồi của mục đó.
- Cuối trang: tick **Duyệt tất cả** hoặc **Chỉ làm các mục đã tick**, rồi nhắn agent.

## Trạng thái

- Icon của trang REQ (nhìn thấy ngay trên cây trang): 🟡 chờ duyệt · 🟢 đã duyệt · 🔨 đang làm · 🧪 kiểm thử · ✅ đã phát hành · ⏸️ tạm dừng · ✖️ huỷ.
- Việc của agent: Chờ duyệt → Sẵn sàng → Đang làm → Kiểm thử → Xong (hoặc Hoãn / Bỏ). Xem theo Bảng, Timeline hoặc "Chờ anh duyệt".

## Bằng chứng

- Ảnh, video và log được agent tải thẳng lên Kicho bằng script. Agent không mở ảnh trong session, trừ khi cần nhìn để kiểm tra (khi đó thu nhỏ trước). Nhờ vậy session nhẹ và ảnh hiển thị đúng ở mọi máy.
- Agent kiểm tra bằng DOM / văn bản khi được. Ảnh chủ yếu để anh xem.

## Cấu trúc

- 📘 **Quy trình làm việc**: trang này.
- 📥 **Yêu cầu**: mỗi REQ một trang. Trong trang: Bản xác nhận → Phản hồi → Kế hoạch → Báo cáo.
- ✅ **Việc của agent**: mọi việc của mọi REQ. Mở một việc ra có ghi chú và commit.
- 🚀 **Phát hành**: mỗi lần deploy một dòng.
- 🧠 **Brainstorm**: bàn ý tưởng với AI, mỗi buổi một trang. Ý tưởng chốt làm thì thành một REQ.
