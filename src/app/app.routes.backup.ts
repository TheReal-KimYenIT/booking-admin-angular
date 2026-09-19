import { Routes } from '@angular/router';

// ==========================================
// IMPORT CÁC COMPONENT AUTH
// ==========================================
import { LoginComponent } from './features/auth/login/login';
import { PartnerRegisterComponent } from './features/auth/partner-register/partner-register';

// ==========================================
// IMPORT CÁC COMPONENT CỦA ADMIN
// ==========================================
import { AdminLoginComponent } from './features/admin/admin-login/admin-login';
import { AdminLayoutComponent } from './features/admin/admin-layout/admin-layout';
import { AdminOverviewComponent } from './features/admin/admin-overview/admin-overview';
import { AdminPendingPartnersComponent } from './features/admin/admin-pending-partners/admin-pending-partners';
import { AdminPartnersComponent } from './features/admin/admin-partners/admin-partners';
import { AdminCustomersComponent } from './features/admin/admin-customers/admin-customers';
import { AdminAmenitiesComponent } from './features/admin/admin-amenities/admin-amenities';
import { AdminBedTypesComponent } from './features/admin/admin-bed-types/admin-bed-types';
import { AdminRoomViewsComponent } from './features/admin/admin-room-views/admin-room-views';
import { AdminContactsComponent } from './features/admin/admin-contacts/admin-contacts';
import { AdminPromotionsComponent } from './features/admin/admin-promotions/admin-promotions';
import { TransactionsComponent } from './features/admin/admin-transactions/admin-transactions';
import { SystemSettingsComponent } from './features/admin/admin-system-settings/admin-system-settings';
import { AdminRefundsComponent } from './features/admin/admin-refunds/admin-refunds';


// ==========================================
// IMPORT CÁC COMPONENT CỦA ĐỐI TÁC (PARTNER)
// ==========================================
import { PartnerDashboardComponent } from './features/partner/partner-dashboard/partner-dashboard';
import { PartnerOverviewComponent } from './features/partner/partner-overview/partner-overview';
import { PartnerHotelProfileComponent } from './features/partner/partner-hotel-profile/partner-hotel-profile';
import { PartnerRoomTypesComponent } from './features/partner/partner-room-types/partner-room-types';
import { PartnerBookingsComponent } from './features/partner/partner-bookings/partner-bookings';
import { PartnerBookingDetailComponent } from './features/partner/partner-booking-detail/partner-booking-detail';
import { PartnerAmenitiesComponent } from './features/partner/partner-amenities/partner-amenities'; 
import { PartnerServicesComponent } from './features/partner/partner-services/partner-services';
import { PartnerMinibarsComponent } from './features/partner/partner-minibars/partner-minibars';
import { PartnerSuppliesComponent } from './features/partner/partner-supplies/partner-supplies';
import { PartnerSurchargeComponent } from './features/partner/partner-surcharge/partner-surcharge';
import { PartnerPromotionsComponent } from './features/partner/partner-promotions/partner-promotions';
import { PartnerStaffComponent } from './features/partner/partner-staff/partner-staff';
import { PartnerSupportComponent } from './features/partner/partner-support/partner-support';
import { PartnerRoleComponent } from './features/partner/partner-role/partner-role';
import { PartnerProfileComponent } from './features/partner/partner-profile/partner-profile';
import { PartnerInventoryComponent } from './features/partner/partner-inventory/partner-inventory';
import { PartnerRoomMatrixComponent } from './features/partner/partner-room-matrix/partner-room-matrix';
// Import Guard bảo vệ route (Nếu bạn đã tạo auth-guard)
import { authGuard } from './core/guards/auth-guard';

import { PartnerTransactionsComponent } from './features/partner/partner-transactions/partner-transactions';
import { PartnerCustomersComponent } from './features/partner/partner-customers/partner-customers';
import { PartnerRefundsComponent } from './features/partner/partner-refunds/partner-refunds';
import { PartnerReviewsComponent } from './features/partner/partner-reviews/partner-reviews';

export const routes: Routes = [
  // Mặc định khi vào web sẽ chuyển hướng đến trang Đăng nhập
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  
  // ==========================================
  // KHU VỰC ĐĂNG NHẬP / ĐĂNG KÝ
  // ==========================================
  { path: 'login', component: LoginComponent },
  { path: 'partner/register', component: PartnerRegisterComponent },

  // ==========================================
  // KHU VỰC DÀNH RIÊNG CHO ADMIN
  // ==========================================
  
  // 1. Cổng đăng nhập riêng cho Admin
  { path: 'admin/login', component: AdminLoginComponent },

  // 2. Hệ thống Dashboard Quản trị của Admin
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard], 
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: AdminOverviewComponent },
      { path: 'pending-partners', component: AdminPendingPartnersComponent },
      { path: 'partners', component: AdminPartnersComponent },
      { path: 'customers', component: AdminCustomersComponent },
      { path: 'amenities', component: AdminAmenitiesComponent },
      { path: 'bed-types', component: AdminBedTypesComponent },
      { path: 'contacts', component: AdminContactsComponent },
      { path: 'room-views', component: AdminRoomViewsComponent },
      { path: 'promotions', component: AdminPromotionsComponent },
      { path: 'transactions', component: TransactionsComponent },
      { path: 'system-settings', component: SystemSettingsComponent },
      { path: 'refunds', component: AdminRefundsComponent },
      

    ]
  },

  // ==========================================
  // KHU VỰC DÀNH RIÊNG CHO ĐỐI TÁC (PARTNER)
  // ==========================================

  // Trang Dashboard Đối tác
  { 
    path: 'dashboard', 
    component: PartnerDashboardComponent,
    // canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      
      { path: 'overview', component: PartnerOverviewComponent },
      
      { path: 'profile', component: PartnerProfileComponent },

      { path: 'hotel', component: PartnerHotelProfileComponent },
      { path: 'room-types', component: PartnerRoomTypesComponent }, 
      { path: 'bookings', component: PartnerBookingsComponent },
      { path: 'bookings/:id', component: PartnerBookingDetailComponent },      
      { path: 'hotel-amenities', component: PartnerAmenitiesComponent },
      { path: 'services', component: PartnerServicesComponent },
      { path: 'minibar', component: PartnerMinibarsComponent },
      { path: 'supplies', component: PartnerSuppliesComponent },
      { path: 'promotions', component: PartnerPromotionsComponent },
      { path: 'staffs', component: PartnerStaffComponent },
      { path: 'partner-surcharge', component: PartnerSurchargeComponent },
      { path: 'support', component: PartnerSupportComponent },
      { path: 'roles', component: PartnerRoleComponent },
      { path: 'inventory', component: PartnerInventoryComponent },
      { path: 'room-matrix', component: PartnerRoomMatrixComponent },
      { path: 'transactions', component: PartnerTransactionsComponent },
      { path: 'customers', component: PartnerCustomersComponent },
      { path: 'refunds', component: PartnerRefundsComponent },
      { path: 'reviews', component: PartnerReviewsComponent },
      
    ]
  },

  // ==========================================
  // ĐƯỜNG DẪN DỰ PHÒNG (WILDCARD ROUTE)
  // ==========================================
  { path: '**', redirectTo: 'login' }
];