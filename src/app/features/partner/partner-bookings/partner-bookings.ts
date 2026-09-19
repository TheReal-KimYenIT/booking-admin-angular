import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';

import { BookingService } from '../../../services/booking.service';
import { PartnerService } from '../../../services/partner.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './partner-bookings.html',
  styleUrl: './partner-bookings.css'
})
export class PartnerBookingsComponent implements OnInit {
  allBookings: any[] = [];
  filteredBookings: any[] = [];
  pagedBookings: any[] = [];

  // Bộ lọc
  searchTerm: string = '';
  statusFilter: string = ''; // '' = Tất cả, '1' = Đã XN, '2' = Đang ở, '3' = Đã đi, '4' = Hủy/NoShow
  selectedRoomTypeId: string = ''; // '' = Tất cả loại phòng

  // Danh sách loại phòng phục vụ bộ lọc
  availableRoomTypes: any[] = [];

  // Phân trang
  currentPage: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [10, 15, 25, 50];

  constructor(
    private bookingService: BookingService,
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    Swal.fire({ title: 'Đang tải...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    // Tải danh sách loại phòng của khách sạn để đưa vào bộ lọc
    this.partnerService.getRoomTypes().subscribe({
      next: (typesRes: any) => {
        const types = typesRes.room_types || typesRes.data || [];
        this.availableRoomTypes = types.map((t: any) => ({
          id: t.id,
          name: t.name ? t.name.split(' - ')[0] : 'Phòng'
        }));
        this.loadBookings();
      },
      error: () => {
        this.loadBookings();
      }
    });
  }

  loadBookings() {
    this.bookingService.getBookings().subscribe({
      next: (res: any) => {
        // Loại bỏ các đơn hàng đang chờ thanh toán cọc (status = 0)
        const rawBookings = res.bookings || res.data || [];
        this.allBookings = rawBookings.filter((bk: any) => bk.status !== 0);

        // Trích xuất thêm các loại phòng từ đơn hàng nếu chưa có trong availableRoomTypes
        this.extractAdditionalRoomTypes();

        this.applyFilters();
        Swal.close();
      },
      error: (err: any) => {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể tải danh sách đơn đặt phòng!' });
      }
    });
  }

  // Tự động bổ sung các loại phòng từ dữ liệu đơn hàng
  extractAdditionalRoomTypes() {
    const map = new Map<number, string>();
    for (const rt of this.availableRoomTypes) {
      map.set(rt.id, rt.name);
    }

    for (const bk of this.allBookings) {
      if (bk.details) {
        for (const d of bk.details) {
          const typeId = d.room_type_id || d.room_type?.id;
          if (typeId && !map.has(typeId)) {
            const rawName = d.room_type?.name || `Loại phòng #${typeId}`;
            map.set(typeId, rawName.split(' - ')[0]);
          }
        }
      }
    }

    this.availableRoomTypes = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }

  // Số lượng đơn theo từng loại phòng
  getCountByRoomType(roomTypeId: number): number {
    return this.allBookings.filter(bk => 
      bk.details && bk.details.some((d: any) => 
        (d.room_type_id == roomTypeId) || (d.room_type && d.room_type.id == roomTypeId)
      )
    ).length;
  }

  // Danh sách đơn cơ sở để đếm số lượng cho Tab (phản ánh theo loại phòng đang chọn)
  get baseBookingsForTabs(): any[] {
    if (!this.selectedRoomTypeId) {
      return this.allBookings;
    }
    return this.allBookings.filter(bk => 
      bk.details && bk.details.some((d: any) => 
        (d.room_type_id == this.selectedRoomTypeId) || (d.room_type && d.room_type.id == this.selectedRoomTypeId)
      )
    );
  }

  // --- GETTER ĐẾM SỐ LƯỢNG CHO TỪNG TAB ---
  get countAll(): number {
    return this.baseBookingsForTabs.length;
  }

  get countCheckinToday(): number {
    const todayStr = this.getTodayStr();
    return this.baseBookingsForTabs.filter(bk => bk.status === 1 && bk.check_in && bk.check_in.substring(0, 10) <= todayStr).length;
  }

  get countCheckoutToday(): number {
    const todayStr = this.getTodayStr();
    return this.baseBookingsForTabs.filter(bk => bk.status === 2 && bk.check_out && bk.check_out.substring(0, 10) <= todayStr).length;
  }

  get countConfirmed(): number {
    return this.baseBookingsForTabs.filter(bk => bk.status === 1).length;
  }

  get countStaying(): number {
    return this.baseBookingsForTabs.filter(bk => bk.status === 2).length;
  }

  get countCompleted(): number {
    return this.baseBookingsForTabs.filter(bk => bk.status === 3).length;
  }

  get countCancelled(): number {
    return this.baseBookingsForTabs.filter(bk => bk.status === 4 || bk.status === 5).length;
  }

  getTodayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Chuyển Tab trạng thái
  setStatusFilter(status: string) {
    this.statusFilter = status;
    this.applyFilters();
  }

  // Áp dụng bộ lọc (Trạng thái + Loại phòng + Từ khóa tìm kiếm)
  applyFilters() {
    const todayStr = this.getTodayStr();
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredBookings = this.allBookings.filter(bk => {
      // 1. Lọc theo trạng thái Tab
      let matchStatus = false;
      if (this.statusFilter === '') {
        matchStatus = true;
      } else if (this.statusFilter === '4') {
        matchStatus = (bk.status === 4 || bk.status === 5);
      } else if (this.statusFilter === 'checkin_today') {
        matchStatus = bk.status === 1 && bk.check_in && bk.check_in.substring(0, 10) <= todayStr;
      } else if (this.statusFilter === 'checkout_today') {
        matchStatus = bk.status === 2 && bk.check_out && bk.check_out.substring(0, 10) <= todayStr;
      } else {
        matchStatus = bk.status.toString() === this.statusFilter;
      }

      if (!matchStatus) return false;

      // 2. Lọc theo Loại phòng được chọn
      if (this.selectedRoomTypeId) {
        const matchRoomTypeFilter = bk.details && bk.details.some((d: any) => 
          (d.room_type_id == this.selectedRoomTypeId) || (d.room_type && d.room_type.id == this.selectedRoomTypeId)
        );
        if (!matchRoomTypeFilter) return false;
      }

      // 3. Lọc theo từ khóa tìm kiếm (Mã đơn, Tên khách, SĐT, Số phòng vật lý, Loại phòng)
      if (term === '') return true;

      const matchCode = bk.booking_code && bk.booking_code.toLowerCase().includes(term);
      const matchName = bk.guest_name && bk.guest_name.toLowerCase().includes(term);
      const matchPhone = bk.guest_phone && bk.guest_phone.includes(term);

      const matchRoom = bk.room_assignments && bk.room_assignments.some((ra: any) => {
        const roomName = (ra.room?.room_name || ra.room?.name || '').toLowerCase();
        return roomName.includes(term) || `p.${roomName}`.includes(term);
      });

      const matchRoomType = bk.details && bk.details.some((d: any) => {
        const typeName = (d.room_type?.name || '').toLowerCase();
        return typeName.includes(term);
      });

      return matchCode || matchName || matchPhone || matchRoom || matchRoomType;
    });

    this.currentPage = 1;
    this.updatePagedBookings();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilters();
  }

  resetRoomTypeFilter() {
    this.selectedRoomTypeId = '';
    this.applyFilters();
  }

  resetAllFilters() {
    this.searchTerm = '';
    this.selectedRoomTypeId = '';
    this.statusFilter = '';
    this.applyFilters();
  }

  // --- PHÂN TRANG CLIENT-SIDE ---
  updatePagedBookings() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.pagedBookings = this.filteredBookings.slice(startIndex, startIndex + this.pageSize);
    this.cdr.detectChanges();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredBookings.length / this.pageSize) || 1;
  }

