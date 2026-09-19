import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-contacts.html',
  styleUrl: './admin-contacts.css'
})
export class AdminContactsComponent implements OnInit {
  contacts: any[] = [];
  filteredContacts: any[] = [];
  loading = false;

  // Search & Filters
  searchKeyword = '';
  statusFilter = 'all'; // 'all' | '0' | '1'
  sortBy = 'NEWEST';    // 'NEWEST' | 'OLDEST' | 'NAME_ASC'

  // Modal State
  selectedContactDetail: any = null;

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadContacts();
  }

  @HostListener('window:keydown.escape')
  onEscapePress() {
    if (this.selectedContactDetail) {
      this.closeDetailModal();
    }
  }

  loadContacts() {
    this.loading = true;
    this.adminService.getSystemContacts().subscribe({
      next: (res: any) => {
        this.contacts = res.data || res || [];
        this.applyFilter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi tải danh sách liên hệ:', err);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: 'Không thể tải danh sách liên hệ từ máy chủ!',
          confirmButtonText: 'Đóng'
        });
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter() {
    const q = (this.searchKeyword || '').trim().toLowerCase();

    let result = this.contacts.filter(c => {
      // 1. Keyword search (Name, Email, Phone, Subject, Message, ID)
      let matchQuery = true;
      if (q) {
        const name = (c.name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const subject = (c.subject || '').toLowerCase();
        const message = (c.message || '').toLowerCase();
        const idStr = `#${c.id}`;
        const rawId = String(c.id || '');

        matchQuery = name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          subject.includes(q) ||
          message.includes(q) ||
          idStr.includes(q) ||
          rawId.includes(q);
      }

      // 2. Status filter
      let matchStatus = true;
      if (this.statusFilter !== 'all') {
        matchStatus = c.status.toString() === this.statusFilter;
      }

      return matchQuery && matchStatus;
    });

    // 3. Sorting
    if (this.sortBy === 'NEWEST') {
      result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (this.sortBy === 'OLDEST') {
      result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    } else if (this.sortBy === 'NAME_ASC') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    }

    this.filteredContacts = result;
    this.cdr.detectChanges();
  }

  resetFilters() {
    this.searchKeyword = '';
    this.statusFilter = 'all';
    this.sortBy = 'NEWEST';
    this.applyFilter();
  }

  // --- KPI GETTERS (100% computed from real DB data) ---
  get totalContacts(): number {
    return this.contacts.length;
  }

  get pendingCount(): number {
    return this.contacts.filter(c => c.status === 0).length;
  }

  get resolvedCount(): number {
    return this.contacts.filter(c => c.status === 1).length;
  }

  get withPhoneCount(): number {
    return this.contacts.filter(c => !!c.phone).length;
  }

  // --- MODAL ACTIONS ---
  openDetailModal(contact: any) {
    this.selectedContactDetail = contact;
  }

  closeDetailModal() {
    this.selectedContactDetail = null;
  }

  handleResolve(id: number) {
    Swal.fire({
      title: 'Đánh dấu đã giải quyết?',
      text: 'Xác nhận yêu cầu này đã được liên hệ và giải quyết thỏa đáng?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="bi bi-check-circle-fill me-1"></i> Đúng, Đã Xong!',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.resolveContact(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: 'Đã cập nhật trạng thái liên hệ!',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadContacts();
            if (this.selectedContactDetail && this.selectedContactDetail.id === id) {
              this.selectedContactDetail.status = 1;
            }
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Lỗi',
              text: err.error?.message || 'Không thể cập nhật trạng thái!',
              confirmButtonText: 'Đóng'
            });
          }
        });
      }
    });
  }

  toggleStatus(item: any) {
    const newStatus = item.status === 1 ? 0 : 1;
    const statusText = newStatus === 1 ? 'Đã giải quyết' : 'Chưa xử lý';

    Swal.fire({
      title: `Đổi trạng thái liên hệ?`,
      html: `Chuyển tin nhắn của <strong>"${item.name}"</strong> sang <strong>"${statusText}"</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus === 1 ? '#10b981' : '#f59e0b',
      cancelButtonColor: '#64748b',
      confirmButtonText: `<i class="bi ${newStatus === 1 ? 'bi-check-circle-fill' : 'bi-arrow-counterclockwise'} me-1"></i> Cập Nhật`,
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.updateContactStatus(item.id, newStatus).subscribe({
          next: () => {
            item.status = newStatus;
            this.applyFilter();
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: `Đã cập nhật sang trạng thái "${statusText}".`,
              showConfirmButton: false,
              timer: 1500
            });
            if (this.selectedContactDetail && this.selectedContactDetail.id === item.id) {
              this.selectedContactDetail.status = newStatus;
            }
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Lỗi',
              text: err.error?.message || 'Không thể thay đổi trạng thái!',
              confirmButtonText: 'Đóng'
            });
          }
        });
      }
    });
  }

  deleteContact(item: any) {
    Swal.fire({
      title: 'Xóa tin nhắn liên hệ?',
      html: `Bạn có chắc chắn muốn xóa tin nhắn từ <strong>"${item.name}"</strong>? Thao tác này không thể hoàn tác.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i> Xóa Vĩnh Viễn',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deleteContact(item.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Đã xóa!',
              text: 'Tin nhắn liên hệ đã được xóa thành công!',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadContacts();
            if (this.selectedContactDetail && this.selectedContactDetail.id === item.id) {
              this.closeDetailModal();
            }
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Lỗi xóa',
              text: err.error?.message || 'Không thể xóa tin nhắn lúc này.',
              confirmButtonText: 'Đóng'
            });
          }
        });
      }
    });
  }
}
