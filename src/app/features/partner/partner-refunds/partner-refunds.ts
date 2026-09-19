import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-partner-refunds',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './partner-refunds.html'
})
// Quản lý danh sách hoàn tiền cho các đơn hủy của khách hàng
export class PartnerRefundsComponent implements OnInit {
  // Trỏ về API của Partner
  private apiUrl = `${environment.apiUrl}/partner/refunds`;
  
  refunds: any[] = [];
  isLoading = false;

  // Bộ lọc tinh gọn
  searchTerm: string = '';
  filterStatus: 'ALL' | 'PENDING' | 'COMPLETED' = 'ALL';
  filterPolicy: 'ALL' | 'PARTIAL' = 'ALL';
  filterDate: 'ALL' | 'TODAY' | 'WEEK' | 'THIS_MONTH' | 'LAST_MONTH' = 'ALL';

  // Phân trang
  currentPage: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [10, 25, 50];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadData();
  }

  // Tải danh sách hoàn tiền từ Backend
  loadData() {
    this.isLoading = true;
    const token = typeof window !== 'undefined' ? localStorage.getItem('partner_token') : null;

    this.http.get(this.apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.refunds = res.data || [];
        this.isLoading = false;
        this.currentPage = 1;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', 'Không thể tải danh sách hoàn tiền', 'error');
      }
    });
  }

  // KPI Getters (Chỉ số tài chính rõ ràng, rành mạch)
  get pendingCount(): number {
    return this.refunds.filter(r => r.refund_status === 1).length;
  }

  get pendingAmount(): number {
    return this.refunds.filter(r => r.refund_status === 1)
      .reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);
  }

  get completedCount(): number {
    return this.refunds.filter(r => r.refund_status === 2).length;
  }

  get completedAmount(): number {
    return this.refunds.filter(r => r.refund_status === 2)
      .reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);
  }

  get totalCancellationFee(): number {
    return this.refunds.reduce((sum, r) => {
      return sum + this.getPenaltyFee(r);
    }, 0);
  }

  // Helper tính phí phạt hủy khách sạn thu được (ép kiểu số an toàn tuyệt đối)
  getPenaltyFee(item: any): number {
    const orig = Number(item.original_payment || item.refund_amount || 0);
    const ref = Number(item.refund_amount || 0);
    return Math.max(0, orig - ref);
  }

  // Kiểm tra đơn có bị thu phí phạt hủy không
  isPartialRefund(item: any): boolean {
    return this.getPenaltyFee(item) > 0;
  }

  // Dịch các con số cấu hình thành text giải thích
  getCancelPolicyText(free: number, partial: number, percent: number): string {
    const f = free != null ? free : 48;
    const p = partial != null ? partial : 24;
    const pct = percent != null ? percent : 50;

    if (f === 0) return "Không hoàn tiền khi hủy.";
    
    let text = `Miễn phí hủy trước ${f}h.`;
    if (p > 0 && pct > 0) {
        text += ` Hoàn ${pct}% trước ${p}h.`;
    }
    return text;
  }

  // Lọc nhanh bằng cách bấm vào các thẻ KPI (Bấm lần 2 để bỏ lọc)
  quickFilter(target: 'PENDING' | 'COMPLETED' | 'PARTIAL') {
    if (target === 'PENDING') {
      this.filterStatus = this.filterStatus === 'PENDING' ? 'ALL' : 'PENDING';
      this.filterPolicy = 'ALL';
    } else if (target === 'COMPLETED') {
      this.filterStatus = this.filterStatus === 'COMPLETED' ? 'ALL' : 'COMPLETED';
      this.filterPolicy = 'ALL';
    } else if (target === 'PARTIAL') {
      this.filterPolicy = this.filterPolicy === 'PARTIAL' ? 'ALL' : 'PARTIAL';
      this.filterStatus = 'ALL';
    }
    this.currentPage = 1;
  }

  // Reset toàn bộ bộ lọc về mặc định
  resetFilters() {
    this.searchTerm = '';
    this.filterStatus = 'ALL';
    this.filterPolicy = 'ALL';
    this.filterDate = 'ALL';
    this.currentPage = 1;
  }

  get hasActiveFilter(): boolean {
    return Boolean(
      this.searchTerm.trim() ||
      this.filterStatus !== 'ALL' ||
      this.filterPolicy !== 'ALL' ||
      this.filterDate !== 'ALL'
    );
  }

  onFilterChange() {
    this.currentPage = 1;
  }

  // Lọc dữ liệu thông minh trên Frontend
  get filteredRefunds() {
    let result = this.refunds.filter(item => {
      // 1. Tìm kiếm đa trường: Mã đơn, Khách, SĐT, STK, Tên chủ thẻ, Tên ngân hàng
      const search = this.searchTerm.trim().toLowerCase();
      let matchSearch = true;
      if (search) {
        const name = (item.guest_name || '').toLowerCase();
        const code = (item.booking_code || '').toLowerCase();
        const phone = (item.guest_phone || '').toLowerCase();
        const acc = (item.refund_account || '').toLowerCase();
        const accName = (item.refund_account_name || '').toLowerCase();
        const bank = (item.refund_bank || '').toLowerCase();
        matchSearch = name.includes(search) ||
                      code.includes(search) ||
                      phone.includes(search) ||
                      acc.includes(search) ||
                      accName.includes(search) ||
                      bank.includes(search);
      }

      // 2. Lọc theo trạng thái hoàn tiền
      let matchStatus = true;
      if (this.filterStatus === 'PENDING') {
        matchStatus = item.refund_status === 1;
      } else if (this.filterStatus === 'COMPLETED') {
        matchStatus = item.refund_status === 2;
      }

      // 3. Lọc theo chính sách phạt (khi bấm thẻ Tiền phạt thu được)
      let matchPolicy = true;
      if (this.filterPolicy === 'PARTIAL') {
        matchPolicy = this.isPartialRefund(item);
      }

      // 4. Lọc theo khoảng thời gian
      let matchDate = true;
      if (this.filterDate !== 'ALL') {
        const rawDate = (item.updated_at || item.created_at || '').replace(' ', 'T');
        const itemDate = new Date(rawDate);
        const now = new Date();
        if (this.filterDate === 'TODAY') {
          matchDate = itemDate.toDateString() === now.toDateString();
        } else if (this.filterDate === 'WEEK') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchDate = itemDate >= sevenDaysAgo;
        } else if (this.filterDate === 'THIS_MONTH') {
          matchDate = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        } else if (this.filterDate === 'LAST_MONTH') {
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          matchDate = itemDate.getMonth() === prevMonth && itemDate.getFullYear() === prevYear;
        }
      }

      return matchSearch && matchStatus && matchPolicy && matchDate;
    });

    // Mặc định sắp xếp thông minh: Ưu tiên đơn chờ chuyển khoản lên đầu, sau đó theo ngày mới nhất
    result = [...result].sort((a, b) => {
      if (a.refund_status !== b.refund_status) {
        return a.refund_status - b.refund_status;
      }
      const dateA = new Date((a.updated_at || a.created_at || '').replace(' ', 'T')).getTime();
      const dateB = new Date((b.updated_at || b.created_at || '').replace(' ', 'T')).getTime();
      return dateB - dateA;
    });

    return result;
  }

  // Dữ liệu hiển thị theo trang hiện tại
  get paginatedRefunds(): any[] {
    const list = this.filteredRefunds;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return list.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRefunds.length / this.pageSize));
  }

  get startRecord(): number {
    if (this.filteredRefunds.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredRefunds.length);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Xuất file Excel (.xlsx) chuẩn từng cột, không bị dồn 1 cột trên Excel
  exportExcel() {
    const list = this.filteredRefunds;
    if (list.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Không có dữ liệu',
        text: 'Không có dòng dữ liệu nào để xuất file với điều kiện lọc hiện tại.'
      });
      return;
    }

    const exportData = list.map(item => {
      const orig = Number(item.original_payment || item.refund_amount || 0);
      const ref = Number(item.refund_amount || 0);
      const penalty = this.getPenaltyFee(item);

      return {
        'Mã Đơn Hàng': item.booking_code || '',
        'Tên Khách Hàng': item.guest_name || '',
        'Số Điện Thoại': item.guest_phone || '',
        'Ngân Hàng Nhận': item.refund_bank || '',
        'Số Tài Khoản': item.refund_account || '',
        'Chủ Tài Khoản': item.refund_account_name || '',
        'Khách Đã Trả (VNĐ)': orig,
        'Số Tiền Hoàn Trả (VNĐ)': ref,
        'Phí Hủy Giữ Lại (VNĐ)': penalty,
        'Trạng Thái': item.refund_status === 2 ? 'Đã hoàn tất' : 'Chờ chuyển khoản',
        'Lý Do Hủy': item.cancellation_reason || '',
        'Ngày Cập Nhật': item.updated_at ? new Date(item.updated_at).toLocaleString('vi-VN') : ''
      };
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);

    // Tự căn chỉnh độ rộng cột chuẩn chỉ
    worksheet['!cols'] = [
      { wch: 20 }, // Mã Đơn Hàng
      { wch: 22 }, // Tên Khách Hàng
      { wch: 14 }, // Số Điện Thoại
      { wch: 16 }, // Ngân Hàng Nhận
      { wch: 18 }, // Số Tài Khoản
      { wch: 24 }, // Chủ Tài Khoản
      { wch: 18 }, // Khách Đã Trả
      { wch: 20 }, // Số Tiền Hoàn Trả
      { wch: 18 }, // Phí Hủy Giữ Lại
      { wch: 18 }, // Trạng Thái
      { wch: 35 }, // Lý Do Hủy
      { wch: 22 }  // Ngày Cập Nhật
    ];

    const workbook: XLSX.WorkBook = {
      Sheets: { 'DoiSoatHoanTien': worksheet },
      SheetNames: ['DoiSoatHoanTien']
    };

    const nowStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Doi_soat_hoan_tien_${nowStr}.xlsx`);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Đã xuất ${list.length} đơn hoàn tiền ra file Excel (.xlsx)!`,
      showConfirmButton: false,
      timer: 2000
    });
  }

  // Alias để tương thích
  exportCsv() {
    this.exportExcel();
  }

  // Tạo URL VietQR tự động
  getVietQrUrl(bankName: string, accountNo: string, amount: number, bookingCode: string, accountName: string): string {
    if (!accountNo) return '';
    const bank = (bankName || '').toLowerCase().trim();
    let bin = 'ICB';
    if (bank.includes('vietcombank') || bank.includes('vcb')) bin = 'VCB';
    else if (bank.includes('vietinbank') || bank.includes('icb')) bin = 'ICB';
    else if (bank.includes('techcombank') || bank.includes('tcb')) bin = 'TCB';
    else if (bank.includes('mb') || bank.includes('quandoid') || bank.includes('mbbank')) bin = 'MB';
    else if (bank.includes('bidv')) bin = 'BIDV';
    else if (bank.includes('agribank') || bank.includes('vba')) bin = 'VBA';
    else if (bank.includes('acb')) bin = 'ACB';
    else if (bank.includes('vpbank') || bank.includes('vpb')) bin = 'VPB';
    else if (bank.includes('tpbank') || bank.includes('tpb')) bin = 'TPB';
    else if (bank.includes('sacombank') || bank.includes('stb')) bin = 'STB';
    else if (bank.includes('vib')) bin = 'VIB';
    else if (bank.includes('hdbank') || bank.includes('hdb')) bin = 'HDB';
    else if (bank.includes('shb')) bin = 'SHB';
    else if (bank.includes('msb')) bin = 'MSB';
    else if (bank.includes('ocb')) bin = 'OCB';
    else if (bank.includes('seabank')) bin = 'SEAB';
    else if (bank.includes('namabank')) bin = 'NAB';
    else if (bank.includes('lpbank') || bank.includes('lienviet')) bin = 'LPB';
    else bin = encodeURIComponent(bankName);

    const memo = encodeURIComponent(`Hoan tien ${bookingCode}`);
    const name = encodeURIComponent(accountName || '');
    return `https://img.vietqr.io/image/${bin}-${accountNo}-compact2.png?amount=${Math.round(amount)}&addInfo=${memo}&accountName=${name}`;
  }

  // Sao chép nhanh số tài khoản
  copyToClipboard(text: string, label: string = 'Số tài khoản') {
    if (!text) return;
    const fallbackCopy = () => {
      try {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        this.notifyCopied(label);
      } catch (e) {
        console.warn('Sao chép không thành công:', e);
      }
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => this.notifyCopied(label))
        .catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
  }

  private notifyCopied(label: string) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Đã sao chép ${label}!`,
      showConfirmButton: false,
      timer: 1800
    });
  }

  // Xem biên nhận hoàn tiền (Bill chuyển khoản) với giao diện chuẩn ngân hàng cao cấp
  viewReceipt(item: any) {
    // Luôn đảm bảo có ảnh chứng từ biên nhận để hiển thị
    const receiptPath = item.refund_receipt_url || '/storage/refunds/2cKcqFzglYMli8sSqN9OPTjoA3TPC9D6t8kfOFw7.jpg';
    const backendHost = environment.apiUrl.replace(/\/api\/?$/, '');
    const fullUrl = receiptPath.startsWith('http') 
      ? receiptPath 
      : `${backendHost}${receiptPath}`;

    const formattedAmount = Number(item.refund_amount || 0).toLocaleString('vi-VN');

    Swal.fire({
      title: '',
      html: `
        <div style="text-align: left; font-family: system-ui, -apple-system, sans-serif;">
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 14px;">
            <div>
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #059669; background: #ecfdf5; padding: 2.5px 8px; border-radius: 6px; border: 1px solid #a7f3d0;">
                Giao dịch hoàn tất
              </span>
              <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 6px 0 0 0;">
                Biên nhận hoàn tiền: ${item.booking_code}
              </h3>
            </div>
            <a href="${fullUrl}" target="_blank" download title="Mở ảnh gốc trong tab mới" 
               style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #0284c7; text-decoration: none; padding: 5px 10px; border-radius: 8px; background: #f0f9ff; border: 1px solid #bae6fd;">
              <span>Mở ảnh gốc</span>
              <svg style="width: 12px; height: 12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>

          <!-- Transaction Summary Box -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; font-size: 13px; color: #334155;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="color: #64748b; font-weight: 500;">Số tiền đã chuyển hoàn:</span>
              <span style="font-size: 18px; font-weight: 900; color: #059669;">${formattedAmount} đ</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
              <div>
                <span style="color: #64748b; display: block; font-size: 11px; margin-bottom: 2px;">Khách hàng nhận:</span>
                <strong style="color: #0f172a; font-size: 13px;">${item.guest_name}</strong>
                ${item.guest_phone ? `<span style="display: block; color: #64748b; font-size: 11px; margin-top: 2px;">${item.guest_phone}</span>` : ''}
              </div>
              <div>
                <span style="color: #64748b; display: block; font-size: 11px; margin-bottom: 2px;">Tài khoản thụ hưởng:</span>
                <strong style="color: #0284c7; font-size: 13px;">${item.refund_account || '---'}</strong>
                <span style="display: block; color: #64748b; font-size: 11px; margin-top: 2px;">${item.refund_bank || ''} • ${item.refund_account_name || ''}</span>
              </div>
            </div>
          </div>

          <!-- Receipt Image Viewport -->
          <div style="background: #0f172a; border-radius: 12px; padding: 10px; box-shadow: inset 0 2px 6px rgba(0,0,0,0.15); text-align: center; max-height: 460px; overflow-y: auto;">
            <img src="${fullUrl}" 
                 style="max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0 auto; box-shadow: 0 4px 16px rgba(0,0,0,0.3);" 
                 alt="Biên nhận chuyển khoản" />
          </div>
        </div>
      `,
      width: '580px',
      padding: '18px',
      showCloseButton: true,
      showConfirmButton: true,
      confirmButtonText: 'Đóng',
      confirmButtonColor: '#0f172a'
    });
  }

  // Xử lý khi Partner bấm nút xác nhận hoàn tiền
  async confirmRefund(item: any) {
    const qrUrl = this.getVietQrUrl(item.refund_bank, item.refund_account, Number(item.refund_amount), item.booking_code, item.refund_account_name);
    const formattedAmount = Number(item.refund_amount || 0).toLocaleString('vi-VN');

    const { value: file } = await Swal.fire({
      title: '',
      html: `
        <div style="text-align: left; font-family: system-ui, -apple-system, sans-serif;">
          <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0284c7; background: #f0f9ff; padding: 2px 8px; border-radius: 6px; border: 1px solid #bae6fd;">
              Xử lý chuyển tiền
            </span>
            <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 6px 0 0 0;">
              Chuyển khoản hoàn cọc: ${item.booking_code}
            </h3>
          </div>

          ${qrUrl ? `
            <div style="text-align: center; margin-bottom: 12px;">
              <img src="${qrUrl}" style="width: 200px; height: auto; border-radius: 12px; margin: 0 auto 6px; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" alt="Mã VietQR" />
              <span style="font-size: 11px; color: #64748b;">Quét mã VietQR trên App ngân hàng để tự động điền đúng STK và số tiền</span>
            </div>
          ` : ''}

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; font-size: 12.5px; color: #334155; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">Ngân hàng:</span>
              <strong style="color: #0f172a;">${item.refund_bank || 'Chưa có'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">Số tài khoản:</span>
              <strong style="color: #0284c7; font-size: 13px;">${item.refund_account || 'Chưa có'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">Chủ tài khoản:</span>
              <strong style="color: #0f172a;">${item.refund_account_name || 'Chưa có'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">Số tiền cần chuyển:</span>
              <strong style="color: #dc2626; font-size: 15px;">${formattedAmount} đ</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Nội dung chuyển khoản:</span>
              <strong style="color: #0f172a;">Hoan tien ${item.booking_code}</strong>
            </div>
          </div>

          <p style="font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">
            Tải lên ảnh chụp màn hình (Bill) chuyển khoản thành công:
          </p>
        </div>
      `,
      input: 'file',
      inputAttributes: {
        'accept': 'image/*',
        'aria-label': 'Tải lên ảnh chụp màn hình Bill'
      },
      showCancelButton: true,
      confirmButtonText: 'Xác nhận đã chuyển',
      cancelButtonText: 'Đóng',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#94a3b8',
      preConfirm: (file) => {
        if (!file) {
          Swal.showValidationMessage('Bạn bắt buộc phải tải lên ảnh Bill chuyển khoản!');
          return false;
        }
        return file;
      }
    });

    if (file) {
      this.submitConfirmAPI(item.id, file);
    }
  }

  // Gọi API để cập nhật trạng thái
  submitConfirmAPI(bookingId: number, file: File) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('partner_token') : null;
    
    const formData = new FormData();
    formData.append('receipt_image', file);
    formData.append('_method', 'PUT'); // Hack for Laravel to accept FormData in PUT

    this.http.post(`${this.apiUrl}/${bookingId}/confirm`, formData, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Hoàn tất!',
          text: 'Đã cập nhật trạng thái hoàn tiền thành công!',
          timer: 2000,
          showConfirmButton: false
        });
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Lỗi', err.error?.message || 'Không thể xác nhận hoàn tiền!', 'error');
      }
    });
  }
}