  get pagesArray(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: number[] = [];

    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.updatePagedBookings();
  }

  onPageSizeChange(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPage = 1;
    this.updatePagedBookings();
  }

  get startIndexDisplay(): number {
    if (this.filteredBookings.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndexDisplay(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredBookings.length);
  }

  // --- HÀM HỖ TRỢ HIỂN THỊ DỮ LIỆU ---

  // Kiểm tra đơn đã xác nhận nhưng chưa gán phòng
  hasUnassignedRooms(booking: any): boolean {
    if (booking.status !== 1) return false;
    const assignments = booking.room_assignments || booking.roomAssignments;
    return !assignments || assignments.length === 0;
  }

  // Hiển thị số phòng vật lý
  getAssignedRooms(booking: any): string {
    if (booking.status === 0 || booking.status === 4 || booking.status === 5) {
      return '-';
    }
    const assignments = booking.room_assignments || booking.roomAssignments;
    if (assignments && assignments.length > 0) {
      return assignments.map((ra: any) => 'P.' + (ra.room?.room_name || ra.room?.name)).join(', ');
    }
    return 'Chờ xếp phòng';
  }

  // Hiển thị tóm tắt loại phòng và số lượng phòng (Dùng dấu · thay vì ngoặc đôi)
  getRoomTypeSummary(booking: any): string {
    if (!booking.details || booking.details.length === 0) return '---';
    const totalRooms = booking.details.reduce((sum: number, d: any) => sum + (d.rooms_count || 1), 0);
    const firstType = booking.details[0]?.room_type?.name || 'Phòng';
    const cleanTypeName = firstType.split(' - ')[0];

    if (booking.details.length === 1) {
      return `${cleanTypeName} · ${totalRooms} phòng`;
    } else {
      return `${cleanTypeName} + ${booking.details.length - 1} loại khác · ${totalRooms} phòng`;
    }
  }

  // Tính số đêm lưu trú
  getNightsCount(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) return 1;
    const d1 = new Date(checkIn.substring(0, 10));
    const d2 = new Date(checkOut.substring(0, 10));
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }

  formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '---';
    const parts = dateStr.substring(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  // Text hiển thị trạng thái
  getStatusText(status: number): string {
    switch(status) {
      case 0: return 'Chờ thanh toán cọc';
      case 1: return 'Đã xác nhận';
      case 2: return 'Đang lưu trú';
      case 3: return 'Đã trả phòng';
      case 4: return 'Đã hủy';
      case 5: return 'No-show';
      default: return 'Không xác định';
    }
  }

  // CSS Class cho Status Badge
  getStatusBadgeClass(status: number): string {
    switch(status) {
      case 1: return 'badge-confirmed';
      case 2: return 'badge-staying';
      case 3: return 'badge-completed';
      case 4: return 'badge-cancelled';
      case 5: return 'badge-noshow';
      default: return 'badge-default';
    }
  }

  // Cảnh báo quá hạn Check-in
  isOverdue(booking: any): boolean {
    if (booking.status !== 1) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(booking.check_in);
    checkInDate.setHours(0, 0, 0, 0);
    return checkInDate < today;
  }

  // Cảnh báo quá hạn Check-out
  isOverdueCheckout(booking: any): boolean {
    if (booking.status !== 2) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkOutDate = new Date(booking.check_out);
    checkOutDate.setHours(0, 0, 0, 0);
    return checkOutDate < today;
  }

  // --- XUẤT EXCEL ---
  exportToExcel() {
    if (!this.filteredBookings || this.filteredBookings.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Thông báo', text: 'Không có dữ liệu đơn đặt phòng để xuất file!' });
      return;
    }

    const exportData = this.filteredBookings.map((bk: any, index: number) => {
      return {
        'STT': index + 1,
        'Mã đặt phòng': bk.booking_code || ('#' + bk.id),
        'Tên khách hàng': bk.guest_name || 'Khách vãng lai',
        'Số điện thoại': bk.guest_phone || '---',
        'Loại phòng': this.getRoomTypeSummary(bk),
        'Phòng vật lý': this.getAssignedRooms(bk),
        'Ngày nhận phòng': this.formatDateDisplay(bk.check_in),
        'Ngày trả phòng': this.formatDateDisplay(bk.check_out),
        'Số đêm': this.getNightsCount(bk.check_in, bk.check_out),
        'Tổng tiền (VNĐ)': Number(bk.total_amount || 0),
        'Trạng thái': this.getStatusText(bk.status)
      };
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = { Sheets: { 'DanhSachDatPhong': worksheet }, SheetNames: ['DanhSachDatPhong'] };
    XLSX.writeFile(workbook, `Danh_Sach_Dat_Phong_${this.getTodayStr()}.xlsx`);
  }
}