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
export class PartnerRoomMatrixComponent implements OnInit {
  headers: any[] = [];
  matrixGrid: any[] = []; // Dữ liệu gốc 100% từ server
  
  // 👉 THÊM MỚI: Các biến phục vụ việc Lọc (Filter)
  filteredMatrixGrid: any[] = []; // Dữ liệu đã qua màng lọc để in ra HTML
  uniqueRoomTypes: string[] = []; // Danh sách tên Hạng phòng để đưa vào Dropdown
  selectedRoomType: string = '';  // Giá trị hạng phòng đang chọn
  selectedStatus: string = '';    // Giá trị trạng thái đang chọn

  isLoading = true;
  startDate: string = '';
  endDate: string = '';

  constructor(
    private bookingService: BookingService,
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    const today = new Date();
    this.startDate = today.toISOString().split('T')[0];
    const targetEnd = new Date();
    targetEnd.setDate(today.getDate() + 14);
    this.endDate = targetEnd.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadMatrix();
  }

  loadMatrix() {
    this.isLoading = true;
    this.bookingService.getRoomMatrixGrid(this.startDate, this.endDate).subscribe({
      next: (res: any) => {
        this.headers = res.headers;
        this.matrixGrid = res.matrix;
        
        // 👉 Lọc ra danh sách Hạng phòng không trùng lặp từ dữ liệu trả về
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

  // 👉 THÊM MỚI: Hàm xử lý Bộ Lọc
  applyFilters() {
    this.filteredMatrixGrid = this.matrixGrid.filter(row => {
      // Điều kiện 1: Lọc theo hạng phòng
      const matchType = this.selectedRoomType === '' || row.room_type_name === this.selectedRoomType;
      
      // Điều kiện 2: Lọc theo trạng thái phòng hiện tại
      const matchStatus = this.selectedStatus === '' || row.current_status.toString() === this.selectedStatus;
      
      return matchType && matchStatus;
    });
  }

  shiftDays(days: number) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    start.setDate(start.getDate() + days);
    end.setDate(end.getDate() + days);
    this.startDate = start.toISOString().split('T')[0];
    this.endDate = end.toISOString().split('T')[0];
    this.loadMatrix();
  }

  goToToday() {
    const today = new Date();
    this.startDate = today.toISOString().split('T')[0];
    const targetEnd = new Date();
    targetEnd.setDate(today.getDate() + 14);
    this.endDate = targetEnd.toISOString().split('T')[0];
    this.loadMatrix();
  }

  viewBookingDetail(bookingId: number) {
    if (bookingId) {
      this.router.navigate(['/dashboard/bookings', bookingId]);
    }
  }

  getRoomStatusLabel(status: number): string {
    switch (status) {
      case 0: return '🧹 Cần dọn';
      case 1: return '🟢 Trống';
      case 2: return '🛌 Có khách';
      case 3: return '🛠️ Bảo trì';
      default: return '---';
    }
  }

  updatePhysicalRoomStatus(roomId: number, newStatus: number) {
    if (!roomId) return;
    Swal.fire({
      title: 'Đang cập nhật...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    this.partnerService.updateRoom(roomId, { status: newStatus }).subscribe({
      next: (res: any) => {
        Swal.fire({ icon: 'success', title: 'Thành công!', showConfirmButton: false, timer: 1000 });
        this.loadMatrix();
      },
      error: (err: any) => {
        Swal.fire({ icon: 'error', title: 'Thất bại', text: err.error?.message });
        this.loadMatrix(); 
      }
    });
  }
}