// layout/main-layout/main-layout.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarComponent],
  template: `
    <div class="layout-container">
      <app-header (toggleSidebar)="toggleSidebar()"></app-header>
      
      <app-sidebar 
        [class.mobile-open]="isSidebarOpen"
        [class.collapsed]="isSidebarCollapsed">
      </app-sidebar>
      
      <main class="main-content" [class.sidebar-open]="!isSidebarCollapsed">
        <div class="content-wrapper">
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- Overlay para móvil -->
      <div 
        class="overlay" 
        [class.active]="isSidebarOpen"
        (click)="closeSidebar()">
      </div>
    </div>
  `,
  styles: [`
    .layout-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .main-content {
      margin-top: 60px;
      margin-left: 0;
      transition: margin-left 0.3s ease;
      min-height: calc(100vh - 60px);
      background: #f8f9fa;
    }

    .main-content.sidebar-open {
      margin-left: 250px;
    }

    .content-wrapper {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 998;
    }

    .overlay.active {
      display: block;
    }

    @media (max-width: 768px) {
      .main-content {
        margin-left: 0 !important;
      }

      .main-content.sidebar-open {
        margin-left: 0;
      }
    }
  `]
})
export class MainLayoutComponent {
  isSidebarCollapsed = false;
  isSidebarOpen = false;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }
}
