import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PartnerService } from '../../../services/partner.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-inventory.html',
  styleUrls: ['./partner-inventory.css']
})
export class PartnerInventoryComponent implements OnInit {
  headers: any[] = [];
  gridData: any[] = [];
  isLoading = true;

  // Dải ngày hiển thị
  startDate: string = '';
  endDate: string = '';
  minDate: string = '';
  selectedPreset: number = 7; // 7 | 14 | 30

  // Modal Cập nhật nhanh số lượng lớn (Bulk)
  showBulkModal = false;
  bulkForm = {
    room_type_ids: [] as number[],
    start_date: '',
    end_date: '',
    update_type: 'fixed' as 'fixed' | 'percent' | 'reset',
    price_value: 0,
    change_status: false,
    is_closed: false,
    change_allotment: false,
    allotment_value: 0
  };

  // Modal Sửa nhanh cho 1 ô duy nhất (Single Cell Quick Edit)
  showCellModal = false;
  Math = Math;
  cellForm = {
    room_type_id: 0,
    room_type_name: '',
    date: '',
    day_label: '',
    day_name: '',
    price: 0,
    base_price: 0,
    available_allotment: 0,
    total_rooms: 0,
    is_closed: false,
    change_allotment: false
  };

  adjustPricePercent(percent: number) {
    const base = Number(this.cellForm.base_price) || 0;
    this.cellForm.price = Math.round(base * (1 + percent / 100));
  }

  constructor(
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef
  ) {
    const today = new Date();
    this.minDate = this.formatDate(today);
    this.startDate = this.minDate;
    
    const targetEnd = new Date();
    targetEnd.setDate(today.getDate() + 6); // Mặc định 7 ngày (hôm nay + 6 ngày)
    this.endDate = this.formatDate(targetEnd);
  }

  ngOnInit(): void {
    this.loadInventory();
  }

  // --- STATS COMPUTED GETTERS ---
  get totalRoomTypes(): number {
    return this.gridData.length;
  }

  get activeRoomTypesCount(): number {
    return this.gridData.filter(r => Number(r.status) === 1).length;
  }

  get inactiveRoomTypesCount(): number {
    return this.gridData.filter(r => Number(r.status) === 0).length;
  }

  get totalPhysicalRooms(): number {
    return this.gridData.reduce((acc, r) => acc + (Number(r.total_physical_rooms) || 0), 0);
  }

  get totalDays(): number {
    return this.headers.length;
  }

  get totalWeekendDays(): number {
    return this.headers.filter(h => h.is_weekend).length;
  }

