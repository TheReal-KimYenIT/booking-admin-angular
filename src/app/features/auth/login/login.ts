import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Lùi 3 cấp gọi về file auth.service.ts ở thư mục dịch vụ gốc
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css' 
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
  isLoading = false;

  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  onSubmit() {
    this.isLoading = true;
    
    this.authService.login(this.email, this.password).subscribe({
      next: (res: any) => {
        // 1. Lưu Token để gọi API
        this.authService.saveToken(res.token);

        if (res.user) {
          localStorage.setItem('partner_user', JSON.stringify(res.user));
        }
        
        // 3. Chuyển hướng vào trong Dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.isLoading = false;
        alert('Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu!');
      }
    });
  }
}
