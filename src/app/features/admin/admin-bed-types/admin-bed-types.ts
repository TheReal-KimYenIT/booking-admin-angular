import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-bed-types',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-bed-types.html',
  styleUrl: './admin-bed-types.css'
})
export class AdminBedTypesComponent implements OnInit {
  bedTypes: any[] = [];
  filteredBeds: any[] = [];
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
  currentBed: any = { id: null, name: '', status: 1 };

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBeds();
  }

  @HostListener('window:keydown.escape')
  onEscapePress() {
    if (this.showModal) {
      this.closeModal();
    }
  }

  loadBeds() {
    this.loading = true;
    this.adminService.getBedTypes().subscribe({
      next: (res: any) => {
        this.bedTypes = res.data || [];
        this.applyFilter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Lỗi tải danh sách loại giường:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter() {
    const q = (this.searchKeyword || '').trim().toLowerCase();

    let result = this.bedTypes.filter(item => {
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

    this.filteredBeds = result;
  }

  resetFilters() {
    this.searchKeyword = '';
    this.statusFilter = 'ALL';
    this.usageFilter = 'ALL';
    this.sortBy = 'NEWEST';
    this.applyFilter();
  }

  // --- KPI GETTERS (100% computed from real DB data) ---
  get totalBeds(): number {
    return this.bedTypes.length;
  }

  get activeBedsCount(): number {
    return this.bedTypes.filter(b => b.status == 1).length;
  }

  get inactiveBedsCount(): number {
    return this.bedTypes.filter(b => b.status == 0).length;
  }

  get usedBedsCount(): number {
    return this.bedTypes.filter(b => (Number(b.room_types_count) || 0) > 0).length;
  }

  get totalLinkedRooms(): number {
    return this.bedTypes.reduce((acc, cur) => acc + (Number(cur.room_types_count) || 0), 0);
  }

  // --- MODAL ACTIONS ---
  openAddModal() {
    this.isEditMode = false;
    this.currentBed = { id: null, name: '', status: 1 };
    this.showModal = true;
  }

  openEditModal(bed: any) {
    this.isEditMode = true;
    this.currentBed = { ...bed };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveBed() {
    const trimmedName = (this.currentBed.name || '').trim();
    if (!trimmedName) {
      Swal.fire({
        icon: 'warning',
        title: 'Thiếu thông tin',
        text: 'Vui lòng nhập tên loại giường!',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const payload = {
      name: trimmedName,
      status: Number(this.currentBed.status) === 0 ? 0 : 1
    };

    this.isSubmitting = true;

    if (this.isEditMode) {
      this.adminService.updateBedType(this.currentBed.id, payload).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: res.message || 'Cập nhật loại giường thành công!',
            showConfirmButton: false,
            timer: 1500
          });
          this.closeModal();
          this.loadBeds();
        },
        error: (err: any) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Lỗi cập nhật',
            text: err.error?.message || 'Không thể cập nhật loại giường.',
            confirmButtonText: 'Đóng'
          });
        }
      });
    } else {
      this.adminService.addBedType(payload).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: res.message || 'Thêm loại giường mới thành công!',
            showConfirmButton: false,
            timer: 1500
          });
          this.closeModal();
          this.loadBeds();
        },
        error: (err: any) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Lỗi thêm mới',
            text: err.error?.message || 'Không thể thêm loại giường.',
            confirmButtonText: 'Đóng'
          });
        }
      });
    }
  }

  toggleStatus(bed: any) {
    const newStatus = bed.status == 1 ? 0 : 1;
    const statusText = newStatus == 1 ? 'Kích hoạt' : 'Tạm ẩn';

    Swal.fire({
      title: `${statusText} loại giường?`,
      html: `Bạn có muốn đổi trạng thái của <strong>"${bed.name}"</strong> sang <strong>${statusText}</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus == 1 ? '#10b981' : '#64748b',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: `<i class="bi ${newStatus == 1 ? 'bi-check-circle-fill' : 'bi-eye-slash-fill'} me-1"></i> ${statusText}`,
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.updateBedType(bed.id, { name: bed.name, status: newStatus }).subscribe({
          next: () => {
            bed.status = newStatus;
            this.applyFilter();
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: `Đã ${statusText.toLowerCase()} loại giường "${bed.name}".`,
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

  deleteBed(bed: any) {
    const linkedCount = Number(bed.room_types_count) || 0;

    if (linkedCount > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Không thể xóa!',
        html: `Loại giường <strong>"${bed.name}"</strong> hiện đang được liên kết với <strong>${linkedCount}</strong> hạng phòng trong hệ thống.<br>` +
          `<small class="text-muted mt-2 d-block">Vui lòng thay đổi loại giường ở các hạng phòng này trước khi thực hiện xóa.</small>`,
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    Swal.fire({
      title: 'Xóa loại giường này?',
      html: `Bạn có chắc chắn muốn xóa vĩnh viễn loại giường <strong>"${bed.name}"</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i> Xóa Loại Giường',
      cancelButtonText: 'Hủy Bỏ'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deleteBedType(bed.id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Đã xóa!',
              text: res.message || 'Xóa loại giường thành công!',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadBeds();
          },
          error: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Lỗi xóa',
              text: err.error?.message || 'Không thể xóa loại giường này.',
              confirmButtonText: 'Đóng'
            });
          }
        });
      }
    });
  }
}