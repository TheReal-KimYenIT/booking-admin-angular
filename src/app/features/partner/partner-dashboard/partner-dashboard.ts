import { Component, OnInit, OnDestroy } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router'; 

import { AuthService } from '../../../services/auth.service'; 
import { PartnerService } from '../../../services/partner.service';

@Component({
  selector: 'app-partner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule], 
  templateUrl: './partner-dashboard.html',
  styleUrl: './partner-dashboard.css' 
})
export class PartnerDashboardComponent implements OnInit, OnDestroy { 
  
  userRole: number = 0;
  permissions: string[] = [];
  newContactCount: number = 0;
  isCollapsed: boolean = false;
  private intervalId: any; 

  // Trạng thái thu gọn/mở rộng từng nhóm menu
  expandedSections: { [key: string]: boolean } = {
    reports: true,
    operations: true,
    accommodation: true,
    services: true,
    admin: true
  };

  constructor(
    private authService: AuthService, 
    private router: Router,
    private partnerService: PartnerService 
  ) {}

  ngOnInit() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedCollapsed = localStorage.getItem('partner_sidebar_collapsed');
      if (savedCollapsed !== null) {
        this.isCollapsed = JSON.parse(savedCollapsed);
      }
      const savedSections = localStorage.getItem('partner_expanded_sections');
      if (savedSections) {
        try {
          this.expandedSections = { ...this.expandedSections, ...JSON.parse(savedSections) };
        } catch (e) {}
      }
    }
    this.autoExpandActiveSection();
    this.initUser();
    this.loadUnreadContacts();

    this.intervalId = setInterval(() => {
      this.loadUnreadContacts();
    }, 60000);
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('partner_sidebar_collapsed', JSON.stringify(this.isCollapsed));
    }
  }

  toggleSection(sectionKey: string) {
    this.expandedSections[sectionKey] = !this.expandedSections[sectionKey];
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('partner_expanded_sections', JSON.stringify(this.expandedSections));
    }
  }

  autoExpandActiveSection() {
    const url = this.router.url;
    if (url.includes('overview') || url.includes('transactions')) {
      this.expandedSections['reports'] = true;
    } else if (url.includes('room-matrix') || url.includes('bookings') || url.includes('refunds') || url.includes('customers')) {
      this.expandedSections['operations'] = true;
    } else if (url.includes('hotel') || url.includes('room-types') || url.includes('inventory')) {
      this.expandedSections['accommodation'] = true;
    } else if (url.includes('services') || url.includes('minibar') || url.includes('promotions') || url.includes('partner-surcharge')) {
      this.expandedSections['services'] = true;
    } else if (url.includes('reviews') || url.includes('support') || url.includes('roles') || url.includes('staffs') || url.includes('supplies') || url.includes('profile')) {
      this.expandedSections['admin'] = true;
    }
  }


  ngOnDestroy() {

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  initUser() {
    const userStr = localStorage.getItem('partner_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.userRole = user.role_id ? Number(user.role_id) : 1; 
        
        this.permissions = user.role?.permissions || [];
      } catch (e) {
        this.userRole = 1;
        this.permissions = [];
      }
    } else {
      this.userRole = 1;
      this.permissions = [];
    }
  }

  hasPermission(permissionKey: string): boolean {
    if (this.userRole === 1) return true; // Nếu là Owner (Chủ khách sạn) thì mặc định có FULL QUYỀN
    return this.permissions.includes(permissionKey); // Nếu là nhân viên thì check xem có trong mảng JSON không
  }

  loadUnreadContacts() {
    this.partnerService.getChatThreads().subscribe({
      next: (res: any) => {
        const contacts = res.data || [];
        setTimeout(() => {
            this.newContactCount = contacts.filter((c: any) => c.status === 0).length;
        }, 0);
      }
    });
  }

  logout() {
    this.authService.logout();
    localStorage.removeItem('partner_user');
    localStorage.removeItem('partner_token');
    this.router.navigate(['/login']); 
  }
}
