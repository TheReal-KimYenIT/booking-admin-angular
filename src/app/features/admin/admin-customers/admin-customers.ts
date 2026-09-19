import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminService } from '../../../services/admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-customers.html',
  styleUrl: './admin-customers.css'
})
export class AdminCustomersComponent implements OnInit {
  customerList: any[] = [];
  filteredList: any[] = [];
  isLoading = true;
  isSubmitting = false;

  // Search & Filters
  searchKeyword = '';
  statusFilter = 'ALL'; // 'ALL' | 'ACTIVE' | 'LOCKED'
  genderFilter = 'ALL'; // 'ALL' | 'Nam' | 'Nữ' | 'OTHER'
  sortBy = 'NEWEST'; // 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'BOOKINGS_DESC'

  // Detail Modal
  showDetailModal = false;
  selectedCustomer: any = null;

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
  }

  @HostListener('window:keydown.escape')
  onEscapePress() {
    if (this.showDetailModal) {
      this.closeDetailModal();
    }
  }

  loadData() {
    this.isLoading = true;
    this.adminService.getCustomers().subscribe({
      next: (res: any) => {
        this.customerList = res.data || [];
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Lỗi lấy danh sách khách hàng:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter() {
    const q = (this.searchKeyword || '').trim().toLowerCase();
    let result = this.customerList.filter(item => {
      // 1. Search keyword
      let matchQuery = true;
      if (q) {
        const fullName = `${item.last_name || ''} ${item.first_name || ''}`.toLowerCase();
        const email = (item.email || '').toLowerCase();
        const phone = (item.phone || '').toLowerCase();
        const address = (item.address || '').toLowerCase();
        const idStr = `#${item.id}`;

        matchQuery =
          fullName.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          address.includes(q) ||
          idStr.includes(q);
      }

      // 2. Status filter
      let matchStatus = true;
      if (this.statusFilter === 'ACTIVE') {
        matchStatus = item.is_active == 1;
      } else if (this.statusFilter === 'LOCKED') {
        matchStatus = item.is_active == 0;
      }

      // 3. Gender filter
      let matchGender = true;
      if (this.genderFilter === 'Nam') {
        matchGender = item.gender === 'Nam';
      } else if (this.genderFilter === 'Nữ') {
        matchGender = item.gender === 'Nữ';
      } else if (this.genderFilter === 'OTHER') {
        matchGender = !item.gender || (item.gender !== 'Nam' && item.gender !== 'Nữ');
      }

      return matchQuery && matchStatus && matchGender;
    });

    // 4. Sorting
    if (this.sortBy === 'NEWEST') {
      result.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (this.sortBy === 'OLDEST') {
      result.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (this.sortBy === 'NAME_ASC') {
      result.sort((a, b) => {
        const nameA = `${a.last_name || ''} ${a.first_name || ''}`.trim();
        const nameB = `${b.last_name || ''} ${b.first_name || ''}`.trim();
        return nameA.localeCompare(nameB, 'vi');
      });
    } else if (this.sortBy === 'BOOKINGS_DESC') {
      result.sort((a, b) => (Number(b.bookings_count) || 0) - (Number(a.bookings_count) || 0));
    }

    this.filteredList = result;
  }

  resetFilters() {
    this.searchKeyword = '';
    this.statusFilter = 'ALL';
    this.genderFilter = 'ALL';
    this.sortBy = 'NEWEST';
    this.applyFilter();
  }

  // --- KPI GETTERS (100% computed from real customer data) ---
  get totalCustomers(): number {
    return this.customerList.length;
  }

  get activeCustomers(): number {
    return this.customerList.filter(c => c.is_active == 1).length;
  }

  get lockedCustomers(): number {
    return this.customerList.filter(c => c.is_active == 0).length;
  }

  get bookedCustomers(): number {
    return this.customerList.filter(c => (Number(c.bookings_count) || 0) > 0).length;
  }

  // --- DETAIL MODAL ---
  viewDetail(customer: any) {
    this.selectedCustomer = customer;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedCustomer = null;
  }

  // --- TOGGLE STATUS (LOCK / UNLOCK) ---
  toggleStatus(id: number, currentStatus: number, customerName?: string) {
    const isCurrentlyActive = currentStatus == 1;
    const actionText = isCurrentlyActive ? 'KHÓA' : 'MỞ KHÓA';
    const name = customerName || 'khách hàng này';

    Swal.fire({
      title: `${actionText} tài khoản?`,
      html: isCurrentlyActive
        ? `Bạn có chắc chắn muốn khóa tài khoản của <strong>"${name}"</strong>?<br><small class="text-muted">Người dùng này sẽ không thể đăng nhập hoặc đặt phòng trên StayHub.</small>`
        : `Bạn có chắc chắn muốn mở khóa tài khoản cho <strong>"${name}"</strong>?`,
      icon: isCurrentlyActive ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: isCurrentlyActive ? '<i class="bi bi-lock-fill me-1"></i> Xác Nhận Khóa' : '<i class="bi bi-unlock-fill me-1"></i> Mở Khóa Ngay',
      cancelButtonText: 'Hủy Bỏ',
      confirmButtonColor: isCurrentlyActive ? '#ef4444' : '#10b981',
      cancelButtonColor: '#94a3b8'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isSubmitting = true;
        this.adminService.toggleCustomerStatus(id).subscribe({
          next: (res: any) => {
            this.isSubmitting = false;
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: res.message || 'Cập nhật trạng thái thành công!',
              timer: 1600,
              showConfirmButton: false
            });

            // Update in place
            const found = this.customerList.find(c => c.id === id);
            if (found) {
              found.is_active = isCurrentlyActive ? 0 : 1;
            }
            if (this.selectedCustomer && this.selectedCustomer.id === id) {
              this.selectedCustomer.is_active = isCurrentlyActive ? 0 : 1;
            }
            this.applyFilter();
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            this.isSubmitting = false;
            Swal.fire({
              icon: 'error',
              title: 'Lỗi',
              text: err.error?.message || 'Không thể cập nhật trạng thái.',
              confirmButtonText: 'Đóng'
            });
          }
        });
      }
    });
  }
}