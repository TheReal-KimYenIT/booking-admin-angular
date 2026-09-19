import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PartnerService } from '../../../services/partner.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-partner-room-types',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-room-types.html',
  styleUrl: './partner-room-types.css'
})
export class PartnerRoomTypesComponent implements OnInit {
  imageBaseUrl = environment.apiUrl.replace('/api', '');
  searchTerm: string = '';

  rooms: any[] = [];
  
  roomForm: any = { 
    name: '', base_price: 0, max_adults: 2, max_children: 0, 
    view_id: null, bed_type_id: null,
    room_size: null, description: '', has_breakfast: 0, 
    cancellation_policy: '', smoking_policy: 0,
    free_cancel_hours: 48, partial_refund_hours: 24, partial_refund_percent: 50
  };
  editingRoomId: number | null = null;
  showTypeModal: boolean = false; 

  selectedFiles: File[] = [];
  imagePreviews: string[] = [];
  existingImages: any[] = [];
  allRoomAmenities: any[] = [];
  selectedAmenityIds: number[] = [];
  deletedImageIds: number[] = [];

  allRoomViews: any[] = [];
  allBedTypes: any[] = [];

  showPhysModal: boolean = false; 
  isEditPhysMode: boolean = false;
  physRoomForm: any = { id: null, room_type_id: 0, room_name: '', status: 1 };

