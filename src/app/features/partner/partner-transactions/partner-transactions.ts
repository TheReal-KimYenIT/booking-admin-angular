import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-partner-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './partner-transactions.html',
  styleUrl: './partner-transactions.css'
})
export class PartnerTransactionsComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/partner`; 

  transactions: any[] = [];
  stats: any = {
    grand_total: 0,
    vnpay_total: 0,
    cash_total: 0,
    transfer_total: 0,
    pos_total: 0,
    counter_total: 0,
    total_commission: 0,
    total_payout: 0,
    total_vat: 0,
    total_net_room: 0,
    commission_rate: 15,
    hotel_name: '',
    success_count: 0,
    failed_count: 0,
    pending_count: 0,
    peak_date: null,
    peak_revenue: 0,
    lowest_date: null,
    lowest_revenue: 0
  };

  keyword: string = '';
  startDate: string = '';
  endDate: string = '';
  selectedMethod: string = 'all';
  selectedStatus: string = 'all'; 
  activeDatePreset: string = 'all'; // 'this_month' | 'last_month' | 'all' | 'custom'

  currentPage: number = 1;
  lastPage: number = 1;
  totalRecords: number = 0;

  isLoading: boolean = false;

  // Detail Modal State
  selectedItem: any = null;
  showDetailModal: boolean = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  ngOnInit() {
    this.setAllTime();
  }

  openDetail(item: any) {
    this.selectedItem = item;
    this.showDetailModal = true;
  }

  closeDetail() {
    this.showDetailModal = false;
    this.selectedItem = null;
  }

  setThisMonth() {
    this.activeDatePreset = 'this_month';
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = this.formatDate(firstDay);
    this.endDate = this.formatDate(today);
    this.loadTransactions(1);
  }

  setLastMonth() {
    this.activeDatePreset = 'last_month';
    const today = new Date();
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    this.startDate = this.formatDate(firstDayLastMonth);
    this.endDate = this.formatDate(lastDayLastMonth);
    this.loadTransactions(1);
  }

  setAllTime() {
    this.activeDatePreset = 'all';
    this.startDate = '2026-07-01';
    this.endDate = this.formatDate(new Date());
    this.loadTransactions(1);
  }

  onCustomDateChange() {
    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      this.endDate = this.startDate;
    }
    this.activeDatePreset = 'custom';
    this.loadTransactions(1);
  }

  loadTransactions(page: number = 1) {
    this.isLoading = true;
    this.cdr.detectChanges();
    
    const token = localStorage.getItem('partner_token');
    let queryParams = `?page=${page}&start_date=${this.startDate}&end_date=${this.endDate}&method=${this.selectedMethod}&status=${this.selectedStatus}&keyword=${encodeURIComponent(this.keyword.trim())}`;

    this.http.get(`${this.apiUrl}/transactions${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.transactions = res.data?.data || [];
        this.currentPage = res.data?.current_page || 1;
        this.lastPage = res.data?.last_page || 1;
        this.totalRecords = res.data?.total || 0;
        if (res.stats) {
          this.stats = res.stats;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', 'Không thể tải dữ liệu đối soát doanh thu!', 'error');
      }
    });
  }

  onFilterChange() {
    this.loadTransactions(1);
  }

  clearKeyword() {
    this.keyword = '';
    this.loadTransactions(1);
  }

  resetAllFilters() {
    this.keyword = '';
    this.selectedMethod = 'all';
    this.selectedStatus = 'all';
    this.setAllTime();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.lastPage) {
      this.loadTransactions(page);
    }
  }

  @HostListener('window:keydown.escape')
  onEscapePress() {
    if (this.showDetailModal) {
      this.closeDetail();
    }
  }

  getMethodName(method: number): string {
    switch(Number(method)) {
      case 1: return 'Tiền mặt';
      case 2: return 'Quẹt thẻ POS';
      case 3: return 'Chuyển khoản (QR)';
      case 4: return 'VNPAY';
      default: return 'Khác';
    }
  }

  exportExcel(): void {
    if (this.transactions.length === 0) {
      Swal.fire('Thông báo', 'Không có dữ liệu giao dịch để xuất Excel!', 'info');
      return;
    }

    const token = localStorage.getItem('partner_token');
    // Truy vấn với limit=5000 để lấy toàn bộ danh sách đối soát theo bộ lọc hiện tại
    let queryParams = `?page=1&limit=5000&start_date=${this.startDate}&end_date=${this.endDate}&method=${this.selectedMethod}&status=${this.selectedStatus}&keyword=${encodeURIComponent(this.keyword.trim())}`;

    Swal.fire({
      title: 'Đang chuẩn bị file Excel...',
      text: 'Vui lòng chờ trong giây lát',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.http.get(`${this.apiUrl}/transactions${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        Swal.close();
        const exportList = res.data?.data || this.transactions;

        const exportData = exportList.map((t: any, index: number) => {
          let statusText = t.payment_status === 1 ? 'Thành công' : (t.payment_status === 0 ? 'Đang chờ' : 'Đã hoàn tiền');

          return {
            'STT': index + 1,
            'Mã Đơn': t.booking_code || '',
            'Mã GD Cổng': t.transaction_id || 'Tại quầy',
            'Thời Gian Giao Dịch': new Date(t.created_at).toLocaleString('vi-VN'),
            'Khách Hàng': t.guest_name || '',
            'Số Điện Thoại': t.guest_phone || '',
            'Hình Thức': this.getMethodName(t.payment_method),
            'Trạng Thái': statusText,
            'Số Tiền Khách Trả (VNĐ)': Number(t.amount) || 0,
            'Hoàn Tiền Khách (VNĐ)': Number(t.refund_deducted) || 0,
            'Thuế VAT (KS Nộp VNĐ)': Number(t.payment_vat) || 0,
            'Tỷ Lệ Phí Sàn (%)': (Number(t.applied_rate) || 15) + '%',
            'Phí Sàn Admin Thu (VNĐ)': Number(t.commission_fee) || 0,
            'Thực Nhận Của KS (Gồm VAT)': Number(t.payout_amount) || 0,
            'Doanh Thu Thuần Phòng (VNĐ)': Number(t.hotel_net_room) || 0
          };
        });

        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
        worksheet['!cols'] = [
          { wch: 6 },  // STT
          { wch: 22 }, // Mã Đơn
          { wch: 22 }, // Mã GD Cổng
          { wch: 22 }, // Thời Gian
          { wch: 24 }, // Khách Hàng
          { wch: 15 }, // SĐT
          { wch: 18 }, // Hình Thức
          { wch: 16 }, // Trạng Thái
          { wch: 24 }, // Tiền Khách Trả
          { wch: 20 }, // Hoàn Tiền
          { wch: 22 }, // Thuế VAT (KS Nộp)
          { wch: 18 }, // Tỷ Lệ Phí Sàn
          { wch: 24 }, // Phí Sàn Admin Thu
          { wch: 28 }, // Thực Nhận KS (Gồm VAT)
          { wch: 26 }, // Thuần Phòng
        ];

        const workbook: XLSX.WorkBook = { Sheets: { 'DoiSoatDoanhThu': worksheet }, SheetNames: ['DoiSoatDoanhThu'] };
        XLSX.writeFile(workbook, `Doi_Soat_Doanh_Thu_${this.formatDate(new Date())}.xlsx`);
        Swal.fire({ icon: 'success', title: 'Xuất file Excel thành công!', timer: 1500, showConfirmButton: false });
      },
      error: () => {
        Swal.fire('Lỗi', 'Không thể kết xuất dữ liệu Excel!', 'error');
      }
    });
  }
}