  // --- LOAD INVENTORY DATA ---
  loadInventory() {
    this.isLoading = true;
    this.partnerService.getRoomInventory(this.startDate, this.endDate).subscribe({
      next: (res: any) => {
        this.headers = res.headers || [];
        this.gridData = res.grid || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Lỗi nạp dữ liệu',
          text: 'Không thể tải dữ liệu lịch giá và tồn kho phòng từ máy chủ!'
        });
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- DATE CONTROLS & PRESETS ---
  formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  setPresetDays(days: number) {
    this.selectedPreset = days;
    const start = new Date(this.startDate || new Date());
    const end = new Date(start);
    end.setDate(start.getDate() + (days - 1));
    this.endDate = this.formatDate(end);
    this.loadInventory();
  }

  shiftDays(days: number) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    start.setDate(start.getDate() + days);
    end.setDate(end.getDate() + days);
    this.startDate = this.formatDate(start);
    this.endDate = this.formatDate(end);
    this.loadInventory();
  }

  goToToday() {
    const today = new Date();
    this.startDate = this.formatDate(today);
    const targetEnd = new Date();
    targetEnd.setDate(today.getDate() + (this.selectedPreset - 1));
    this.endDate = this.formatDate(targetEnd);
    this.loadInventory();
  }

  // --- SINGLE CELL QUICK EDIT MODAL ---
  openCellModal(row: any, day: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    const header = this.headers.find(h => h.date_string === day.date);

    this.cellForm = {
      room_type_id: row.room_type_id,
      room_type_name: row.room_type_name,
      date: day.date,
      day_label: header ? header.day_label : day.date,
      day_name: header ? header.day_name : '',
      price: Math.round(Number(day.price) || Number(row.base_price)),
      base_price: Math.round(Number(row.base_price)),
      available_allotment: Number(day.available_allotment) || 0,
      total_rooms: Number(day.total_rooms) || Number(row.total_physical_rooms) || 0,
      is_closed: Number(day.is_closed) === 1,
      change_allotment: false
    };
    this.showCellModal = true;
  }

  closeCellModal() {
    this.showCellModal = false;
  }

  saveCellEdit() {
    if (this.cellForm.price < 0) {
      Swal.fire('Lỗi', 'Giá phòng không được nhỏ hơn 0đ', 'warning');
      return;
    }

    const payload: any = {
      room_type_ids: [this.cellForm.room_type_id],
      start_date: this.cellForm.date,
      end_date: this.cellForm.date,
      update_type: 'fixed',
      price_value: this.cellForm.price,
      change_status: true,
      is_closed: this.cellForm.is_closed,
      change_allotment: this.cellForm.change_allotment,
      allotment_value: this.cellForm.available_allotment
    };

    Swal.fire({
      title: 'Đang cập nhật...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.partnerService.updateBulkInventory(payload).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Cập nhật thành công!',
          text: `Đã cập nhật ngày ${this.cellForm.day_label} cho ${this.cleanRoomName(this.cellForm.room_type_name)}`,
          timer: 1500,
          showConfirmButton: false
        });
        this.closeCellModal();
        this.loadInventory();
      },
      error: (err) => {
        Swal.fire('Lỗi', err.error?.message || 'Có lỗi xảy ra khi cập nhật', 'error');
      }
    });
  }

  resetCellToBasePrice() {
    Swal.fire({
      title: 'Khôi phục giá gốc?',
      text: `Đưa giá ngày ${this.cellForm.day_label} về mức giá cơ bản (${this.formatPrice(this.cellForm.base_price)})?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Khôi phục',
      cancelButtonText: 'Hủy'
    }).then((res) => {
      if (res.isConfirmed) {
        const payload: any = {
          room_type_ids: [this.cellForm.room_type_id],
          start_date: this.cellForm.date,
          end_date: this.cellForm.date,
          update_type: 'reset',
          change_status: false,
          is_closed: false
        };

        this.partnerService.updateBulkInventory(payload).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Đã khôi phục giá gốc!',
              timer: 1300,
              showConfirmButton: false
            });
            this.closeCellModal();
            this.loadInventory();
          },
          error: (err) => Swal.fire('Lỗi', err.error?.message || 'Thao tác thất bại', 'error')
        });
      }
    });
  }

  // --- QUICK TOGGLE 1-CLICK CLOSE/OPEN ---
  quickToggleClose(roomTypeId: number, dateStr: string, currentStatus: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    const isNowClosing = currentStatus !== 1;
    const payload = {
      room_type_ids: [roomTypeId],
      start_date: dateStr,
      end_date: dateStr,
      update_type: 'none',
      change_status: true,
      is_closed: isNowClosing
    };

    this.partnerService.updateBulkInventory(payload).subscribe({
      next: () => {
        this.loadInventory();
      },
      error: (err) => Swal.fire('Lỗi', err.error?.message || 'Thao tác thất bại', 'error')
    });
  }

  // --- BULK MODAL CONTROLS ---
  openBulkModal() {
    this.bulkForm = {
      room_type_ids: this.gridData.map(r => r.room_type_id),
      start_date: this.startDate,
      end_date: this.endDate,
      update_type: 'fixed',
      price_value: 0,
      change_status: false,
      is_closed: false,
      change_allotment: false,
      allotment_value: 0
    };
    this.showBulkModal = true;
  }

  selectAllRoomTypes() {
    this.bulkForm.room_type_ids = this.gridData.map(r => r.room_type_id);
  }

  deselectAllRoomTypes() {
    this.bulkForm.room_type_ids = [];
  }

  toggleRoomTypeSelection(id: number) {
    if (this.bulkForm.room_type_ids.includes(id)) {
      this.bulkForm.room_type_ids = this.bulkForm.room_type_ids.filter(x => x !== id);
    } else {
      this.bulkForm.room_type_ids.push(id);
    }
  }

  saveBulkUpdate() {
    if (this.bulkForm.room_type_ids.length === 0) {
      Swal.fire('Cảnh báo', 'Vui lòng chọn ít nhất một loại phòng', 'warning');
      return;
    }

    if (this.bulkForm.update_type === 'fixed' && this.bulkForm.price_value < 0) {
      Swal.fire('Cảnh báo', 'Mức giá cố định không được âm', 'warning');
      return;
    }

    const payload: any = {
      room_type_ids: this.bulkForm.room_type_ids,
      start_date: this.bulkForm.start_date,
      end_date: this.bulkForm.end_date,
      update_type: this.bulkForm.update_type,
      change_status: this.bulkForm.change_status,
      is_closed: this.bulkForm.is_closed,
      change_allotment: this.bulkForm.change_allotment,
      allotment_value: this.bulkForm.allotment_value
    };

    if (this.bulkForm.update_type !== 'reset') {
      payload.price_value = this.bulkForm.price_value;
    }

    Swal.fire({
      title: 'Đang lưu cấu hình lịch...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.partnerService.updateBulkInventory(payload).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: 'Cấu hình lịch phòng được lưu thành công!',
          timer: 1500,
          showConfirmButton: false
        });
        this.showBulkModal = false;
        this.loadInventory();
      },
      error: (err) => Swal.fire('Thất bại', err.error?.message || 'Có lỗi xảy ra', 'error')
    });
  }

  // --- HELPERS ---
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(price || 0)) + ' đ';
  }

  scrollTable(direction: 'left' | 'right') {
    const el = document.querySelector('.matrix-scroll-container') as HTMLElement;
    if (el) {
      const scrollOffset = direction === 'left' ? -380 : 380;
      el.scrollBy({ left: scrollOffset, behavior: 'smooth' });
    }
  }

  cleanRoomName(name: string): string {
    if (!name) return '';
    let cleaned = name.replace(/[-\s]*Sunrise.*$/i, '').trim();
    cleaned = cleaned.split(/\s*[-–]\s*/)[0];
    return cleaned.trim() || name;
  }

  toggleRoomTypeActive(row: any, event?: Event) {
    if (event) event.stopPropagation();
    const isCurrentlyActive = Number(row.status) === 1;
    const cleanName = this.cleanRoomName(row.room_type_name);
    const title = isCurrentlyActive 
      ? `Tạm ngưng mở bán "${cleanName}"?` 
      : `Mở bán lại "${cleanName}"?`;
    const text = isCurrentlyActive 
      ? 'Hạng phòng này sẽ tạm ngưng hiển thị cho khách đặt phòng trên website.' 
      : 'Hạng phòng này sẽ được kích hoạt mở bán trở lại trên website cho khách hàng đặt phòng.';
    const confirmText = isCurrentlyActive ? 'Tạm ngưng bán' : 'Mở bán ngay';
    const confirmColor = isCurrentlyActive ? '#ef4444' : '#10b981';

    Swal.fire({
      title,
      text,
      icon: isCurrentlyActive ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#94a3b8',
      confirmButtonText: confirmText,
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Đang xử lý...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        this.partnerService.deleteRoomType(row.room_type_id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: res.message || 'Cập nhật trạng thái hạng phòng thành công!',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadInventory();
          },
          error: (err: any) => {
            Swal.fire('Thất bại', err.error?.message || 'Có lỗi xảy ra khi cập nhật trạng thái!', 'error');
          }
        });
      }
    });
  }
} 
