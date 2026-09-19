import { Routes } from '@angular/router';

// ==========================================
// IMPORT CÁC COMPONENT AUTH
// ==========================================
// ==========================================
// IMPORT CÁC COMPONENT CỦA ADMIN
// ==========================================
// ==========================================
// IMPORT CÁC COMPONENT CỦA ĐỐI TÁC (PARTNER)
// ==========================================
 
// Import Guard bảo vệ route (Nếu bạn đã tạo auth-guard)
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  // Mặc định khi vào web sẽ chuyển hướng đến trang Đăng nhập
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  
  // ==========================================
  // KHU VỰC ĐĂNG NHẬP / ĐĂNG KÝ
  // ==========================================
  { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent) },
  { path: 'partner/register', loadComponent: () => import('./features/auth/partner-register/partner-register').then(m => m.PartnerRegisterComponent) },

  // ==========================================
  // KHU VỰC DÀNH RIÊNG CHO ADMIN
  // ==========================================
  
  // 1. Cổng đăng nhập riêng cho Admin
  { path: 'admin/login', loadComponent: () => import('./features/admin/admin-login/admin-login').then(m => m.AdminLoginComponent) },

  // 2. Hệ thống Dashboard Quản trị của Admin
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-layout/admin-layout').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard], 
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', loadComponent: () => import('./features/admin/admin-overview/admin-overview').then(m => m.AdminOverviewComponent) },
      { path: 'pending-partners', loadComponent: () => import('./features/admin/admin-pending-partners/admin-pending-partners').then(m => m.AdminPendingPartnersComponent) },
      { path: 'partners', loadComponent: () => import('./features/admin/admin-partners/admin-partners').then(m => m.AdminPartnersComponent) },
      { path: 'customers', loadComponent: () => import('./features/admin/admin-customers/admin-customers').then(m => m.AdminCustomersComponent) },
      { path: 'amenities', loadComponent: () => import('./features/admin/admin-amenities/admin-amenities').then(m => m.AdminAmenitiesComponent) },
      { path: 'bed-types', loadComponent: () => import('./features/admin/admin-bed-types/admin-bed-types').then(m => m.AdminBedTypesComponent) },
      { path: 'contacts', loadComponent: () => import('./features/admin/admin-contacts/admin-contacts').then(m => m.AdminContactsComponent) },
      { path: 'room-views', loadComponent: () => import('./features/admin/admin-room-views/admin-room-views').then(m => m.AdminRoomViewsComponent) },
      { path: 'promotions', loadComponent: () => import('./features/admin/admin-promotions/admin-promotions').then(m => m.AdminPromotionsComponent) },
      { path: 'transactions', loadComponent: () => import('./features/admin/admin-transactions/admin-transactions').then(m => m.TransactionsComponent) },
      { path: 'system-settings', loadComponent: () => import('./features/admin/admin-system-settings/admin-system-settings').then(m => m.SystemSettingsComponent) },
      { path: 'refunds', loadComponent: () => import('./features/admin/admin-refunds/admin-refunds').then(m => m.AdminRefundsComponent) },
      

    ]
  },

  // ==========================================
  // KHU VỰC DÀNH RIÊNG CHO ĐỐI TÁC (PARTNER)
  // ==========================================

  // Trang Dashboard Đối tác
  { 
    path: 'dashboard', 
    loadComponent: () => import('./features/partner/partner-dashboard/partner-dashboard').then(m => m.PartnerDashboardComponent),
    // canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      
      { path: 'overview', loadComponent: () => import('./features/partner/partner-overview/partner-overview').then(m => m.PartnerOverviewComponent) },
      
      { path: 'profile', loadComponent: () => import('./features/partner/partner-profile/partner-profile').then(m => m.PartnerProfileComponent) },

      { path: 'hotel', loadComponent: () => import('./features/partner/partner-hotel-profile/partner-hotel-profile').then(m => m.PartnerHotelProfileComponent) },
      { path: 'room-types', loadComponent: () => import('./features/partner/partner-room-types/partner-room-types').then(m => m.PartnerRoomTypesComponent) }, 
      { path: 'bookings', loadComponent: () => import('./features/partner/partner-bookings/partner-bookings').then(m => m.PartnerBookingsComponent) },
      { path: 'bookings/:id', loadComponent: () => import('./features/partner/partner-booking-detail/partner-booking-detail').then(m => m.PartnerBookingDetailComponent) },      
      { path: 'hotel-amenities', loadComponent: () => import('./features/partner/partner-amenities/partner-amenities').then(m => m.PartnerAmenitiesComponent) },
      { path: 'services', loadComponent: () => import('./features/partner/partner-services/partner-services').then(m => m.PartnerServicesComponent) },
      { path: 'minibar', loadComponent: () => import('./features/partner/partner-minibars/partner-minibars').then(m => m.PartnerMinibarsComponent) },
      { path: 'supplies', loadComponent: () => import('./features/partner/partner-supplies/partner-supplies').then(m => m.PartnerSuppliesComponent) },
      { path: 'promotions', loadComponent: () => import('./features/partner/partner-promotions/partner-promotions').then(m => m.PartnerPromotionsComponent) },
      { path: 'staffs', loadComponent: () => import('./features/partner/partner-staff/partner-staff').then(m => m.PartnerStaffComponent) },
      { path: 'partner-surcharge', loadComponent: () => import('./features/partner/partner-surcharge/partner-surcharge').then(m => m.PartnerSurchargeComponent) },
      { path: 'support', loadComponent: () => import('./features/partner/partner-support/partner-support').then(m => m.PartnerSupportComponent) },
      { path: 'roles', loadComponent: () => import('./features/partner/partner-role/partner-role').then(m => m.PartnerRoleComponent) },
      { path: 'inventory', loadComponent: () => import('./features/partner/partner-inventory/partner-inventory').then(m => m.PartnerInventoryComponent) },
      { path: 'room-matrix', loadComponent: () => import('./features/partner/partner-room-matrix/partner-room-matrix').then(m => m.PartnerRoomMatrixComponent) },
      { path: 'transactions', loadComponent: () => import('./features/partner/partner-transactions/partner-transactions').then(m => m.PartnerTransactionsComponent) },
      { path: 'customers', loadComponent: () => import('./features/partner/partner-customers/partner-customers').then(m => m.PartnerCustomersComponent) },
      { path: 'refunds', loadComponent: () => import('./features/partner/partner-refunds/partner-refunds').then(m => m.PartnerRefundsComponent) },
      { path: 'reviews', loadComponent: () => import('./features/partner/partner-reviews/partner-reviews').then(m => m.PartnerReviewsComponent) },
      
    ]
  },

  // ==========================================
  // ĐƯỜNG DẪN DỰ PHÒNG (WILDCARD ROUTE)
  // ==========================================
  { path: '**', redirectTo: 'login' }
];