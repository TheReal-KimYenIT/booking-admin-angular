import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-customers.html',
  styleUrl: './partner-customers.css'
})
export class PartnerCustomersComponent implements OnInit {
  customerList: any[] = [];
  filteredList: any[] = [];
  isLoading = true;
  searchTerm: string = '';
  activeFilterTab: 'all' | 'loyal' | 'blocked' = 'all';

  // KPI Metrics
  totalCustomers: number = 0;
  loyalCustomersCount: number = 0;
  blockedCustomersCount: number = 0;
  totalRevenue: number = 0;

  // Modal đơn đặt phòng
  isOrderModalOpen = false;
  isOrdersLoading = false;
  selectedCustomer: any = null;
  selectedCustomerName = '';
  selectedCustomerOrders: any[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    const token = localStorage.getItem('partner_token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>(`${environment.apiUrl}/partner/customers`, { headers }).subscribe({
      next: (res: any) => {
        this.customerList = res.data || [];
        this.calculateMetrics();
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Lỗi nạp danh sách khách hàng:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', 'Không thể tải danh sách khách hàng!', 'error');
      }
    });
  }

  calculateMetrics() {
    this.totalCustomers = this.customerList.length;
    this.loyalCustomersCount = this.customerList.filter(c => Number(c.total_bookings) >= 3).length;
    this.blockedCustomersCount = this.customerList.filter(c => Number(c.is_blocked) === 1).length;
    this.totalRevenue = this.customerList.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);
  }

  setFilterTab(tab: 'all' | 'loyal' | 'blocked') {
    this.activeFilterTab = tab;
    this.applyFilter();
  }

  onSearch() {
    this.applyFilter();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  applyFilter() {
    let list = [...this.customerList];

    // 1. Lọc theo tab trạng thái
    if (this.activeFilterTab === 'loyal') {
      list = list.filter(c => Number(c.total_bookings) >= 3);
    } else if (this.activeFilterTab === 'blocked') {
      list = list.filter(c => Number(c.is_blocked) === 1);
    }

    // 2. Lọc theo từ khóa tìm kiếm (Full name, phone, email)
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.trim().toLowerCase();
      list = list.filter(c => {
        const fullName = `${c.last_name || ''} ${c.first_name || ''}`.trim().toLowerCase();
        const reverseName = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const email = (c.email || '').toLowerCase();

        return fullName.includes(term) || reverseName.includes(term) || phone.includes(term) || email.includes(term);
      });
    }

    this.filteredList = list;
    this.cdr.detectChanges();
  }

  toggleBlock(item: any) {
    const fullName = `${item.last_name || ''} ${item.first_name || ''}`.trim();

    if (Number(item.is_blocked) === 1) {
      // MỞ KHÓA
      Swal.fire({
        title: 'Mở khóa khách hàng?',
        html: `Bạn có chắc chắn muốn gỡ chặn cho khách hàng <strong>${fullName}</strong>?<br><small class="text-muted">Khách hàng sẽ có thể đặt phòng trở lại bình thường.</small>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: '🔓 Đồng ý Mở khóa',
        cancelButtonText: 'Hủy'
      }).then((result) => {
        if (result.isConfirmed) {
          const token = localStorage.getItem('partner_token') || '';
          const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

          this.http.post<any>(`${environment.apiUrl}/partner/customers/${item.id}/toggle-block`, {}, { headers }).subscribe({
            next: (res) => {
              Swal.fire({ icon: 'success', title: 'Thành công!', text: res.message || 'Đã mở khóa khách hàng thành công!', timer: 1500, showConfirmButton: false });
              this.loadData();
            },
            error: (err) => Swal.fire('Lỗi', err.error?.message || 'Có lỗi xảy ra khi mở khóa', 'error')
          });
        }
      });
    } else {
      // CHẶN
      Swal.fire({
        title: 'Đưa vào Danh sách đen (Blacklist)?',
        html: `Khách hàng: <strong>${fullName}</strong><br><small class="text-danger">Khách hàng sẽ bị chặn không thể tiếp tục đặt phòng tại khách sạn.</small>`,
        input: 'text',
        inputPlaceholder: 'Nhập lý do chặn (VD: Quỵt tiền minibar, phá hoại tài sản, bùng phòng...)',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: '🚫 Xác nhận Chặn',
        cancelButtonText: 'Hủy bỏ',
        inputValidator: (value) => {
          if (!value || value.trim() === '') {
            return 'Vui lòng nhập lý do chặn để lưu hồ sơ!';
          }
          return null;
        }
      }).then((result) => {
        if (result.isConfirmed) {
          const reason = result.value;
          const token = localStorage.getItem('partner_token') || '';
          const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

          this.http.post<any>(`${environment.apiUrl}/partner/customers/${item.id}/toggle-block`, { reason }, { headers }).subscribe({
            next: (res) => {
              Swal.fire({ icon: 'success', title: 'Đã chặn!', text: res.message || 'Đã đưa khách hàng vào danh sách đen!', timer: 1500, showConfirmButton: false });
              this.loadData();
            },
            error: (err) => Swal.fire('Lỗi', err.error?.message || 'Có lỗi xảy ra khi chặn khách', 'error')
          });
        }
      });
    }
  }

  goToMessages(customer: any) {
    this.router.navigate(['/dashboard/support'], { queryParams: { customer_id: customer.id } });
  }

  viewOrders(customer: any) {
    this.selectedCustomer = customer;
    this.selectedCustomerName = `${customer.last_name || ''} ${customer.first_name || ''}`.trim();
    this.isOrderModalOpen = true;
    this.isOrdersLoading = true;
    this.selectedCustomerOrders = [];
    this.cdr.detectChanges();

    const token = localStorage.getItem('partner_token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>(`${environment.apiUrl}/partner/customers/${customer.id}/bookings`, { headers }).subscribe({
      next: (res) => {
        this.selectedCustomerOrders = res.data || [];
        this.isOrdersLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isOrdersLoading = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', 'Không thể lấy dữ liệu đơn đặt phòng của khách hàng', 'error');
      }
    });
  }

  closeOrderModal() {
    this.isOrderModalOpen = false;
  }

  goToOrderDetails(order: any) {
    this.closeOrderModal();
    // Chuyển thẳng đến trang chi tiết đơn đặt phòng
    this.router.navigate(['/dashboard/bookings', order.id]);
  }

  // --- XUẤT FILE EXCEL ---
  exportToExcel() {
    if (!this.filteredList || this.filteredList.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Thông báo', text: 'Không có dữ liệu khách hàng để xuất file!' });
      return;
    }

    const exportData = this.filteredList.map((item: any, index: number) => {
      const fullName = `${item.last_name || ''} ${item.first_name || ''}`.trim();
      const tier = this.getCustomerTier(item.total_bookings);
      return {
        'STT': index + 1,
        'Họ và tên': fullName,
        'Email': item.email || '---',
        'Số điện thoại': item.phone || '---',
        'Phân loại': tier.label,
        'Số lần đặt': Number(item.total_bookings || 0),
        'Tổng chi tiêu (VNĐ)': Number(item.total_spent || 0),
        'Lần đặt gần nhất': item.latest_booking_at ? new Date(item.latest_booking_at).toLocaleDateString('vi-VN') : '---',
        'Trạng thái': item.is_blocked == 1 ? 'Đang bị chặn' : 'Bình thường',
        'Lý do chặn': item.block_reason || ''
      };
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = { Sheets: { 'KhachHang': worksheet }, SheetNames: ['KhachHang'] };
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Danh_Sach_Khach_Hang_${dateStr}.xlsx`);
  }

  // --- HELPER METHODS CHO GIAO DIỆN ---
  getInitials(firstName: string, lastName: string): string {
    const f = (firstName || '').trim().charAt(0);
    const l = (lastName || '').trim().charAt(0);
    return `${l}${f}`.toUpperCase() || 'KH';
  }

  getAvatarColor(id: number): string {
    const colors = [
      '#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#14b8a6',
      '#8b5cf6', '#ec4899', '#f59e0b', '#059669', '#d97706'
    ];
    return colors[id % colors.length];
  }

  getCustomerTier(totalBookings: number): { label: string, class: string, icon: string, iconClass: string } {
    const count = Number(totalBookings || 0);
    if (count >= 5) {
      return { label: 'VIP', class: 'tier-vip', icon: '👑', iconClass: 'bi bi-award-fill' };
    } else if (count >= 3) {
      return { label: 'Khách quen', class: 'tier-loyal', icon: '⭐', iconClass: 'bi bi-star-fill' };
    }
    return { label: 'Khách mới', class: 'tier-new', icon: '👤', iconClass: 'bi bi-person' };
  }

  getBookingStatusInfo(status: number): { label: string, class: string } {
    switch (status) {
      case 0: return { label: 'Chờ thanh toán cọc', class: 'badge bg-warning text-dark' };
      case 1: return { label: 'Đã xác nhận', class: 'badge bg-primary' };
      case 2: return { label: 'Đang lưu trú', class: 'badge bg-info text-dark' };
      case 3: return { label: 'Đã trả phòng', class: 'badge bg-success' };
      case 4: return { label: 'Đã hủy', class: 'badge bg-danger' };
      case 5: return { label: 'No-Show', class: 'badge bg-dark' };
      default: return { label: 'Khác', class: 'badge bg-secondary' };
    }
  }
}