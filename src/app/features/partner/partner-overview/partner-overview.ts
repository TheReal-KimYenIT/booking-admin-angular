import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import Chart from 'chart.js/auto';
import { HotelService } from '../../../services/hotel.service';

@Component({
  selector: 'app-partner-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './partner-overview.html',
  styleUrl: './partner-overview.css'
})
export class PartnerOverviewComponent implements OnInit {
  stats: any = {
    pending_orders: 0,
    total_room_types: 0,
    total_revenue: 0,
    occupancy_rate: 0,
    check_ins_today: 0,
    cancellation_rate: 0,
    most_booked_room: '',
    least_booked_room: '',
    revenue_chart: [],
    status_chart: [],
    room_type_chart: []
  };

  filterPeriod: string = 'month';
  revenueChart: any = null;
  statusChart: any = null;
  roomTypeChart: any = null;

  totalStatusCount: number = 0;
  statusBreakdown: any[] = [];
  roomTypeBreakdown: any[] = [];
  totalRoomBookings: number = 0;
  totalRoomRevenue: number = 0;
  totalPeriodRevenue: number = 0;
  maxPeriodRevenue: number = 0;

  roomSortBy: 'count' | 'revenue' = 'count';
  hoveredRoomIndex: number | null = null;
  isRoomChartHovered: boolean = false;

  statusMap: any = {
    0: 'Chờ thanh toán',
    1: 'Đã xác nhận',
    2: 'Đang ở',
    3: 'Đã trả phòng',
    4: 'Đã hủy',
    5: 'Khách không đến'
  };

  colorMap: any = {
    0: '#F59E0B', // Vàng cam cho Chờ thanh toán
    1: '#10B981', // Xanh lục cho Đã xác nhận
    2: '#3B82F6', // Xanh dương cho Đang ở
    3: '#8B5CF6', // Tím cho Đã trả phòng
    4: '#EF4444', // Đỏ cho Đã hủy
    5: '#64748B'  // Xám cho Khách không đến
  };

  roomPalette: string[] = [
    '#0EA5E9', // Sky blue
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#F43F5E', // Rose
    '#3B82F6', // Blue
    '#84CC16', // Lime
    '#A855F7', // Violet
    '#EAB308'  // Yellow
  ];

