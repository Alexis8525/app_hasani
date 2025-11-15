import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <h1>Dashboard</h1>
      <p>Bienvenido al sistema de inventarios</p>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 20px;
    }
  `]
})
export class DashboardComponent { }