  constructor(
    private router: Router,
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const userStr = localStorage.getItem('partner_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (Number(user.role_id) === 3) {
        Swal.fire('Từ chối truy cập', 'Bạn là Lễ tân, không có quyền vào trang này!', 'error');
        this.router.navigate(['/dashboard/room-matrix']);
        return;
      }
    }
    this.loadAllData();
    this.loadAmenities();
  }

  statusFilter: string = 'all'; // 'all' | 'active' | 'inactive'

  // --- STATS COMPUTED GETTERS ---
  get totalRoomTypes(): number {
    return this.rooms.length;
  }

  get activeRoomTypesCount(): number {
    return this.rooms.filter(r => Number(r.status) === 1).length;
  }

  get inactiveRoomTypesCount(): number {
    return this.rooms.filter(r => Number(r.status) === 0).length;
  }

  get totalPhysicalRooms(): number {
    return this.rooms.reduce((acc, r) => acc + (r.physicalRooms?.length || 0), 0);
  }

  get availableRooms(): number {
    return this.rooms.reduce((acc, r) => acc + (r.physicalRooms?.filter((p: any) => Number(p.status) === 1).length || 0), 0);
  }

  get occupiedRooms(): number {
    return this.rooms.reduce((acc, r) => acc + (r.physicalRooms?.filter((p: any) => Number(p.status) === 2).length || 0), 0);
  }

  get maintenanceRooms(): number {
    return this.rooms.reduce((acc, r) => acc + (r.physicalRooms?.filter((p: any) => Number(p.status) === 0 || Number(p.status) === 3).length || 0), 0);
  }

  get filteredRooms(): any[] {
    let list = this.rooms;
    if (this.statusFilter === 'active') {
      list = list.filter(r => Number(r.status) === 1);
    } else if (this.statusFilter === 'inactive') {
      list = list.filter(r => Number(r.status) === 0);
    }
    if (!this.searchTerm || !this.searchTerm.trim()) {
      return list;
    }
    const q = this.searchTerm.toLowerCase().trim();
    return list.filter(r => r.name?.toLowerCase().includes(q));
  }

  loadAllData() {
    forkJoin({
      typesRes: this.partnerService.getRoomTypes(),
      physRes: this.partnerService.getRooms()
    }).subscribe({
      next: ({ typesRes, physRes }: any) => {
        const roomTypes = typesRes.room_types || [];
        const physRooms = physRes.data || [];

        this.rooms = roomTypes.map((type: any) => ({
          ...type,
          physicalRooms: physRooms.filter((pr: any) => pr.room_type_id === type.id)
        }));

        this.allRoomViews = typesRes.all_room_views || [];
        this.allBedTypes = typesRes.all_bed_types || [];
        
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error("Lỗi tải dữ liệu", err);
        Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Có lỗi khi tải dữ liệu từ máy chủ!' });
      }
    });
  }

  loadAmenities() {
    this.partnerService.getRoomAmenities().subscribe({
      next: (res: any) => {
        this.allRoomAmenities = (res.data || []).map((item: any) => ({ ...item, id: Number(item.id) }));
        this.cdr.detectChanges();
      }
    });
  }

  // --- IMAGE HELPERS ---
  getImageUrl(path: string): string {
    if (!path) return 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=500&q=80';
    if (path.startsWith('http')) return path;
    return `${this.imageBaseUrl}${path}`;
  }

  getRoomImage(room: any): string {
    if (room.media && room.media.length > 0) {
      const primary = room.media.find((m: any) => Number(m.is_primary) === 1);
      const target = primary || room.media[0];
      return this.getImageUrl(target.file_url);
    }
    return 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=500&q=80';
  }

  setPrimaryImage(mediaId: number) {
    this.partnerService.setPrimaryRoomImage(mediaId).subscribe({
      next: () => {
        this.existingImages.forEach(img => {
          img.is_primary = (img.id === mediaId) ? 1 : 0;
        });
        if (this.editingRoomId) {
          const room = this.rooms.find(r => r.id === this.editingRoomId);
          if (room && room.media) {
            room.media.forEach((m: any) => {
              m.is_primary = (m.id === mediaId) ? 1 : 0;
            });
          }
        }
        this.cdr.detectChanges();
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500
        });
        Toast.fire({ icon: 'success', title: 'Đã đặt làm ảnh bìa chính!' });
      },
      error: () => Swal.fire('Lỗi', 'Không thể đặt làm ảnh bìa', 'error')
    });
  }

  deleteExistingImage(id: any) {
    this.existingImages = this.existingImages.filter(img => img.id !== id);
    this.deletedImageIds.push(id);
  }

  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
    this.cdr.detectChanges();
  }

  // --- ROOM TYPE MODAL LOGIC ---
  openTypeModal(room?: any) {
    if (room) {
      this.editingRoomId = room.id;
      this.roomForm = { 
        ...room, 
        base_price: room.base_price ? Math.round(Number(room.base_price)) : 0,
        status: (room.status !== undefined && room.status !== null) ? Number(room.status) : 1,
        view_id: room.view_id ? Number(room.view_id) : null, 
        bed_type_id: room.bed_type_id ? Number(room.bed_type_id) : null,
        has_breakfast: room.has_breakfast ? 1 : 0,
        smoking_policy: room.smoking_policy ? 1 : 0,
        free_cancel_hours: (room.free_cancel_hours !== null && room.free_cancel_hours !== undefined) ? room.free_cancel_hours : 48,
        partial_refund_hours: (room.partial_refund_hours !== null && room.partial_refund_hours !== undefined) ? room.partial_refund_hours : 24,
        partial_refund_percent: (room.partial_refund_percent !== null && room.partial_refund_percent !== undefined) ? room.partial_refund_percent : 50
      };
      this.selectedFiles = [];
      this.imagePreviews = [];
      this.existingImages = room.media ? [...room.media] : [];
      this.deletedImageIds = [];
      this.selectedAmenityIds = room.amenities ? room.amenities.map((a: any) => Number(a.id)) : [];
    } else {
      this.resetTypeForm();
    }
    this.showTypeModal = true;
  }

  closeTypeModal() {
    this.showTypeModal = false;
  }

  resetTypeForm() {
    this.editingRoomId = null;
    this.roomForm = { 
      name: '', base_price: 0, max_adults: 2, max_children: 0, 
      status: 1,
      view_id: null, bed_type_id: null,
      room_size: null, description: '', has_breakfast: 0, 
      cancellation_policy: '', smoking_policy: 0,
      free_cancel_hours: 48, partial_refund_hours: 24, partial_refund_percent: 50
    };
    this.selectedFiles = [];
    this.imagePreviews = [];
    this.existingImages = [];
    this.deletedImageIds = [];
    this.selectedAmenityIds = [];
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles: File[] = Array.from(event.target.files);
      this.selectedFiles.push(...newFiles);
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviews.push(e.target.result);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      });
    }
  }

  toggleAmenity(amenityId: any, event: any) {
    const id = Number(amenityId);
    if (event.target.checked) {
      if (!this.selectedAmenityIds.includes(id)) this.selectedAmenityIds.push(id);
    } else {
      this.selectedAmenityIds = this.selectedAmenityIds.filter(val => val !== id);
    }
  }

  saveRoom() {
    const totalImages = this.existingImages.length + this.selectedFiles.length;
    if (totalImages < 1 || totalImages > 15) {
      Swal.fire({ icon: 'error', title: 'Số lượng ảnh không hợp lệ', text: 'Vui lòng cung cấp từ 1 đến 15 hình ảnh minh họa cho loại phòng này.' });
      return;
    }

    if (!this.roomForm.name || this.roomForm.name.trim() === '') {
      Swal.fire({ icon: 'error', title: 'Dữ liệu không hợp lệ', text: 'Vui lòng nhập Tên loại phòng.' });
      return;
    }

    if (this.roomForm.base_price <= 0 || this.roomForm.base_price > 500000000) {
      Swal.fire({ icon: 'error', title: 'Dữ liệu không hợp lệ', text: 'Giá tiền phải lớn hơn 0 và không vượt quá 500.000.000 VNĐ.' });
      return;
    }

    if (this.roomForm.max_adults < 1 || this.roomForm.max_adults > 20 || this.roomForm.max_children < 0 || this.roomForm.max_children > 20) {
      Swal.fire({ icon: 'error', title: 'Dữ liệu không hợp lệ', text: 'Số lượng Người lớn (1-20) và Trẻ em (0-20) không hợp lệ.' });
      return;
    }

    if (this.roomForm.room_size !== undefined && this.roomForm.room_size !== null && (this.roomForm.room_size <= 0 || this.roomForm.room_size > 2000)) {
      Swal.fire({ icon: 'error', title: 'Dữ liệu không hợp lệ', text: 'Diện tích phòng phải nằm trong khoảng từ 1 m² đến 2000 m².' });
      return;
    }

    if (this.roomForm.free_cancel_hours !== undefined && (this.roomForm.free_cancel_hours < 0 || this.roomForm.free_cancel_hours > 720)) {
      Swal.fire({ icon: 'error', title: 'Dữ liệu không hợp lệ', text: 'Giờ hủy miễn phí không hợp lệ (Tối đa 720 giờ = 30 ngày).' });
      return;
    }

    if (this.roomForm.partial_refund_hours !== undefined && (this.roomForm.partial_refund_hours < 0 || this.roomForm.partial_refund_hours > 720)) {
      Swal.fire({ icon: 'error', title: 'Dữ liệu không hợp lệ', text: 'Giờ hoàn 1 phần không hợp lệ (Tối đa 720 giờ = 30 ngày).' });
      return;
    }

    if (this.roomForm.partial_refund_percent !== undefined && (this.roomForm.partial_refund_percent < 0 || this.roomForm.partial_refund_percent > 100)) {
      Swal.fire({ icon: 'error', title: 'Dữ liệu không hợp lệ', text: 'Tỷ lệ hoàn 1 phần phải từ 0% đến 100%.' });
      return;
    }

    Swal.fire({ title: 'Đang lưu...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const formData = new FormData();
    formData.append('name', this.roomForm.name.trim());
    formData.append('base_price', (this.roomForm.base_price || 0).toString());
    formData.append('max_adults', (this.roomForm.max_adults || 0).toString());
    formData.append('max_children', (this.roomForm.max_children || 0).toString());
    formData.append('status', (this.roomForm.status !== undefined && this.roomForm.status !== null ? this.roomForm.status : 1).toString());
    
    if (this.roomForm.view_id) formData.append('view_id', this.roomForm.view_id.toString());
    if (this.roomForm.bed_type_id) formData.append('bed_type_id', this.roomForm.bed_type_id.toString());
    
    if (this.roomForm.room_size) formData.append('room_size', this.roomForm.room_size.toString());
    if (this.roomForm.description) formData.append('description', this.roomForm.description);
    
    if (this.roomForm.free_cancel_hours !== undefined) formData.append('free_cancel_hours', this.roomForm.free_cancel_hours.toString());
    if (this.roomForm.partial_refund_hours !== undefined) formData.append('partial_refund_hours', this.roomForm.partial_refund_hours.toString());
    if (this.roomForm.partial_refund_percent !== undefined) formData.append('partial_refund_percent', this.roomForm.partial_refund_percent.toString());
    
    formData.append('has_breakfast', this.roomForm.has_breakfast ? '1' : '0');
    formData.append('smoking_policy', this.roomForm.smoking_policy ? '1' : '0');

    this.selectedAmenityIds.forEach(id => formData.append('amenity_ids[]', id.toString()));
    this.selectedFiles.forEach(file => formData.append('media[]', file));
    this.deletedImageIds.forEach(id => formData.append('deleted_image_ids[]', id.toString()));

    const apiCall = this.editingRoomId 
      ? this.partnerService.updateRoomType(this.editingRoomId, formData) 
      : this.partnerService.addRoomType(formData);

    apiCall.subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Thành công!', timer: 1500, showConfirmButton: false });
        this.closeTypeModal();
        this.loadAllData();
      },
      error: (err: any) => {
        const errorMsg = err.error?.message || 'Lỗi khi lưu loại phòng! Vui lòng kiểm tra lại thông tin.';
        Swal.fire({ icon: 'error', title: 'Lỗi', text: errorMsg });
      }
    });
  }

  toggleRoomStatus(room: any) {
    const isCurrentlyActive = Number(room.status) === 1;
    const title = isCurrentlyActive ? 'Tạm ngưng mở bán loại phòng?' : 'Mở bán lại loại phòng?';
    const text = isCurrentlyActive 
      ? 'Loại phòng sẽ không hiển thị cho khách đặt trên website. Bạn có thể mở bán lại bất kỳ lúc nào.' 
      : 'Loại phòng sẽ hiển thị trở lại trên website để khách hàng có thể đặt phòng.';
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
        this.partnerService.deleteRoomType(room.id).subscribe({
          next: (res: any) => {
            Swal.fire({ 
              icon: 'success', 
              title: 'Thành công!', 
              text: res.message || (isCurrentlyActive ? 'Đã tạm ngưng mở bán!' : 'Đã mở bán lại thành công!'), 
              showConfirmButton: false, 
              timer: 1500 
            });
            this.loadAllData();
          },
          error: (err: any) => {
            const errorMsg = err.error?.message || 'Có lỗi xảy ra khi cập nhật trạng thái phòng!';
            Swal.fire({ icon: 'error', title: 'Lỗi', text: errorMsg });
          }
        });
      }
    });
  }

  // --- LOGIC CHO PHÒNG VẬT LÝ ---
  openPhysModal(roomTypeId: number, physRoom?: any) {
    if (physRoom) {
      this.isEditPhysMode = true;
      this.physRoomForm = { ...physRoom, status: Number(physRoom.status) };
    } else {
      this.isEditPhysMode = false;
      this.physRoomForm = { id: null, room_type_id: roomTypeId, room_name: '', status: 1 };
    }
    this.showPhysModal = true;
  }

  closePhysModal() {
    this.showPhysModal = false;
  }

  savePhysRoom() {
    this.physRoomForm.room_name = this.physRoomForm.room_name?.trim();
    if (!this.physRoomForm.room_name) {
      Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập số hoặc tên phòng!' });
      return;
    }

    Swal.fire({ title: 'Đang xử lý...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const apiCall = this.isEditPhysMode && this.physRoomForm.id
      ? this.partnerService.updateRoom(this.physRoomForm.id, this.physRoomForm)
      : this.partnerService.addRoom(this.physRoomForm);

    apiCall.subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Thành công!', showConfirmButton: false, timer: 1500 });
        this.closePhysModal();
        this.loadAllData();
      },
      error: (err: any) => {
        const errorMsg = err.error?.message || 'Có lỗi xảy ra khi lưu phòng. Vui lòng thử lại sau.';
        Swal.fire({ icon: 'error', title: 'Không thể lưu', text: errorMsg });
      }
    });
  }

  deletePhysRoom(id: number) {
    Swal.fire({
      title: 'Xóa mã phòng này?',
      text: 'Mã phòng sẽ bị gỡ khỏi danh sách phòng thực tế.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Đồng ý xóa',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.partnerService.deleteRoom(id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Đã xóa!', showConfirmButton: false, timer: 1500 });
            this.closePhysModal();
            this.loadAllData();
          },
          error: (err: any) => {
            const errorMsg = err.error?.message || 'Không thể xóa phòng đang có khách hoặc có ràng buộc đơn đặt!';
            Swal.fire({ icon: 'error', title: 'Không thể xóa', text: errorMsg });
          }
        });
      }
    });
  }

  // --- BADGE & INFO HELPERS ---
  getViewName(viewId: any): string {
    if (!viewId) return '';
    const v = this.allRoomViews.find(x => Number(x.id) === Number(viewId));
    return v ? v.name : '';
  }

  getBedTypeName(bedId: any): string {
    if (!bedId) return '';
    const b = this.allBedTypes.find(x => Number(x.id) === Number(bedId));
    return b ? b.name : '';
  }

  getRoomStatusCount(room: any, status: number): number {
    if (!room.physicalRooms) return 0;
    return room.physicalRooms.filter((p: any) => Number(p.status) === Number(status)).length;
  }

  getStatusInfo(status: number) {
    switch (Number(status)) {
      case 1:
        return { text: 'Sẵn sàng', dotClass: 'bg-emerald-500', textClass: 'text-emerald-700', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 2:
        return { text: 'Có khách', dotClass: 'bg-blue-500', textClass: 'text-blue-700', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 0:
        return { text: 'Cần dọn', dotClass: 'bg-amber-500', textClass: 'text-amber-700', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 3:
        return { text: 'Bảo trì', dotClass: 'bg-rose-500', textClass: 'text-rose-700', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { text: 'Khác', dotClass: 'bg-slate-400', textClass: 'text-slate-600', badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  }
}
