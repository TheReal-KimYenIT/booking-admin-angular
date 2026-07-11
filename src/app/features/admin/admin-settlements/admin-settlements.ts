import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-settlements',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-settlements.html'
})
export class AdminSettlementsComponent implements OnInit {
  private apiUrl = 'http://localhost:8000/api/admin/settlements';
  
  settlements: any[] = [];
  isLoading = false;
  isExportingId: number | null = null;

  // Lấy tháng năm hiện tại mặc định (VD: "2026-06")
  selectedMonth: string = '';

  // BỘ LỌC TÌM KIẾM
  searchTerm: string = '';
  filterStatus: string = 'ALL';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    this.selectedMonth = `${yyyy}-${mm}`;
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    const token = localStorage.getItem('admin_token');
    const [year, month] = this.selectedMonth.split('-');

    this.http.get(`${this.apiUrl}?month=${month}&year=${year}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.settlements = res.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        Swal.fire('Lỗi', 'Không thể tải dữ liệu chốt công nợ', 'error');
      }
    });
  }

  // HÀM LỌC DỮ LIỆU ĐỂ HIỂN THỊ
  get filteredSettlements() {
    return this.settlements.filter(item => {
      // 1. Lọc theo tên khách sạn (không phân biệt hoa thường)
      const matchName = item.hotel_name.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      // 2. Lọc theo trạng thái nghiệp vụ
      let matchStatus = true;
      if (this.filterStatus === 'OWE_SYSTEM') {
        matchStatus = item.payout_to_hotel < 0 && item.status === 0; // KS nợ Sàn, chưa thu
      } else if (this.filterStatus === 'OWE_HOTEL') {
        matchStatus = item.payout_to_hotel >= 0 && item.status === 0; // Sàn nợ KS, chưa trả
      } else if (this.filterStatus === 'WAIT_HOTEL') {
        matchStatus = item.payout_to_hotel >= 0 && item.status === 2; // Sàn đã chuyển, chờ duyệt
      } else if (this.filterStatus === 'DONE') {
        matchStatus = item.status === 1; // Đã đối soát xong
      }

      return matchName && matchStatus;
    });
  }

  exportPdf(hotelId: number) {
    this.isExportingId = hotelId;
    const token = localStorage.getItem('admin_token') || '';
    const [year, month] = this.selectedMonth.split('-');

    this.http.get(`${this.apiUrl}/export-pdf?month=${month}&year=${year}&hotel_id=${hotelId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Chot_Cong_No_${hotelId}_${month}_${year}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        this.isExportingId = null;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isExportingId = null;
        this.cdr.detectChanges();
        
        if (err.error instanceof Blob) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            try {
              const errorData = JSON.parse(e.target.result);
              Swal.fire('Lỗi từ hệ thống', errorData.message, 'error');
            } catch (parseError) {
              Swal.fire('Lỗi', 'Lỗi máy chủ không xác định!', 'error');
            }
          };
          reader.readAsText(err.error);
        } else {
          Swal.fire('Lỗi', 'Không thể kết nối đến máy chủ!', 'error');
        }
      }
    });
  }

  confirmPayment(item: any) {
    const isHotelDebt = item.payout_to_hotel < 0; // true nếu Khách sạn nợ Sàn
    const title = isHotelDebt ? 'Xác nhận đã nhận tiền từ KS' : 'Xác nhận đã chuyển khoản cho KS';
    
    if (isHotelDebt) {
      // TRƯỜNG HỢP 1: KHÁCH SẠN NỢ SÀN (Chỉ cần xác nhận, không cần tải ảnh)
      Swal.fire({
        title: title,
        html: `Bạn xác nhận đã nhận đủ tiền từ <b>${item.hotel_name}</b> cho tháng ${this.selectedMonth}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Đã nhận đủ',
        cancelButtonText: 'Hủy'
      }).then((result) => {
        if (result.isConfirmed) {
          this.submitConfirmAPI(item, null); // Không gửi file
        }
      });

    } else {
      // TRƯỜNG HỢP 2: SÀN NỢ KHÁCH SẠN (Cần tải ảnh Bill chuyển khoản)
      Swal.fire({
        title: title,
        html: `Bạn xác nhận đã chuyển khoản cho <b>${item.hotel_name}</b>?<br><br>
               <label class="mb-2 text-danger fw-bold">Bắt buộc tải lên ảnh Bill chuyển khoản:</label>
               <input type="file" id="proof_file" class="swal2-input" accept="image/*">`,
        showCancelButton: true,
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Hủy',
        preConfirm: () => {
          const fileInput = document.getElementById('proof_file') as HTMLInputElement;
          const file = fileInput.files && fileInput.files.length > 0 ? fileInput.files[0] : null;

          if (!file) {
            Swal.showValidationMessage('Bạn bắt buộc phải tải lên ảnh Bill chuyển khoản!');
            return false;
          }
          return file;
        }        
      }).then((result) => {
        if (result.isConfirmed) {
          this.submitConfirmAPI(item, result.value);
        }
      });
    }
  }

  submitConfirmAPI(item: any, file: File | null) {
    const [year, month] = this.selectedMonth.split('-');
    const formData = new FormData();
    formData.append('hotel_id', item.hotel_id.toString());
    formData.append('month', parseInt(month, 10).toString());
    formData.append('year', parseInt(year, 10).toString());    
    
    if (file) {
      formData.append('proof_image', file);
    }

    const token = localStorage.getItem('admin_token');
    
    this.http.post(`${this.apiUrl.replace('/settlements', '/settlements/confirm')}`, formData, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => {
        Swal.fire('Thành công', 'Đã cập nhật trạng thái thanh toán!', 'success');
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Lỗi', err.error?.message || 'Không thể xác nhận thanh toán!', 'error');
      }
    });
  }
}