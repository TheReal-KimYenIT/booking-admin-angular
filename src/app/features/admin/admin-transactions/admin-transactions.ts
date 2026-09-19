import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-transactions.html',
  styleUrl: './admin-transactions.css'
})
export class TransactionsComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  transactions: any[] = [];
  hotels: any[] = [];
  stats: any = {
    gross_total: 0,
    vnpay_total: 0,
    cash_total: 0,
    transfer_total: 0,
    pos_total: 0,
    commission_total: 0,
    payout_total: 0,
    success_count: 0,
    failed_count: 0,
    pending_count: 0,
    peak_date: null,
    peak_revenue: 0,
    lowest_date: null,
    lowest_revenue: 0
  };

  // Filter Variables
  keyword: string = '';
  startDate: string = '';
  endDate: string = '';
  selectedMethod: string = 'all';
  selectedHotel: string = 'all';
  selectedStatus: string = 'all'; // all, 1: Thành công, 0: Đang chờ, 2: Thất bại / Đã hoàn
  activePreset: string = 'all_time';

  // Pagination Variables
  currentPage: number = 1;
  lastPage: number = 1;
  totalRecords: number = 0;

  isLoading: boolean = false;
  isExporting: boolean = false;

  // Detail Modal State
  selectedItem: any = null;
  showDetailModal: boolean = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.setDatePreset('all_time', false);
    this.fetchTransactions();
  }

  @HostListener('window:keydown.escape')
  onEscapePress() {
    if (this.showDetailModal) {
      this.closeDetailModal();
    }
  }

  setDatePreset(preset: 'today' | 'this_month' | 'last_month' | 'all_time', triggerFetch: boolean = true) {
    this.activePreset = preset;
    const now = new Date();

    if (preset === 'today') {
      const todayStr = this.formatDate(now);
      this.startDate = todayStr;
      this.endDate = todayStr;
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      this.startDate = this.formatDate(firstDay);
      this.endDate = this.formatDate(now);
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      this.startDate = this.formatDate(firstDayLastMonth);
      this.endDate = this.formatDate(lastDayLastMonth);
    } else if (preset === 'all_time') {
      this.startDate = '2026-01-01';
      this.endDate = this.formatDate(now);
    }

    if (triggerFetch) {
      this.onFilterChange();
    }
  }

  formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  fetchTransactions(page: number = 1) {
    this.isLoading = true;
    this.cdr.detectChanges();

    const token = localStorage.getItem('admin_token');
    const queryParams = `?page=${page}&start_date=${this.startDate}&end_date=${this.endDate}&method=${this.selectedMethod}&hotel_id=${this.selectedHotel}&status=${this.selectedStatus}&keyword=${encodeURIComponent(this.keyword)}`;

    this.http.get(`${this.apiUrl}/admin/transactions${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.transactions = res.data?.data || [];
        this.currentPage = res.data?.current_page || 1;
        this.lastPage = res.data?.last_page || 1;
        this.totalRecords = res.data?.total || 0;
        this.stats = res.stats || this.stats;
        this.hotels = res.hotels || [];

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.cdr.detectChanges();
        console.error('Lỗi tải dữ liệu giao dịch:', err);
        Swal.fire({
          icon: 'error',
          title: 'Lỗi tải dữ liệu',
          text: err.error?.message || 'Không thể tải lịch sử dòng tiền giao dịch lúc này.'
        });
      }
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.fetchTransactions(1);
  }

  resetFilters() {
    this.keyword = '';
    this.selectedMethod = 'all';
    this.selectedHotel = 'all';
    this.selectedStatus = 'all';
    this.setDatePreset('all_time', true);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.lastPage && page !== this.currentPage) {
      this.fetchTransactions(page);
    }
  }

  openDetailModal(item: any) {
    this.selectedItem = item;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedItem = null;
  }

  exportExcel() {
    this.isExporting = true;
    const token = localStorage.getItem('admin_token') || '';
    const queryParams = `?start_date=${this.startDate}&end_date=${this.endDate}&method=${this.selectedMethod}&hotel_id=${this.selectedHotel}&status=${this.selectedStatus}&keyword=${encodeURIComponent(this.keyword)}`;

    this.http.get(`${this.apiUrl}/admin/transactions/export${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Doi_Soat_StayHub_${new Date().getTime()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isExporting = false;
        this.cdr.detectChanges();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Đã xuất file đối soát thành công!',
          showConfirmButton: false,
          timer: 2500
        });
      },
      error: async (err) => {
        console.error('Lỗi xuất file:', err);
        this.isExporting = false;
        this.cdr.detectChanges();
        let errMsg = 'Không thể xuất file đối soát lúc này. Vui lòng kiểm tra lại kết nối!';
        if (err?.error instanceof Blob) {
          try {
            const text = await err.error.text();
            const json = JSON.parse(text);
            if (json?.message) errMsg = json.message;
          } catch (_) {}
        }
        Swal.fire({
          icon: 'error',
          title: 'Lỗi xuất file',
          text: errMsg
        });
      }
    });
  }

  getMethodName(method: number): string {
    switch (Number(method)) {
      case 1: return 'Tiền mặt';
      case 2: return 'Quẹt thẻ POS';
      case 3: return 'Chuyển khoản';
      case 4: return 'VNPAY';
      default: return 'Không rõ';
    }
  }

  getMethodIcon(method: number): string {
    switch (Number(method)) {
      case 1: return 'bi-cash-stack text-emerald-600';
      case 2: return 'bi-credit-card text-blue-600';
      case 3: return 'bi-bank text-amber-600';
      case 4: return 'bi-globe text-primary';
      default: return 'bi-question-circle text-muted';
    }
  }
}