  constructor(
    private hotelService: HotelService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit() {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('partner_user') : null;
    if (userStr) {
      const user = JSON.parse(userStr);
      if (Number(user.role_id) === 3) {
        Swal.fire('Từ chối truy cập', 'Bạn là Lễ tân, không có quyền vào trang này!', 'error');
        this.router.navigate(['/dashboard/room-matrix']);
        return;
      }
    }

    if (isPlatformBrowser(this.platformId)) {
      this.loadStats();
    }
  }

  get periodTitle(): string {
    switch (this.filterPeriod) {
      case '7days':
      case 'day':
        return '7 ngày qua (1 tuần)';
      case '14days':
        return '14 ngày qua (2 tuần)';
      case '30days':
        return '30 ngày qua (1 tháng)';
      case 'month':
        return '6 tháng gần nhất';
      case 'year':
        return '5 năm qua';
      default:
        return 'kỳ này';
    }
  }

  setPeriod(period: string) {
    this.filterPeriod = period;
    this.loadStats();
  }

  loadStats() {
    this.hotelService.getDashboardStats(this.filterPeriod).subscribe({
      next: (res: any) => {
        this.stats = res;

        // 1. Phân tích chi tiết trạng thái đơn hàng
        this.totalStatusCount = (this.stats.status_chart || []).reduce(
          (sum: number, item: any) => sum + Number(item.count || 0), 0
        );

        this.statusBreakdown = (this.stats.status_chart || []).map((item: any) => {
          const count = Number(item.count || 0);
          const pct = this.totalStatusCount > 0 ? ((count / this.totalStatusCount) * 100).toFixed(1) : '0';
          return {
            status: item.status,
            label: this.statusMap[item.status] || 'Khác',
            count: count,
            percentage: pct,
            color: this.colorMap[item.status] || '#94A3B8'
          };
        });

        // 2. Phân tích chi tiết tất cả hạng phòng
        this.totalRoomBookings = (this.stats.room_type_chart || []).reduce(
          (sum: number, item: any) => sum + Number(item.count || 0), 0
        );
        this.totalRoomRevenue = (this.stats.room_type_chart || []).reduce(
          (sum: number, item: any) => sum + Number(item.revenue || 0), 0
        );

        this.updateRoomTypeBreakdown();

        // 3. Phân tích doanh thu theo kỳ
        this.totalPeriodRevenue = (this.stats.revenue_chart || []).reduce(
          (sum: number, item: any) => sum + Number(item.revenue || 0), 0
        );
        this.maxPeriodRevenue = Math.max(
          ...(this.stats.revenue_chart || []).map((item: any) => Number(item.revenue || 0)), 0
        );

        this.cdr.detectChanges();

        setTimeout(() => {
          this.renderRevenueChart();
          this.renderStatusChart();
          this.renderRoomTypeChart();
        }, 100);
      },
      error: (err: any) => console.log('Lỗi tải thống kê:', err)
    });
  }

  setRoomSort(sortBy: 'count' | 'revenue') {
    if (this.roomSortBy === sortBy) return;
    this.roomSortBy = sortBy;
    this.updateRoomTypeBreakdown();
  }

  updateRoomTypeBreakdown() {
    const raw = (this.stats.room_type_chart || []).slice();
    if (this.roomSortBy === 'revenue') {
      raw.sort((a: any, b: any) => Number(b.revenue || 0) - Number(a.revenue || 0));
    } else {
      raw.sort((a: any, b: any) => Number(b.count || 0) - Number(a.count || 0));
    }

    this.roomTypeBreakdown = raw.map((item: any, idx: number) => {
      const count = Number(item.count || 0);
      const revenue = Number(item.revenue || 0);
      const countPct = this.totalRoomBookings > 0 ? ((count / this.totalRoomBookings) * 100).toFixed(1) : '0';
      const revPct = this.totalRoomRevenue > 0 ? ((revenue / this.totalRoomRevenue) * 100).toFixed(1) : '0';
      return {
        name: item.room_type_name,
        count: count,
        revenue: revenue,
        countPercent: countPct,
        revenuePercent: revPct,
        color: this.roomPalette[idx % this.roomPalette.length]
      };
    });

    this.cdr.detectChanges();
    setTimeout(() => {
      this.renderRoomTypeChart();
    }, 50);
  }

  renderRevenueChart() {
    const ctx = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.revenueChart) {
      this.revenueChart.destroy();
    }

    const data = this.stats.revenue_chart || [];
    const labels = data.map((item: any) => item.label);
    const values = data.map((item: any) => item.revenue);

    const gradient = ctx.getContext('2d')?.createLinearGradient(0, 0, 0, 360);
    gradient?.addColorStop(0, 'rgba(99, 102, 241, 0.45)'); // Indigo
    gradient?.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    const isDense = this.filterPeriod === '30days';
    const isMedium = this.filterPeriod === '14days';
    const pointR = isDense ? 2.5 : (isMedium ? 3.5 : 4.5);
    const pointHoverR = isDense ? 5 : (isMedium ? 6 : 7);

    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Doanh thu (VNĐ)',
          data: values,
          borderColor: '#6366F1',
          backgroundColor: gradient,
          borderWidth: 3,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#6366F1',
          pointBorderWidth: 2,
          pointRadius: pointR,
          pointHoverRadius: pointHoverR
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: function (context: any) {
                let label = context.dataset.label || '';
                if (label) { label += ': '; }
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: {
              color: '#64748b',
              font: { weight: 500 },
              callback: function (value: any) {
                if (value >= 1000000) {
                  return (value / 1000000) + 'Tr';
                } else if (value >= 1000) {
                  return (value / 1000) + 'K';
                }
                return value;
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#64748b',
              font: { weight: 500 },
              maxTicksLimit: isDense ? 15 : (isMedium ? 14 : 10),
              autoSkip: true
            }
          }
        }
      }
    });
  }

  renderStatusChart() {
    const ctx = document.getElementById('statusChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.statusChart) {
      this.statusChart.destroy();
    }

    const data = this.stats.status_chart || [];
    const labels = data.map((item: any) => this.statusMap[item.status] || 'Khác');
    const values = data.map((item: any) => item.count);
    const bgColors = data.map((item: any) => this.colorMap[item.status] || '#CBD5E1');

    this.statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: bgColors,
          hoverOffset: 6,
          borderWidth: 2.5,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            display: false // Sử dụng danh sách trực quan tùy chỉnh bên cạnh
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: (context: any) => {
                const count = context.parsed;
                const pct = this.totalStatusCount > 0 ? ((count / this.totalStatusCount) * 100).toFixed(1) : '0';
                return ` ${context.label}: ${count} đơn (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  renderRoomTypeChart() {
    const ctx = document.getElementById('roomTypeChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.roomTypeChart) {
      this.roomTypeChart.destroy();
    }

    const data = this.roomTypeBreakdown || [];
    const labels = data.map((item: any) => item.name);
    const values = data.map((item: any) => this.roomSortBy === 'revenue' ? item.revenue : item.count);
    const colors = data.map((item: any) => item.color);

    this.roomTypeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          hoverOffset: 6,
          borderWidth: 2.5,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#ffffff',
            titleFont: { size: 12, weight: 'bold' },
            bodyColor: '#e2e8f0',
            bodyFont: { size: 11 },
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            boxPadding: 5,
            usePointStyle: true,
            callbacks: {
              title: (items: any[]) => {
                const idx = items[0]?.dataIndex;
                return data[idx]?.name || '';
              },
              label: (context: any) => {
                const item = data[context.dataIndex];
                if (!item) return '';
                return ` Đơn đặt: ${item.count} đơn (${item.countPercent}%)`;
              },
              afterLabel: (context: any) => {
                const item = data[context.dataIndex];
                if (!item) return '';
                const revStr = new Intl.NumberFormat('vi-VN').format(item.revenue);
                return ` Doanh thu: ${revStr} đ (${item.revenuePercent}%)`;
              }
            }
          }
        },
        onHover: (event: any, elements: any[]) => {
          this.isRoomChartHovered = elements && elements.length > 0;
          this.hoveredRoomIndex = elements && elements.length > 0 ? elements[0].index : null;
          this.cdr.detectChanges();
        }
      }
    });
  }

  onHoverRoomItem(idx: number): void {
    this.hoveredRoomIndex = idx;
    if (this.roomTypeChart) {
      this.roomTypeChart.setActiveElements([{ datasetIndex: 0, index: idx }]);
      this.roomTypeChart.tooltip?.setActiveElements([{ datasetIndex: 0, index: idx }], { x: 0, y: 0 });
      this.roomTypeChart.update();
    }
  }

  onLeaveRoomItem(): void {
    this.hoveredRoomIndex = null;
    if (this.roomTypeChart) {
      this.roomTypeChart.setActiveElements([]);
      this.roomTypeChart.tooltip?.setActiveElements([], { x: 0, y: 0 });
      this.roomTypeChart.update();
    }
  }

  onLeaveRoomChart(): void {
    this.isRoomChartHovered = false;
    this.hoveredRoomIndex = null;
    this.cdr.detectChanges();
  }
}