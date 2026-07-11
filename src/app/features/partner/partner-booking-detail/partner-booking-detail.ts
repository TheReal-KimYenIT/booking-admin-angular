import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BookingService } from '../../../services/booking.service';
import { PartnerService } from '../../../services/partner.service'; 
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-booking-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './partner-booking-detail.html',
  styleUrl: './partner-booking-detail.css'
})
export class PartnerBookingDetailComponent implements OnInit {
  bookingId: number = 0;
  booking: any = null;
  activeTab: 'checkin' | 'services' | 'checkout' = 'checkin';
  selectedPaymentMethod: number = 1; 
  isEditingGuests: boolean = false;
  editingGuests: any[] = [];        

  availableRooms: any[] = [];
  selectedRoomIds: number[] = [];
  guests: any[] = [];
constructor(
    private route: ActivatedRoute,
    private bookingService: BookingService,
    private cdr: ChangeDetectorRef,
    private partnerService: PartnerService,
    private http: HttpClient 
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.bookingId = Number(params.get('id'));
      if (this.bookingId) {
        this.loadBookingDetail();
        this.loadSurchargeCategories(); 
        this.loadSupplies();
        this.loadMenuAndCart();
      }
    });
  }

  loadBookingDetail() {
    this.bookingService.getBookingDetail(this.bookingId).subscribe({
      next: (res: any) => {
        this.booking = res.booking;
        
        const servicesList = this.booking.booking_services || this.booking.bookingServices || [];
        this.cartServices = servicesList.filter((item: any) => item.service?.type == 1);
        this.cartMinibars = servicesList.filter((item: any) => item.service?.type == 2);

        if (this.guests.length === 0) {
          this.guests.push({ full_name: this.booking.guest_name, identity_number: '' });
        }
        
        if (this.booking.status === 0 || this.booking.status === 1) {
           this.loadAvailableRooms();
        }

        this.calculateNights(); 
        this.calculateCartTotal(); 
        
        this.cdr.detectChanges();
      },
      error: (err: any) => Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Lỗi tải dữ liệu đơn hàng!', confirmButtonText: 'Đóng' })
    });
  }

  loadAvailableRooms() {
    this.bookingService.getAvailableRooms(this.bookingId).subscribe({
      next: (res: any) => {
        this.availableRooms = res.rooms || [];
        this.cdr.detectChanges();
      }
    });
  }

  enableEditGuests() {
    this.isEditingGuests = true;
    this.editingGuests = JSON.parse(JSON.stringify(this.booking?.guests || []));
    if (this.editingGuests.length === 0) this.addEditingGuest();
  }

  addEditingGuest() { this.editingGuests.push({ full_name: '', identity_number: '' }); }
  removeEditingGuest(index: number) { this.editingGuests.splice(index, 1); }
  cancelEditGuests() { this.isEditingGuests = false; }

  saveGuests() {
    const validGuests = this.editingGuests.filter(g => g.full_name && g.full_name.trim() !== '');
    this.bookingService.updateGuests(this.bookingId, { guests: validGuests }).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Cập nhật danh sách khách thành công!', showConfirmButton: false, timer: 1500 });
        this.isEditingGuests = false;
        this.loadBookingDetail();
      }
    });
  }  

  toggleRoomSelection(roomId: number) {
    const index = this.selectedRoomIds.indexOf(roomId);
    if (index > -1) {
      this.selectedRoomIds.splice(index, 1);
    } else {
      this.selectedRoomIds.push(roomId);
    }
  }

  addGuest() { this.guests.push({ full_name: '', identity_number: '' }); }
  removeGuest(index: number) { this.guests.splice(index, 1); }

  processCheckIn() {
    const requiredRooms = this.booking?.details?.[0]?.rooms_count || 1;
    if (this.selectedRoomIds.length !== requiredRooms) {
      Swal.fire({ icon: 'warning', title: 'Cảnh báo', text: `Khách đặt ${requiredRooms} phòng. Vui lòng chọn đủ số lượng!`, confirmButtonText: 'Đóng' });
      return;
    }

    const payload = {
      room_ids: this.selectedRoomIds,
      guests: this.guests.filter(g => g.full_name.trim() !== '')
    };

    Swal.fire({
      title: 'Xác nhận?', text: 'Xác nhận hoàn tất thủ tục Check-in?', icon: 'question',
      showCancelButton: true, confirmButtonColor: '#3b82f6', cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bookingService.submitCheckIn(this.bookingId, payload).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Check-in thành công!', showConfirmButton: false, timer: 1500 });
            this.loadBookingDetail();
          }
        });
      }
    });
  }

  confirmOrder() {
    Swal.fire({
      title: 'Xác nhận đơn hàng?', text: 'Bạn có chắc chắn muốn XÁC NHẬN đơn hàng này?', icon: 'question',
      showCancelButton: true, confirmButtonColor: '#3b82f6', cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Xác nhận', cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bookingService.confirmBooking(this.bookingId).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Đã xác nhận đơn hàng!', showConfirmButton: false, timer: 1500 });
            this.loadBookingDetail();
          }
        });
      }
    });
  }

  cancelOrder() {
    Swal.fire({
      title: 'Hủy đơn hàng?', text: 'Bạn có chắc chắn muốn TỪ CHỐI / HỦY đơn hàng này?', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Vâng, Hủy đơn!', cancelButtonText: 'Đóng'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bookingService.cancelBooking(this.bookingId).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Đã hủy!', text: 'Đã hủy đơn hàng!', showConfirmButton: false, timer: 1500 });
            this.loadBookingDetail();
          }
        });
      }
    });
  }

  changingRoomId: number | null = null;   
  selectedNewRoomId: number | null = null; 

  enableChangeRoom(currentRoomId: number, roomTypeId: number) {
    this.changingRoomId = currentRoomId;
    this.selectedNewRoomId = null;
    this.availableRooms = []; 
    
    this.partnerService.getAvailableRoomsByType(roomTypeId).subscribe({
      next: (res: any) => {
        this.availableRooms = res.data ? res.data : res;
        if (!this.availableRooms || this.availableRooms.length === 0) {
          Swal.fire({ icon: 'info', title: 'Thông báo', text: 'Hiện không có phòng Trống nào thuộc hạng phòng này để đổi!', confirmButtonText: 'Đóng' });
          this.cancelChangeRoom();
          return;
        }
        this.cdr.detectChanges(); 
      }
    });
  }
  cancelChangeRoom() { this.changingRoomId = null; this.selectedNewRoomId = null; }

  saveRoomChange() {
    if (!this.selectedNewRoomId) {
      Swal.fire({ icon: 'warning', title: 'Cảnh báo', text: 'Vui lòng chọn một phòng mới để đổi!', confirmButtonText: 'Đóng' });
      return;
    }

    const payload = { old_room_id: this.changingRoomId, new_room_id: this.selectedNewRoomId };
    this.bookingService.changeRoom(this.bookingId, payload).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Thành công!', text: '🔄 Đổi phòng thành công!', showConfirmButton: false, timer: 1500 });
        this.changingRoomId = null; this.selectedNewRoomId = null;
        this.loadBookingDetail();
      }
    });
  }

  isEditingNotes: boolean = false;
  editingPhone: string = '';
  editingSpecialRequests: string = '';

  enableEditNotes() {
    this.isEditingNotes = true;
    this.editingPhone = this.booking?.guest_phone || '';
    this.editingSpecialRequests = this.booking?.special_requests || '';
  }

  cancelEditNotes() { this.isEditingNotes = false; }

  saveNotes() {
    const payload = { guest_phone: this.editingPhone, special_requests: this.editingSpecialRequests };
    this.bookingService.updateBookingNotes(this.bookingId, payload).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Cập nhật Ghi chú & Liên hệ thành công!', showConfirmButton: false, timer: 1500 });
        this.isEditingNotes = false;
        this.loadBookingDetail();
      }
    });
  }
  
  activeServiceTab: number = 1; 
  menuServices: any[] = [];
  menuMinibars: any[] = [];
  cartServices: any[] = [];
  cartMinibars: any[] = [];
  cartTotal: number = 0;

  switchTab(tab: 'checkin' | 'services' | 'checkout') {
    this.activeTab = tab;
    if (tab === 'services' || tab === 'checkout') {
      this.loadMenuAndCart();
    }  
  }

  loadMenuAndCart() {
    this.bookingService.getMenuAndCart(this.bookingId).subscribe({
      next: (res: any) => {
        this.menuServices = res.menu_services || [];
        this.menuMinibars = res.menu_minibars || [];
        this.cartServices = res.cart_services || [];
        this.cartMinibars = res.cart_minibars || [];
        this.calculateCartTotal();
        this.cdr.detectChanges();
      }
    });
  }

  calculateCartTotal() {
    let total = 0;
    this.cartServices.forEach(item => total += (Number(item.price_at_booking) * item.quantity));
    this.cartMinibars.forEach(item => total += (Number(item.price_at_booking) * item.quantity));
    this.cartTotal = total;
  }

  addToCart(item: any, type: number) {
    const payload = {
      [type === 1 ? 'service_id' : 'minibar_id']: item.id,
      quantity: 1, price: item.price 
    };

    const apiCall = type === 1 
      ? this.bookingService.addService(this.bookingId, payload)
      : this.bookingService.addMinibar(this.bookingId, payload);

    apiCall.subscribe({
      next: () => this.loadMenuAndCart(),
      error: (err: any) => Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Lỗi thêm món: ' + (err.error?.message || 'Không rõ'), confirmButtonText: 'Đóng' })
    });
  }

  isWebPurchasedItem(cartItem: any): boolean {
    if (this.booking?.payment_status !== 1) return false;
    const bookingTime = new Date(this.booking.created_at).getTime();
    const itemTime = new Date(cartItem.created_at).getTime();
    return Math.abs(itemTime - bookingTime) < 120000;
  }

  removeFromCart(cartId: number, cartItem: any) {
    if (this.isWebPurchasedItem(cartItem)) {
      Swal.fire('Cảnh báo', 'Dịch vụ này khách đã mua từ trên web. Không thể hủy để tránh lệch biên lai!', 'warning');
      return;
    }

    Swal.fire({
      title: 'Xóa món?', text: 'Chắc chắn muốn xóa khỏi hóa đơn?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444'
    }).then((res) => {
      if (res.isConfirmed) {
        this.bookingService.removeExtraService(this.bookingId, cartId).subscribe({
          next: () => this.loadMenuAndCart()
        });
      }
    });
  }

  changeQuantity(cartItem: any, change: number) {
    if (change < 0 && this.isWebPurchasedItem(cartItem)) {
      Swal.fire('Cảnh báo', 'Không thể giảm số lượng của dịch vụ đã thanh toán Online!', 'warning');
      return;
    }

    const newQty = cartItem.quantity + change;
    if (newQty <= 0) { this.removeFromCart(cartItem.id, cartItem); return; }
    this.bookingService.updateExtraService(this.bookingId, cartItem.id, { quantity: newQty, note: cartItem.note }).subscribe({
      next: () => this.loadMenuAndCart()
    });
  }

  saveNote(cartItem: any, event: any) {
    if (this.isWebPurchasedItem(cartItem)) return;
    const newNote = event.target.value;
    const payload = { quantity: cartItem.quantity, note: newNote };
    this.bookingService.updateExtraService(this.bookingId, cartItem.id, payload).subscribe({
      next: () => { cartItem.note = newNote; }
    });
  }

  numberOfNights: number = 1;
  availableSupplies: any[] = [];
  supplyForm: any = { supply_id: '', incident_type: 1, quantity: 1, actual_price: 0, note: '' };  
  availableSurcharges: any[] = [];
  surchargeForm: any = { surcharge_category_id: '', amount: '', note: '' };

  // 👉 TÍNH TOÁN LẠI VAT TRỰC TIẾP (LIVE VAT)
  getCurrentVatAmount(): number {
    const room = Number(this.booking?.details?.[0]?.subtotal || 0);
    const srv = Number(this.cartTotal || 0);
    const sur = this.getSurchargeTotal();
    const dmg = this.getDamagedItemsTotal();
    const disc = Number(this.booking?.discount_amount || 0);

    const vatRate = Number(this.booking?.vat_rate ?? 10); // Lấy % VAT đã chốt trong đơn

    // Công thức: (Phòng + Dịch vụ + Phụ thu + Đền bù - Khuyến mãi) * (vat_rate / 100)
    const taxableAmount = Math.max(0, room + srv + sur + dmg - disc);
    return taxableAmount * (vatRate / 100);
  }

  // 👉 TÍNH TỔNG TIỀN DỰA TRÊN LIVE VAT
  getFinalInvoiceTotal(): number {
    const room = Number(this.booking?.details?.[0]?.subtotal || 0);
    const srv = Number(this.cartTotal || 0);
    const sur = this.getSurchargeTotal();
    const dmg = this.getDamagedItemsTotal();
    const disc = Number(this.booking?.discount_amount || 0);
    
    const vat = this.getCurrentVatAmount(); // Lấy Live VAT vừa tính

    return room + srv + sur + dmg + vat - disc;
  }

  getAlreadyPaidAmount(): number {
    return this.booking?.payment_status === 1 ? Number(this.booking?.total_price || 0) : 0;
  }

  getRemainingAmount(): number {
    const rem = this.getFinalInvoiceTotal() - this.getAlreadyPaidAmount();
    return rem > 0 ? rem : 0;
  }

  loadSurchargeCategories() {
    this.partnerService.getSurchargeCategories().subscribe({
      next: (res: any) => {
        this.availableSurcharges = res.data || res || [];
        this.cdr.detectChanges();
      }
    });
  }

  addBookingSurcharge() {
    if (!this.surchargeForm.surcharge_category_id || !this.surchargeForm.amount || this.surchargeForm.amount <= 0) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Vui lòng chọn loại phụ thu và nhập số tiền hợp lệ!', confirmButtonText: 'Đóng' });
      return;
    }

    this.bookingService.addSurcharge(this.bookingId, this.surchargeForm).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Thành công', text: 'Đã thêm khoản phụ thu!', showConfirmButton: false, timer: 1500 });
        this.surchargeForm = { surcharge_category_id: '', amount: '', note: '' }; 
        this.loadBookingDetail(); 
      }
    });
  }

  removeSurcharge(surchargeId: number) {
    Swal.fire({
      title: 'Xóa phụ thu?', text: 'Bạn có chắc chắn muốn xóa khoản phụ thu này khỏi hóa đơn?', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Xóa', cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bookingService.removeSurcharge(this.bookingId, surchargeId).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Đã xóa', text: 'Đã xóa khoản phụ thu.', showConfirmButton: false, timer: 1500 });
            this.loadBookingDetail();
          }
        });
      }
    });
  }

  processCheckOut() {
    Swal.fire({
      title: 'Xác nhận trả phòng?', text: 'Xác nhận khách đã thanh toán đầy đủ và tiến hành trả phòng?', icon: 'question',
      showCancelButton: true, confirmButtonColor: '#3b82f6', cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Thanh toán & Trả phòng', cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        const payload = { payment_method: this.selectedPaymentMethod };
        this.bookingService.checkOutBooking(this.bookingId, payload).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Trả phòng thành công! Cảm ơn bạn.', showConfirmButton: false, timer: 1500 });
            this.loadBookingDetail(); 
          },
          error: (err: any) => Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Lỗi khi trả phòng: ' + (err.error?.message || 'Vui lòng kiểm tra lại.'), confirmButtonText: 'Đóng' })
        });
      }
    });
  }

 isExportingInvoice: boolean = false;

  printInvoice() {
    this.isExportingInvoice = true;
    this.cdr.detectChanges(); // Ép giao diện cập nhật trạng thái "Đang tạo..." lập tức

    const token = localStorage.getItem('partner_token') || '';
    const apiUrl = `http://localhost:8000/api/partner/bookings/${this.bookingId}/export-invoice`;

    Swal.fire({ title: 'Đang tạo Hóa đơn...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    this.http.get(apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Hoa_Don_Folio_${this.booking?.booking_code}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // CẬP NHẬT LẠI TRẠNG THÁI NÚT BẤM
        this.isExportingInvoice = false;
        this.cdr.detectChanges(); 
        Swal.close();
      },
      error: (err: any) => {
        this.isExportingInvoice = false;
        this.cdr.detectChanges(); 
        
        if (err.error instanceof Blob) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            try {
              const errorData = JSON.parse(e.target.result);
              Swal.fire('Lỗi từ hệ thống', errorData.message, 'error');
            } catch {
              Swal.fire('Lỗi', 'Không thể tạo Hóa đơn PDF!', 'error');
            }
          };
          reader.readAsText(err.error);
        } else {
          Swal.fire('Lỗi', 'Không thể tạo Hóa đơn PDF!', 'error');
        }
      }
    });
  }

  calculateNights() {
    if (!this.booking?.check_in || !this.booking?.check_out) {
      this.numberOfNights = 1; return;
    }
    const start = new Date(this.booking.check_in).getTime();
    const end = new Date(this.booking.check_out).getTime();
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    this.numberOfNights = diffDays > 0 ? diffDays : 1; 
  }
  
  getSurchargeTotal(): number {
    if (!this.booking?.surcharges) return 0;
    return this.booking.surcharges.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  }

  loadSupplies() {
    this.partnerService.getSupplies().subscribe({
      next: (res: any) => {
        const allSupplies = res.data || res || [];
        this.availableSupplies = allSupplies.filter((item: any) => item.status == 1);
        this.cdr.detectChanges();
      }
    });
  }

  addDamagedItem() {
    if (!this.supplyForm.supply_id || this.supplyForm.quantity <= 0) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Vui lòng chọn vật tư và nhập số lượng hợp lệ!', confirmButtonText: 'Đóng' });
      return;
    }

    this.bookingService.addDamagedItem(this.bookingId, this.supplyForm).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Thành công', text: 'Đã thêm phí đền bù!', showConfirmButton: false, timer: 1500 });
        this.supplyForm = { supply_id: '', incident_type: 1, quantity: 1, actual_price: 0, note: '' }; 
        this.loadBookingDetail(); 
      }
    });
  }

  removeDamagedItem(itemId: number) {
    Swal.fire({
      title: 'Xóa phí đền bù?', text: 'Bạn có chắc muốn xóa khoản đền bù này khỏi hóa đơn?', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Xóa', cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bookingService.removeDamagedItem(this.bookingId, itemId).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Đã xóa', text: 'Đã xóa khoản đền bù.', showConfirmButton: false, timer: 1500 });
            this.loadBookingDetail();
          }
        });
      }
    });
  }

  getDamagedItemsTotal(): number {
    if (!this.booking?.supply_incidents) return 0;
    return this.booking.supply_incidents.reduce((sum: number, item: any) => sum + Number(item.actual_price), 0);
  }

  calculateSuggestedPrice() {
    if (!this.supplyForm.supply_id) {
      this.supplyForm.actual_price = 0;
      return;
    }

    const selectedSupply = this.availableSupplies.find(s => Number(s.id) === Number(this.supplyForm.supply_id));

    if (selectedSupply) {
      const basePrice = Number(selectedSupply.price_per_unit) || 0;
      const qty = Number(this.supplyForm.quantity) || 1;
      this.supplyForm.actual_price = basePrice * qty;
    }
  }

  reportLateCheckIn() {
    Swal.fire({
      title: 'Khách hẹn đến trễ', text: 'Nhập giờ khách dự kiến tới (VD: 19:30):',
      input: 'text', inputPlaceholder: 'HH:MM', showCancelButton: true,
      inputValidator: (value) => {
        if (!value || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) return 'Vui lòng nhập đúng định dạng HH:MM';
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.bookingService.updateEstimatedTime(this.bookingId, { estimated_arrival_time: result.value }).subscribe({
          next: () => { Swal.fire('Thành công', 'Đã lưu giờ đến trễ', 'success'); this.loadBookingDetail(); }
        });
      }
    });
  }

  reportLateCheckOut() {
    Swal.fire({
      title: 'Khách xin trả phòng trễ', text: 'Nhập giờ khách dự kiến đi (VD: 15:00):',
      input: 'text', inputPlaceholder: 'HH:MM', showCancelButton: true,
      inputValidator: (value) => {
        if (!value || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) return 'Vui lòng nhập đúng định dạng HH:MM';
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.bookingService.updateEstimatedTime(this.bookingId, { estimated_departure_time: result.value }).subscribe({
          next: () => { Swal.fire('Thành công', 'Đã lưu giờ trả phòng trễ', 'success'); this.loadBookingDetail(); }
        });
      }
    });
  }

  processNoShow() {
    Swal.fire({
      title: 'Khách KHÔNG ĐẾN (No-Show)?', text: 'Đơn hàng sẽ bị đóng và phòng sẽ được giải phóng lập tức.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#1e293b', confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bookingService.markAsNoShow(this.bookingId).subscribe({
          next: () => { Swal.fire('Đã gạch sổ!', '', 'success'); this.loadBookingDetail(); }
        });
      }
    });
  }
}