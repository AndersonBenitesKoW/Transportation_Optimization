import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/ui/icon.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  truck = 'truck';
  zap = 'zap';
  shield = 'shield';
  wrench = 'wrench';
  barChart3 = 'bar-chart-3';
  bellRing = 'bell-ring';
  trendingUp = 'trending-up';
}
