import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';   

// ĐÃ SỬA: Lùi 3 cấp để gọi về thư mục services gốc
import { AuthService } from '../../../services/auth.service'; 

@Component({
  selector: 'app-admin-login',
  standalone: true, 
  imports: [CommonModule, FormsModule], 
  templateUrl: './admin-login.html', 
  styleUrl: './admin-login.css'   
})
export class AdminLoginComponent {
  email = '';
  password = '';
  showPassword = false;
  errorMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password, 'admin').subscribe({
      next: (res: any) => {
        this.isLoading = false;
        
        const token = res.token || res.access_token;
        this.authService.saveToken(token, 'admin');
        
        if (typeof window !== 'undefined' && window.localStorage) {
            const userData = res.user || res.data;
            localStorage.setItem('admin_info', JSON.stringify(userData));
        }
        
        // BẪY LỖI ROUTER Ở ĐÂY
        this.router.navigate(['/admin']).then(success => {
          if (!success) {
             this.errorMessage = "Đăng nhập thành công nhưng không thể tải giao diện Admin. Vui lòng ấn F12 kiểm tra tab Console!";
             console.error("LỖI ĐỊNH TUYẾN: Angular đã chặn không cho vào /admin. Hãy kiểm tra xem file AdminLayoutComponent có lỗi gì không.");
          }
        });
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!';
      }
    });
  }
}