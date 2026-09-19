import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { BookingService } from '../../../services/booking.service';
import { PartnerService } from '../../../services/partner.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-room-matrix',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './partner-room-matrix.html',
  styleUrls: ['./partner-room-matrix.css']
})
// Sơ đồ lưới trạng thái phòng theo thời gian thực cho partner
export class PartnerRoomMatrixComponent implements OnInit {
  headers: any[] = [];
  matrixGrid: any[] = []; // Dữ liệu gốc 100% từ server
  
  // Các biến phục vụ việc Lọc (Filter)
  filteredMatrixGrid: any[] = []; // Dữ liệu đã qua màng lọc để in ra HTML
  uniqueRoomTypes: string[] = []; // Danh sách tên Hạng phòng để đưa vào Dropdown
  selectedRoomType: string = '';  // Giá trị hạng phòng đang chọn
  selectedStatus: string = '';    // Giá trị trạng thái đang chọn

  // Thống kê trạng thái buồng phòng thời gian thực
  stats = {
    total: 0,
    ready: 0,
    occupied: 0,
    cleaning: 0,
    maintenance: 0
  };

  isLoading = true;
  startDate: string = '';
  endDate: string = '';

  constructor(
    private bookingService: BookingService,
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.setDatesToCurrentWeek();
  }

  formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getTodayStr(): string {
    return this.formatDate(new Date());
  }

  isToday(dateStr: string): boolean {
    return dateStr === this.getTodayStr();
  }

  setDatesToCurrentWeek() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(diff);
    this.startDate = this.formatDate(startOfWeek);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    this.endDate = this.formatDate(endOfWeek);
  }

  // Tải dữ liệu sơ đồ phòng khi vào màn hình
  ngOnInit(): void {
    this.loadMatrix();
  }

  // Gọi API để lấy ma trận trạng thái phòng theo dải ngày
  loadMatrix() {
    this.isLoading = true;
    this.bookingService.getRoomMatrixGrid(this.startDate, this.endDate).subscribe({
      next: (res: any) => {
        this.headers = res.headers || [];
        this.matrixGrid = res.matrix || [];
        if (res.stats) {
          this.stats = res.stats;
        }
        
        // Lọc ra danh sách Hạng phòng không trùng lặp từ dữ liệu trả về
        this.uniqueRoomTypes = [...new Set(this.matrixGrid.map(item => item.room_type_name))];
        
        // Gán dữ liệu lọc ban đầu
        this.applyFilters();
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        Swal.fire('Lỗi', 'Không thể tải sơ đồ lưới điều phối phòng!', 'error');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Lọc dữ liệu theo hạng phòng và trạng thái phòng
  applyFilters() {
    this.filteredMatrixGrid = this.matrixGrid.filter(row => {
      // Điều kiện 1: Lọc theo hạng phòng
      const matchType = this.selectedRoomType === '' || row.room_type_name === this.selectedRoomType;
      
      // Điều kiện 2: Lọc theo trạng thái phòng hiện tại
      const matchStatus = this.selectedStatus === '' || row.current_status.toString() === this.selectedStatus;
      
      return matchType && matchStatus;
    });
  }

  // Lọc nhanh bằng cách bấm vào các thẻ thống kê KPI
  quickFilterStatus(statusVal: string) {
    if (this.selectedStatus === statusVal) {
      this.selectedStatus = ''; // Bấm lại lần nữa để hủy lọc
    } else {
      this.selectedStatus = statusVal;
    }
    this.applyFilters();
  }

  // Xóa toàn bộ bộ lọc hạng phòng và trạng thái
  resetFilters() {
    this.selectedRoomType = '';
    this.selectedStatus = '';
    this.applyFilters();
  }

  onDateChange() {
    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      this.endDate = this.startDate;
    }
    this.loadMatrix();
  }

  // Dời dải ngày hiển thị về trước hoặc sau một khoảng thời gian
  shiftDays(days: number) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    start.setDate(start.getDate() + days);
    end.setDate(end.getDate() + days);
    this.startDate = this.formatDate(start);
    this.endDate = this.formatDate(end);
    this.loadMatrix();
  }

  // Quay lại dải ngày hiện tại của tuần này
  goToToday() {
    this.setDatesToCurrentWeek();
    this.loadMatrix();
  }

  // Điều hướng sang trang chi tiết booking tương ứng
  viewBookingDetail(bookingId: number) {
    if (bookingId) {
      this.router.navigate(['/dashboard/bookings', bookingId]);
    }
  }

  getRoomStatusLabel(status: number): string {
    switch (status) {
      case 0: return 'Cần dọn dẹp';
      case 1: return 'Sẵn sàng (Trống)';
      case 2: return 'Đang có khách';
      case 3: return 'Đang bảo trì';
      default: return '---';
    }
  }

  // Cập nhật trạng thái phòng vật lý như dọn phòng, bảo trì, có khách
  updatePhysicalRoomStatus(roomId: number, newStatus: number, oldStatus: number) {
    if (!roomId) return;

    if (oldStatus === 2 && newStatus !== 2) {
      Swal.fire({
        title: 'Xác nhận thay đổi?',
        text: 'Phòng này đang ghi nhận có khách lưu trú. Bạn có chắc chắn muốn chuyển đổi trạng thái phòng không?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy'
      }).then((result) => {
        if (result.isConfirmed) {
          this.doUpdateRoomStatus(roomId, newStatus);
        } else {
          this.loadMatrix();
        }
      });
      return;
    }

    this.doUpdateRoomStatus(roomId, newStatus);
  }

  private doUpdateRoomStatus(roomId: number, newStatus: number) {
    Swal.fire({
      title: 'Đang cập nhật...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    this.partnerService.updateRoom(roomId, { status: newStatus }).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Thành công!', showConfirmButton: false, timer: 1000 });
        this.loadMatrix();
      },
      error: (err: any) => {
        Swal.fire({ icon: 'error', title: 'Thất bại', text: err.error?.message || 'Không thể cập nhật trạng thái phòng' });
        this.loadMatrix(); 
      }
    });
  }
}