import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css' // Cú pháp chuẩn của Angular 17+ là styleUrl, không phải styleUrls
})
export class AdminLayoutComponent implements OnInit {
  adminName = 'Quản trị viên';
  adminRole = 'Staff';
  isCollapsed = false;

  expandedSections: { [key: string]: boolean } = {
    operations: true,
    master: true,
    system: true
  };

  constructor(private router: Router) {}

  ngOnInit() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedCollapsed = localStorage.getItem('admin_sidebar_collapsed');
      if (savedCollapsed !== null) {
        this.isCollapsed = JSON.parse(savedCollapsed);
      }

      const savedSections = localStorage.getItem('admin_expanded_sections');
      if (savedSections) {
        try {
          this.expandedSections = { ...this.expandedSections, ...JSON.parse(savedSections) };
        } catch (e) {
          console.error('Error parsing admin_expanded_sections', e);
        }
      }

      const adminInfoRaw = localStorage.getItem('admin_info');
      if (adminInfoRaw) {
        const adminData = JSON.parse(adminInfoRaw);
        this.adminName = `${adminData.last_name} ${adminData.first_name}`;
        this.adminRole = adminData.role || 'Staff';
      } else {
        // Nếu không có thông tin đăng nhập, đá văng ra trang Login
        this.router.navigate(['/admin/login']);
      }
    }
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('admin_sidebar_collapsed', JSON.stringify(this.isCollapsed));
    }
  }

  toggleSection(sectionKey: string) {
    this.expandedSections[sectionKey] = !this.expandedSections[sectionKey];
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('admin_expanded_sections', JSON.stringify(this.expandedSections));
    }
  }


  onLogout() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_info');
    }
    this.router.navigate(['/admin/login']);
  }
}