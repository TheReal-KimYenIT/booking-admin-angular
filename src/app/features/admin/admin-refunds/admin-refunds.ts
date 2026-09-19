import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-refunds',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-refunds.html'
})
export class AdminRefundsComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/admin/refunds`;
  
  refunds: any[] = [];
  isLoading = false;

  // Bộ lọc
  searchTerm: string = '';
  filterStatus: string = 'ALL';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadData();
  }

  // Tải danh sách hoàn tiền từ Backend
  loadData() {
    this.isLoading = true;
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

    this.http.get(this.apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.refunds = res.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', 'Không thể tải danh sách hoàn tiền', 'error');
      }
    });
  }

  // Lọc dữ liệu trực tiếp trên Frontend
  get filteredRefunds() {
    return this.refunds.filter(item => {
      const name = item.guest_name || '';
      const code = item.booking_code || '';
      const matchSearch = name.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
                          code.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      let matchStatus = true;
      if (this.filterStatus === 'PENDING') {
        matchStatus = item.refund_status === 1;
      } else if (this.filterStatus === 'COMPLETED') {
        matchStatus = item.refund_status === 2;
      }

      return matchSearch && matchStatus;
    });
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

  // Xử lý khi Admin bấm nút xác nhận
  confirmRefund(item: any) {
    Swal.fire({
      title: 'Xác nhận đã chuyển khoản?',
      html: `Bạn xác nhận đã chuyển số tiền <b class="text-danger">${Number(item.refund_amount || 0).toLocaleString('vi-VN')} đ</b><br>
             vào tài khoản <b>${item.refund_account}</b> (${item.refund_bank})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Đã chuyển khoản',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.submitConfirmAPI(item.id);
      }
    });
  }

  // Gọi API để cập nhật trạng thái
  submitConfirmAPI(bookingId: number) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    
    this.http.put(`${this.apiUrl}/${bookingId}/confirm`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => {
        Swal.fire('Thành công', 'Đã cập nhật trạng thái hoàn tiền!', 'success');
        this.loadData(); // Tải lại danh sách
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Lỗi', err.error?.message || 'Không thể xác nhận hoàn tiền!', 'error');
      }
    });
  }
}