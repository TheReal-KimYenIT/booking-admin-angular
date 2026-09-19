import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { HotelService } from '../../../services/hotel.service';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-partner-hotel-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-hotel-profile.html',
  styleUrl: './partner-hotel-profile.css'
})
export class PartnerHotelProfileComponent implements OnInit {
  apiUrl: string = environment.apiUrl;
  imageBaseUrl: string = environment.apiUrl.replace('/api', '');

  profile: any = {
    name: '',
    address: '',
    city: '',
    star_rating: 3,
    description: '',
    tax_code: '',
    business_license_url: '',
    standard_check_in_time: '14:00',
    standard_check_out_time: '12:00'
  };

  isSaving = false;
  isProfileLoaded = false;
  isProvincesLoaded = false;

  // Địa chỉ hành chính 3 cấp
  provinces: any[] = [];
  districts: any[] = [];
  wards: any[] = [];
  selectedDistrictName: string = '';
  selectedWardName: string = '';
  streetAddress: string = '';

  // Thư viện ảnh
  existingImages: any[] = [];
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];

  // Giấy phép kinh doanh
  selectedLicenseFile: File | null = null;
  licensePreviewUrl: string | ArrayBuffer | null = null;

  // Modal Lightbox xem ảnh lớn
  previewModalImage: string | null = null;
  previewModalTitle: string = '';

  constructor(
    private router: Router,
    private hotelService: HotelService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('partner_user') : null;
    if (userStr) {
      const user = JSON.parse(userStr);
      if (Number(user.role_id) !== 1) {
        Swal.fire('Từ chối', 'Chỉ chủ khách sạn mới được cập nhật hồ sơ!', 'error');
        this.router.navigate(['/dashboard/room-matrix']);
        return;
      }
    }

    this.loadProvinces();
    this.loadProfile();
  }

  // ==========================================
  // 1. XỬ LÝ ĐỊA CHỈ HÀNH CHÍNH (OPEN-API V1)
  // ==========================================
  loadProvinces() {
    fetch('https://provinces.open-api.vn/api/v1/p/')
      .then(res => res.json())
      .then(res => {
        this.provinces = res.map((item: any) => ({ code: item.code, name: item.name }));
        this.isProvincesLoaded = true;
        this.autoBindAddress();
        this.cdr.detectChanges();
      })
      .catch(err => console.error('Lỗi mạng khi tải Tỉnh/Thành:', err));
  }

  async autoBindAddress() {
    if (!this.isProfileLoaded || !this.isProvincesLoaded) return;
    if (!this.profile.city) return;

    // 1. Tìm Tỉnh/Thành
    const p = this.provinces.find(x => x.name === this.profile.city || this.profile.city.includes(x.name));
    if (!p) return;

    this.profile.city = p.name;

    try {
      // 2. Tìm Quận/Huyện
      const resDist = await fetch(`https://provinces.open-api.vn/api/v1/p/${p.code}?depth=2`).then(r => r.json());
      if (resDist && resDist.districts) {
        this.districts = resDist.districts.map((item: any) => ({ code: item.code, name: item.name }));

        if (this.profile.address) {
          const d = this.districts.find(x => this.profile.address.includes(x.name));
          if (d) {
            this.selectedDistrictName = d.name;

            // 3. Tìm Phường/Xã
            const resWard = await fetch(`https://provinces.open-api.vn/api/v1/d/${d.code}?depth=2`).then(r => r.json());
            if (resWard && resWard.wards) {
              this.wards = resWard.wards.map((item: any) => ({ code: item.code, name: item.name }));
              const w = this.wards.find(x => this.profile.address.includes(x.name));

              if (w) {
                this.selectedWardName = w.name;
                // Bóc tách Số nhà/Đường sạch sẽ, loại bỏ trùng Phường, Quận, Tỉnh/Thành
                let street = this.profile.address
                  .replace(', ' + w.name, '')
                  .replace(', ' + d.name, '')
                  .replace(w.name, '')
                  .replace(d.name, '');

                if (p && p.name) {
                  street = street.replace(', ' + p.name, '').replace(p.name, '');
                  const shortCity = p.name.replace('Thành phố ', '').replace('Tỉnh ', '').trim();
                  if (shortCity) {
                    street = street.replace(', ' + shortCity, '').replace(shortCity, '');
                  }
                }
                street = street.trim();
                while (street.endsWith(',')) {
                  street = street.slice(0, -1).trim();
                }
                this.streetAddress = street;
              }
            }
          }
        }
      }
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Lỗi tự động phân tách địa chỉ:', err);
    }
  }

  onProvinceChange() {
    const p = this.provinces.find(x => x.name === this.profile.city);
    this.districts = [];
    this.wards = [];
    this.selectedDistrictName = '';
    this.selectedWardName = '';

    if (!p) { this.cdr.detectChanges(); return; }

    fetch(`https://provinces.open-api.vn/api/v1/p/${p.code}?depth=2`)
      .then(res => res.json())
      .then(res => {
        if (res && res.districts) {
          this.districts = res.districts.map((item: any) => ({ code: item.code, name: item.name }));
          this.cdr.detectChanges();
        }
      })
      .catch(err => console.error('Lỗi khi chọn Tỉnh/Thành:', err));
  }

  onDistrictChange() {
    const d = this.districts.find(x => x.name === this.selectedDistrictName);
    this.wards = [];
    this.selectedWardName = '';

    if (!d) { this.cdr.detectChanges(); return; }

    fetch(`https://provinces.open-api.vn/api/v1/d/${d.code}?depth=2`)
      .then(res => res.json())
      .then(res => {
        if (res && res.wards) {
          this.wards = res.wards.map((item: any) => ({ code: item.code, name: item.name }));
          this.cdr.detectChanges();
        }
      })
      .catch(err => console.error('Lỗi khi chọn Quận/Huyện:', err));
  }

  // ==========================================
  // 2. NẠP HỒ SƠ KHÁCH SẠN
  // ==========================================
  loadProfile() {
    this.hotelService.getProfile().subscribe({
      next: (res: any) => {
        if (res.hotel) {
          this.profile = res.hotel;
          this.streetAddress = this.profile.address || '';
          this.existingImages = this.profile.images || [];

          if (this.profile.business_license_url) {
            this.licensePreviewUrl = `${this.imageBaseUrl}${this.profile.business_license_url}`;
          }

          this.isProfileLoaded = true;
          this.autoBindAddress();
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => console.error('Lỗi nạp hồ sơ khách sạn:', err)
    });
  }

  // ==========================================
  // 3. XỬ LÝ ẢNH MỚI (DROPZONE & FILE INPUT)
  // ==========================================
  onFileSelected(event: any) {
    const files: FileList = event.target?.files || event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const newFilesCount = files.length;
    const existingCount = this.existingImages ? this.existingImages.length : 0;
    const currentSelectedCount = this.selectedFiles.length;

    if (existingCount + currentSelectedCount + newFilesCount > 15) {
      Swal.fire({
        icon: 'warning',
        title: 'Giới hạn số lượng ảnh',
        text: `Khách sạn chỉ được lưu tối đa 15 ảnh. Bạn đang có ${existingCount} ảnh trên hệ thống và ${currentSelectedCount} ảnh chờ lưu.`
      });
      return;
    }

    Array.from(files).forEach((file: File) => {
      // Validate file size (20MB)
      if (file.size > 20 * 1024 * 1024) {
        Swal.fire('File quá lớn', `Ảnh ${file.name} vượt quá dung lượng tối đa 20MB.`, 'warning');
        return;
      }
      this.selectedFiles.push(file);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviews.push(e.target.result);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    });

    if (event.target) {
      event.target.value = '';
    }
  }

  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
    this.cdr.detectChanges();
  }

  // ==========================================
  // 4. KÉO THẢ SẮP XẾP ẢNH (DRAG & DROP + LƯU DB)
  // ==========================================
  draggedIndex: number = -1;

  onDragStart(event: DragEvent, index: number) {
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
    setTimeout(() => {
      if (event.target instanceof HTMLElement) {
        event.target.classList.add('opacity-50');
      }
    }, 0);
  }

  onDragEnter(event: DragEvent, index: number) {
    event.preventDefault();
    if (this.draggedIndex !== -1 && this.draggedIndex !== index) {
      const temp = this.existingImages[this.draggedIndex];
      this.existingImages[this.draggedIndex] = this.existingImages[index];
      this.existingImages[index] = temp;
      this.draggedIndex = index;
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragEnd(event: DragEvent) {
    this.draggedIndex = -1;
    if (event.target instanceof HTMLElement) {
      event.target.classList.remove('opacity-50');
    }
    this.cdr.detectChanges();

    // Tự động lưu thứ tự mới xuống database
    if (this.existingImages.length > 1) {
      const imageIds = this.existingImages.map(img => img.id);
      this.http.post(`${this.apiUrl}/partner/hotel/reorder-images`, { image_ids: imageIds }).subscribe({
        next: () => {
          const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1200,
            timerProgressBar: false
          });
          Toast.fire({ icon: 'success', title: 'Đã lưu thứ tự ảnh' });
        },
        error: (err) => console.error('Lỗi cập nhật thứ tự ảnh:', err)
      });
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.onFileSelected({ dataTransfer: event.dataTransfer });
    }
  }

  // ==========================================
  // 5. GIẤY PHÉP KINH DOANH
  // ==========================================
  onLicenseFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        Swal.fire('File quá lớn', 'Ảnh giấy phép vượt quá 20MB!', 'warning');
        return;
      }
      this.selectedLicenseFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.licensePreviewUrl = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  // ==========================================
  // 6. THAO TÁC ẢNH ĐÃ CÓ (XÓA & ĐẶT ẢNH BÌA)
  // ==========================================
  deleteExistingImage(mediaId: number) {
    Swal.fire({
      title: 'Xóa ảnh này?',
      text: 'Ảnh sẽ bị gỡ khỏi thư viện khách sạn vĩnh viễn.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Đồng ý xóa',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/partner/media/${mediaId}`).subscribe({
          next: () => {
            this.existingImages = this.existingImages.filter(img => img.id !== mediaId);
            this.cdr.detectChanges();
            Swal.fire({ icon: 'success', title: 'Đã xóa!', timer: 1200, showConfirmButton: false });
          },
          error: () => Swal.fire('Lỗi', 'Không thể xóa ảnh', 'error')
        });
      }
    });
  }

  setPrimaryImage(mediaId: number) {
    this.http.post(`${this.apiUrl}/partner/media/${mediaId}/set-primary`, {}).subscribe({
      next: () => {
        this.existingImages.forEach(img => {
          img.is_primary = (img.id === mediaId) ? 1 : 0;
        });
        this.cdr.detectChanges();
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: false
        });
        Toast.fire({ icon: 'success', title: 'Đã đặt làm ảnh bìa chính!' });
      },
      error: () => Swal.fire('Lỗi', 'Không thể đặt làm ảnh bìa', 'error')
    });
  }

  // Lightbox Modal xem ảnh lớn
  openImageModal(url: string, title: string = 'Xem ảnh lớn') {
    this.previewModalImage = url;
    this.previewModalTitle = title;
  }

  closeImageModal() {
    this.previewModalImage = null;
  }

  // ==========================================
  // 7. LƯU TOÀN BỘ HỒ SƠ KHÁCH SẠN
  // ==========================================
  saveProfile() {
    if (!this.profile.name || this.profile.name.trim() === '') {
      Swal.fire('Thiếu thông tin', 'Vui lòng nhập Tên Khách sạn!', 'warning');
      return;
    }
    if (!this.profile.city) {
      Swal.fire('Thiếu thông tin', 'Vui lòng chọn Tỉnh/Thành phố!', 'warning');
      return;
    }

    this.isSaving = true;
    Swal.fire({ title: 'Đang lưu hồ sơ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    // Ghép địa chỉ hoàn chỉnh
    let fullAddress = (this.streetAddress || '').trim();
    if (this.selectedWardName && !fullAddress.includes(this.selectedWardName)) {
      fullAddress += (fullAddress ? ', ' : '') + this.selectedWardName;
    }
    if (this.selectedDistrictName && !fullAddress.includes(this.selectedDistrictName)) {
      fullAddress += (fullAddress ? ', ' : '') + this.selectedDistrictName;
    }
    this.profile.address = fullAddress;

    // 1. Lưu thông tin dạng Text
    this.hotelService.updateProfile(this.profile).subscribe({
      next: (res: any) => {
        // 2. Nếu có upload ảnh mới hoặc giấy phép mới
        if (this.selectedFiles.length > 0 || this.selectedLicenseFile) {
          const formData = new FormData();
          this.selectedFiles.forEach(file => formData.append('media[]', file));

          if (this.selectedLicenseFile) {
            formData.append('business_license_image', this.selectedLicenseFile);
          }

          this.http.post(`${this.apiUrl}/partner/hotel/images`, formData).subscribe({
            next: (imgRes: any) => {
              this.isSaving = false;
              Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Đã cập nhật đầy đủ thông tin và tải ảnh thành công!', timer: 1800, showConfirmButton: false });
              this.selectedFiles = [];
              this.imagePreviews = [];
              this.selectedLicenseFile = null;
              this.loadProfile();
            },
            error: (err) => {
              this.isSaving = false;
              Swal.fire({ icon: 'warning', title: 'Lưu thông tin thành công', text: 'Nhưng có lỗi xảy ra khi tải ảnh lên máy chủ!', confirmButtonText: 'Đóng' });
              this.loadProfile();
            }
          });
        } else {
          this.isSaving = false;
          Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Đã cập nhật thông tin khách sạn thành công!', timer: 1500, showConfirmButton: false });
        }
      },
      error: (err: any) => {
        this.isSaving = false;
        Swal.fire({ icon: 'error', title: 'Lỗi', text: err.error?.message || 'Có lỗi xảy ra khi lưu thông tin!', confirmButtonText: 'Đóng' });
      }
    });
  }
}