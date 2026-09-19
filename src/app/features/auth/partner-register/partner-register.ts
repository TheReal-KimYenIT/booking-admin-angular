import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

// SỬA: Lùi 3 cấp thư mục (../../../) để vào thư mục services gốc
import { PartnerService } from '../../../services/partner.service'; // Chắc chắn rằng tên file là partner.service.ts

@Component({
  selector: 'app-partner-register',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule], 
  templateUrl: './partner-register.html',
  styleUrl: './partner-register.css' // Angular 17+ dùng styleUrl
})
export class PartnerRegisterComponent implements OnInit {
  registerForm!: FormGroup;
  currentStep = 1;
  totalSteps = 3;
  showPassword = false;
  showConfirmPassword = false;
  selectedLicenseFile: File | null = null;
  isSubmitting = false;
  provinces: any[] = [];
  districts: any[] = [];
  wards: any[] = [];
  selectedDistrictName: string = '';
  selectedWardName: string = '';

  constructor(
    private fb: FormBuilder, 
    private partnerService: PartnerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    fetch('https://provinces.open-api.vn/api/p/')
      .then(res => res.json())
      .then(res => this.provinces = res)
      .catch(err => console.error('Lỗi API Tỉnh thành:', err));

    this.registerForm = this.fb.group({
      account: this.fb.group({
        firstName: ['', Validators.required], 
        lastName: ['', Validators.required],  
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required],
        password: ['', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]],
        confirmPassword: ['', Validators.required]
      }, { validators: this.passwordMatchValidator }),
      property: this.fb.group({
        propertyName: ['', Validators.required],
        taxCode: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
      }),
      location: this.fb.group({
        city: ['', Validators.required],
        address: ['', Validators.required]
      })
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  isStepValid(step: number): boolean {
    if (step === 1) return this.registerForm.get('account')?.valid ?? false;
    if (step === 2) return this.registerForm.get('property')?.valid ?? false;
    if (step === 3) {
      const isLocationValid = this.registerForm.get('location')?.valid ?? false;
      const isDistrictSelected = this.selectedDistrictName !== '';
      const isWardSelected = this.wards.length === 0 || this.selectedWardName !== '';
      return isLocationValid && isDistrictSelected && isWardSelected;
    }
    return false;
  }

  nextStep() { if (this.currentStep < this.totalSteps && this.isStepValid(this.currentStep)) this.currentStep++; }
  prevStep() { if (this.currentStep > 1) this.currentStep--; }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedLicenseFile = file;
    }
  }

  onProvinceChange() {
    const cityName = this.registerForm.get('location.city')?.value;
    const p = this.provinces.find(x => x.name === cityName);
    
    this.districts = []; 
    this.wards = []; 
    this.selectedDistrictName = ''; 
    this.selectedWardName = '';
    
    if (!p) return;

    fetch(`https://provinces.open-api.vn/api/p/${p.code}?depth=2`)
      .then(res => res.json())
      .then(res => {
        if (res && res.districts) {
          this.districts = res.districts.map((item: any) => ({ code: item.code, name: item.name }));
        }
      })
      .catch(err => console.error('Lỗi khi chọn Tỉnh/Thành:', err));
  }

  onDistrictChange() {
    const d = this.districts.find(x => x.name === this.selectedDistrictName);
    
    this.wards = []; 
    this.selectedWardName = '';
    
    if (!d) return;

    fetch(`https://provinces.open-api.vn/api/d/${d.code}?depth=2`)
      .then(res => res.json())
      .then(res => {
        if (res && res.wards) {
          this.wards = res.wards.map((item: any) => ({ code: item.code, name: item.name }));
        }
      })
      .catch(err => console.error('Lỗi khi chọn Quận/Huyện:', err));
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      this.isSubmitting = true;
      
      let finalAddress = this.registerForm.value.location.address;
      if (this.wards.find(x => x.name === this.selectedWardName)) finalAddress += ', ' + this.selectedWardName;
      if (this.districts.find(x => x.name === this.selectedDistrictName)) finalAddress += ', ' + this.selectedDistrictName;

      const formData = new FormData();
      formData.append('first_name', this.registerForm.value.account.firstName);
      formData.append('last_name', this.registerForm.value.account.lastName);
      formData.append('email', this.registerForm.value.account.email);
      formData.append('phone', this.registerForm.value.account.phone);
      formData.append('password', this.registerForm.value.account.password);
      formData.append('password_confirmation', this.registerForm.value.account.confirmPassword);

      formData.append('hotel_name', this.registerForm.value.property.propertyName);
      formData.append('tax_code', this.registerForm.value.property.taxCode);

      formData.append('city', this.registerForm.value.location.city);
      formData.append('address', finalAddress);

      if (this.selectedLicenseFile) {
        formData.append('business_license', this.selectedLicenseFile);
      }

      // 3. Gọi API đăng ký
      this.partnerService.registerPartner(formData).subscribe({
        next: (response: any) => {
          this.isSubmitting = false;
          Swal.fire({
            title: 'Đăng ký thành công!',
            text: 'Tài khoản của bạn đang chờ Admin xét duyệt. Chúng tôi sẽ liên hệ sớm nhất!',
            icon: 'success',
            confirmButtonText: 'Đóng',
            confirmButtonColor: '#10B981'
          }).then(() => {
            this.router.navigate(['/partner/login']);
          });
        },
        error: (error: any) => {
          this.isSubmitting = false;
          console.error('Lỗi API:', error);
          
          let errorMessage = 'Đăng ký thất bại';
          if (error.error && error.error.errors) {
            // Lấy thông báo lỗi cụ thể từ Laravel
            const firstError = Object.values(error.error.errors)[0] as string[];
            errorMessage = firstError[0];
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }
          
          Swal.fire({
            title: 'Lỗi',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });

    } else {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc có dấu * !');
      this.registerForm.markAllAsTouched();
    }
  }
}