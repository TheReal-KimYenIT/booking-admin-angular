import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-room-views',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-room-views.html',
  styleUrl: './admin-room-views.css'
})
export class AdminRoomViewsComponent implements OnInit {
  roomViews: any[] = [];
  filteredViews: any[] = [];
  loading = false;
  isSubmitting = false;

  // Search & Filter state
  searchKeyword = '';
  statusFilter = 'ALL'; // 'ALL' | '1' | '0'
  usageFilter = 'ALL';  // 'ALL' | 'USED' | 'UNUSED'
  sortBy = 'NEWEST';    // 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'USAGE_DESC'

  // Modal State
  showModal = false;
  isEditMode = false;
  currentView: any = { id: null, name: '', status: 1 };

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadViews();
  }

  @HostListener('window:keydown.escape')
  onEscapePress() {
    if (this.showModal) {
      this.closeModal();
    }
  }

  loadViews() {
    this.loading = true;
    this.adminService.getRoomViews().subscribe({
      next: (res: any) => {
        this.roomViews = res.data || [];
        this.applyFilter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Lỗi tải danh sách hướng nhìn:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter() {
    const q = (this.searchKeyword || '').trim().toLowerCase();

    let result = this.roomViews.filter(item => {
      // 1. Keyword search (Name or ID)
      let matchQuery = true;
      if (q) {
        const name = (item.name || '').toLowerCase();
        const idStr = `#${item.id}`;
        const rawId = String(item.id || '');
        matchQuery = name.includes(q) || idStr.includes(q) || rawId.includes(q);
      }

      // 2. Status filter
      let matchStatus = true;
      if (this.statusFilter !== 'ALL') {
        matchStatus = item.status == Number(this.statusFilter);
      }

      // 3. Usage filter
      let matchUsage = true;
      const usageCount = Number(item.room_types_count) || 0;
      if (this.usageFilter === 'USED') {
        matchUsage = usageCount > 0;
      } else if (this.usageFilter === 'UNUSED') {
        matchUsage = usageCount === 0;
      }

      return matchQuery && matchStatus && matchUsage;
    });

    // 4. Sorting
    if (this.sortBy === 'NEWEST') {
      result.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (this.sortBy === 'OLDEST') {
      result.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (this.sortBy === 'NAME_ASC') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    } else if (this.sortBy === 'USAGE_DESC') {
      result.sort((a, b) => (Number(b.room_types_count) || 0) - (Number(a.room_types_count) || 0));
    }

    this.filteredViews = result;
  }

  resetFilters() {
    this.searchKeyword = '';
    this.statusFilter = 'ALL';
    this.usageFilter = 'ALL';
    this.sortBy = 'NEWEST';
    this.applyFilter();
  }

  // --- KPI GETTERS (100% computed from real DB data) ---
  get totalViews(): number {
    return this.roomViews.length;
  }

  get activeViewsCount(): number {
    return this.roomViews.filter(v => v.status == 1).length;
  }

  get inactiveViewsCount(): number {
    return this.roomViews.filter(v => v.status == 0).length;
  }

  get usedViewsCount(): number {
    return this.roomViews.filter(v => (Number(v.room_types_count) || 0) > 0).length;
  }

  get totalLinkedRooms(): number {
    return this.roomViews.reduce((acc, cur) => acc + (Number(cur.room_types_count) || 0), 0);
  }

  // --- MODAL ACTIONS ---
  openAddModal() {
    this.isEditMode = false;
    this.currentView = { id: null, name: '', status: 1 };
    this.showModal = true;
  }

  openEditModal(view: any) {
    this.isEditMode = true;
    this.currentView = { ...view };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveView() {
    const trimmedName = (this.currentView.name || '').trim();
    if (!trimmedName) {
      Swal.fire({
        icon: 'warning',
        title: 'Thiếu thông tin',
        text: 'Vui lòng nhập tên hướng nhìn!',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const payload = {
      name: trimmedName,
      status: Number(this.currentView.status) === 0 ? 0 : 1
    };

    this.isSubmitting = true;

    if (this.isEditMode) {
      this.adminService.updateRoomView(this.currentView.id, payload).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: res.message || 'Cập nhật hướng nhìn thành công!',
            showConfirmButton: false,
            timer: 1500
          });
          this.closeModal();
          this.loadViews();
        },
        error: (err: any) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Lỗi cập nhật',
            text: err.error?.message || 'Không thể cập nhật hướng nhìn.',
            confirmButtonText: 'Đóng'
          });
        }
      });
    } else {
      this.adminService.addRoomView(payload).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: res.message || 'Thêm hướng nhìn mới thành công!',
            showConfirmButton: false,
            timer: 1500
          });
          this.closeModal();
          this.loadViews();
        },
        error: (err: any) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Lỗi thêm mới',
            text: err.error?.message || 'Không thể thêm hướng nhìn.',
            confirmButtonText: 'Đóng'
          });
        }
      });
    }
  }

  toggleStatus(view: any) {
    const newStatus = view.status == 1 ? 0 : 1;
    const statusText = newStatus == 1 ? 'Kích hoạt' : 'Tạm ẩn';

    Swal.fire({
      title: `${statusText} hướng nhìn?`,
      html: `Bạn có muốn đổi trạng thái của <strong>"${view.name}"</strong> sang <strong>${statusText}</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus == 1 ? '#10b981' : '#64748b',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: `<i class="bi ${newStatus == 1 ? 'bi-check-circle-fill' : 'bi-eye-slash-fill'} me-1"></i> ${statusText}`,
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.updateRoomView(view.id, { name: view.name, status: newStatus }).subscribe({
          next: () => {
            view.status = newStatus;
            this.applyFilter();
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: `Đã ${statusText.toLowerCase()} hướng nhìn "${view.name}".`,
              showConfirmButton: false,
              timer: 1500
            });
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Thao tác thất bại',
              text: err.error?.message || 'Không thể thay đổi trạng thái lúc này.',
              confirmButtonText: 'Đóng'
            });
          }
        });
      }
    });
  }

  deleteView(view: any) {
    const linkedCount = Number(view.room_types_count) || 0;

    if (linkedCount > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Không thể xóa!',
        html: `Hướng nhìn <strong>"${view.name}"</strong> hiện đang được liên kết với <strong>${linkedCount}</strong> hạng phòng trong hệ thống.<br>` +
          `<small class="text-muted mt-2 d-block">Vui lòng gỡ bỏ hướng nhìn này khỏi các hạng phòng trước khi thực hiện xóa.</small>`,
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    Swal.fire({
      title: 'Xóa hướng nhìn này?',
      html: `Bạn có chắc chắn muốn xóa vĩnh viễn hướng nhìn <strong>"${view.name}"</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i> Xóa Hướng Nhìn',
      cancelButtonText: 'Hủy Bỏ'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deleteRoomView(view.id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Đã xóa!',
              text: res.message || 'Xóa hướng nhìn thành công!',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadViews();
          },
          error: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Lỗi xóa',
              text: err.error?.message || 'Không thể xóa hướng nhìn này.',
              confirmButtonText: 'Đóng'
            });
          }
        });
      }
    });
  }
}