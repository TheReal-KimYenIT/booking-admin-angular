import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Chart from 'chart.js/auto';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-overview.html',
  styleUrl: './admin-overview.css',
  providers: [DecimalPipe]
})
export class AdminOverviewComponent implements OnInit, OnDestroy {
  stats: any = {
    total_partners: 0,
    pending_partners: 0,
    total_customers: 0,
    total_bookings: 0,
    total_all_bookings: 0,
    success_rate: 0,
    cancellation_rate: 0,
    total_platform_revenue: 0,
    total_gmv: 0,
    avg_booking_value: 0,
    growth_rate: null,
    revenue_chart: [],
    partner_chart: [],
    system_status_chart: [],
    payment_methods_chart: [],
    city_stats: [],
    revenue_by_hotel: [],
    top_3_hotels: [],
    top_hotel: null,
    bottom_hotel: null,
    recent_bookings: []
  };

  revenueChart: any = null;
  revenueByHotelChart: any = null;
  paymentMethodsChart: any = null;
  systemStatusChart: any = null;
  cityChart: any = null;
  partnerChart: any = null;
  
  selectedPeriod: string = 'month';
  isLoading: boolean = false;
  lastUpdated: string = '';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchDashboardStats();
    }
  }

  ngOnDestroy(): void {
    this.destroyAllCharts();
  }

  private destroyAllCharts(): void {
    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }
    if (this.revenueByHotelChart) {
      this.revenueByHotelChart.destroy();
      this.revenueByHotelChart = null;
    }
    if (this.paymentMethodsChart) {
      this.paymentMethodsChart.destroy();
      this.paymentMethodsChart = null;
    }
    if (this.systemStatusChart) {
      this.systemStatusChart.destroy();
      this.systemStatusChart = null;
    }
    if (this.cityChart) {
      this.cityChart.destroy();
      this.cityChart = null;
    }
    if (this.partnerChart) {
      this.partnerChart.destroy();
      this.partnerChart = null;
    }
  }

  setPeriod(period: string) {
    if (this.selectedPeriod === period) return;
    this.selectedPeriod = period;
    this.fetchDashboardStats();
  }

  fetchDashboardStats() {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.http.get(`${environment.apiUrl}/admin/dashboard-stats?period=${this.selectedPeriod}`).subscribe({
      next: (res: any) => {
        this.stats = res;
        this.isLoading = false;
        const now = new Date();
        this.lastUpdated = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.renderRevenueChart();
          this.renderRevenueByHotelChart();
          this.renderPaymentMethodsChart();
          this.renderSystemStatusChart();
          this.renderCityChart();
        }, 60);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.cdr.detectChanges();
        console.error('=== LỖI KHI GỌI API DASHBOARD ===', err);
      }
    });
  }

  // 1. Biểu đồ dòng tiền song hành (Dual Area Line Chart: GMV vs Hoa hồng StayHub)
  renderRevenueChart() {
    const ctx = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    if (this.revenueChart) {
      this.revenueChart.destroy();
    }

    const data = this.stats.revenue_chart || [];
    const labels = data.map((item: any) => item.label);
    const commissionValues = data.map((item: any) => item.revenue || 0);
    const gmvValues = data.map((item: any) => item.gmv || 0);

    const canvasCtx = ctx.getContext('2d');
    
    // Gradient cho Hoa hồng (Rose-Red)
    const roseGradient = canvasCtx?.createLinearGradient(0, 0, 0, 350);
    roseGradient?.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
    roseGradient?.addColorStop(1, 'rgba(244, 63, 94, 0.01)');

    // Gradient cho Tổng GMV (Emerald-Teal)
    const tealGradient = canvasCtx?.createLinearGradient(0, 0, 0, 350);
    tealGradient?.addColorStop(0, 'rgba(20, 184, 166, 0.35)');
    tealGradient?.addColorStop(1, 'rgba(20, 184, 166, 0.01)');

    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Tổng GMV Phòng',
            data: gmvValues,
            borderColor: '#14B8A6',
            backgroundColor: tealGradient,
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#14B8A6',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Hoa hồng StayHub (15%)',
            data: commissionValues,
            borderColor: '#F43F5E',
            backgroundColor: roseGradient,
            borderWidth: 3,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#F43F5E',
            pointBorderWidth: 2.5,
            pointRadius: 5,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false // Dùng custom HTML legend phía trên
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleColor: '#F8FAFC',
            bodyColor: '#F1F5F9',
            titleFont: { size: 13, family: 'Inter', weight: 'bold' },
            bodyFont: { size: 13, family: 'Inter' },
            padding: 12,
            cornerRadius: 10,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const val = context.parsed.y !== null ? context.parsed.y : 0;
                return ` ${label}: ${new Intl.NumberFormat('vi-VN').format(val)}đ`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(226, 232, 240, 0.6)'
            },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#64748B',
              callback: (val: any) => {
                if (val >= 1000000) return (val / 1000000).toFixed(0) + ' Tr';
                if (val >= 1000) return (val / 1000).toFixed(0) + ' K';
                return val;
              }
            },
            border: { display: false }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#64748B'
            },
            border: { display: false }
          }
        }
      }
    });
  }

  // 2. Biểu đồ Top Đối Tác theo Doanh Thu (Horizontal Bar Chart - Sạch đẹp không bị nghiêng chữ)
  renderRevenueByHotelChart() {
    const ctx = document.getElementById('revenueByHotelChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    if (this.revenueByHotelChart) {
      this.revenueByHotelChart.destroy();
    }

    const data = this.stats.revenue_by_hotel || [];
    const labels = data.map((item: any) => {
      let name = item.name || '';
      name = name.replace('Thành phố ', 'TP. ');
      return name.length > 35 ? name.substring(0, 33) + '...' : name;
    });
    const commissionValues = data.map((item: any) => item.total_commission || 0);

    this.revenueByHotelChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Hoa hồng StayHub',
          data: commissionValues,
          backgroundColor: [
            '#F59E0B', // #1 Vàng
            '#6366F1', // #2 Indigo
            '#3B82F6', // #3 Xanh dương
            '#06B6D4', // #4 Cyan
            '#14B8A6'  // #5 Teal
          ],
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.75,
          categoryPercentage: 0.85
        }]
      },
      options: {
        indexAxis: 'y', // Thanh ngang giải quyết triệt để chữ nghiêng 45 độ
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleFont: { size: 13, family: 'Inter', weight: 'bold' },
            bodyFont: { size: 12, family: 'Inter' },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex;
                return data[idx]?.name || '';
              },
              label: (context) => {
                const idx = context.dataIndex;
                const hotel = data[idx];
                const comm = new Intl.NumberFormat('vi-VN').format(hotel?.total_commission || 0);
                const gmv = new Intl.NumberFormat('vi-VN').format(hotel?.total_gmv || 0);
                return [
                  ` Hoa hồng sàn: ${comm}đ`,
                  ` Tổng GMV phòng: ${gmv}đ`,
                  ` Số đơn hoàn tất: ${hotel?.booking_count || 0} đơn`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: {
              font: { family: 'Inter', size: 11, weight: 'bold' },
              color: '#64748B',
              callback: (val: any) => {
                if (val >= 1000000) return (val / 1000000).toFixed(0) + 'Tr';
                if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
                return val;
              }
            },
            border: { display: false }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family: 'Inter', size: 12, weight: 'bold' },
              color: '#0F172A'
            },
            border: { display: false }
          }
        }
      }
    });
  }

  // 3. Biểu đồ Cơ Cấu Phương Thức Thanh Toán (Doughnut Chart)
  renderPaymentMethodsChart() {
    const ctx = document.getElementById('paymentMethodsChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    if (this.paymentMethodsChart) {
      this.paymentMethodsChart.destroy();
    }

    const data = this.stats.payment_methods_chart || [];
    const labels = data.map((item: any) => item.name);
    const values = data.map((item: any) => item.total);
    const colors = data.map((item: any) => item.color);

    this.paymentMethodsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const idx = context.dataIndex;
                const item = data[idx];
                const totalFormatted = new Intl.NumberFormat('vi-VN').format(item.total);
                return ` ${item.name}: ${totalFormatted}đ (${item.percent}%)`;
              }
            }
          }
        }
      }
    });
  }

  // 4. Biểu đồ Tỷ Lệ Đơn Hàng (Thành công / Hủy / No-show)
  renderSystemStatusChart() {
    const ctx = document.getElementById('systemStatusChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    if (this.systemStatusChart) {
      this.systemStatusChart.destroy();
    }

    const data = this.stats.system_status_chart || [];
    const labels = data.map((item: any) => item.status);
    const values = data.map((item: any) => item.count);

    this.systemStatusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: ['#10B981', '#EF4444', '#64748B'],
          borderWidth: 2,
          borderColor: '#FFFFFF',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const idx = context.dataIndex;
                const item = data[idx];
                return ` ${item.status}: ${item.count} đơn (${item.percent}%)`;
              }
            }
          }
        }
      }
    });
  }

  // 5. Biểu đồ Phân Bố Khách Sạn Theo Tỉnh/Thành Phố (City Distribution Bar Chart)
  renderCityChart() {
    const ctx = document.getElementById('cityChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    if (this.cityChart) {
      this.cityChart.destroy();
    }

    const data = this.stats.city_stats || [];
    const labels = data.map((item: any) => {
      let c = item.city || 'Khác';
      c = c.replace('Thành phố ', 'TP. ').replace('Tỉnh ', '');
      return c;
    });
    const values = data.map((item: any) => item.count || 0);

    this.cityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Số khách sạn đối tác',
          data: values,
          backgroundColor: [
            '#38BDF8', // Xanh biển
            '#818CF8', // Indigo
            '#A78BFA', // Tím nhạt
            '#F472B6', // Hồng
            '#FB923C'  // Cam
          ],
          borderRadius: 6,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => ` ${context.parsed.y} khách sạn đã duyệt`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#64748B', font: { family: 'Inter' } },
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            border: { display: false }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#0F172A', font: { family: 'Inter', size: 11.5, weight: 'bold' } },
            border: { display: false }
          }
        }
      }
    });
  }

  // Helper hiển thị badge trạng thái đơn hàng
  getBookingStatusBadge(status: number): { label: string, badgeClass: string, icon: string } {
    switch (status) {
      case 1:
        return { label: 'Đã xác nhận', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'bi-check-circle-fill' };
      case 2:
        return { label: 'Đã nhận phòng', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'bi-door-open-fill' };
      case 3:
        return { label: 'Hoàn tất', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200', icon: 'bi-patch-check-fill' };
      case 4:
        return { label: 'Đã hủy', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'bi-x-circle-fill' };
      case 5:
        return { label: 'No-show', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300', icon: 'bi-person-x-fill' };
      default:
        return { label: 'Chờ xử lý', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'bi-clock-history' };
    }
  }
}
