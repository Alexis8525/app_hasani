// layout/sidebar/sidebar.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  active: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.collapsed]="isCollapsed">
      <nav class="sidebar-nav">
        <div class="menu-section">
          <h3 class="section-title">Dashboard</h3>
          <ul class="menu-list">
            <li>
              <a 
                routerLink="/dashboard" 
                class="menu-item"
                [class.active]="isActive('/dashboard')"
                routerLinkActive="active">
                <span class="menu-icon"></span>
                <span class="menu-label">Dashboard</span>
              </a>
            </li>
          </ul>
        </div>

        <div class="menu-section">
          <h3 class="section-title">Gestión</h3>
          <ul class="menu-list">
            <li>
              <a 
                routerLink="/usuarios" 
                class="menu-item"
                [class.active]="isActive('/usuarios')"
                routerLinkActive="active">
                <span class="menu-icon"></span>
                <span class="menu-label">Usuarios</span>
              </a>
            </li>
            <li>
              <a 
                routerLink="/clientes" 
                class="menu-item"
                [class.active]="isActive('/clientes')"
                routerLinkActive="active">
                <span class="menu-icon"></span>
                <span class="menu-label">Clientes</span>
              </a>
            </li>
            <li>
              <a 
                routerLink="/proveedores" 
                class="menu-item"
                [class.active]="isActive('/proveedores')"
                routerLinkActive="active">
                <span class="menu-icon"></span>
                <span class="menu-label">Proveedores</span>
              </a>
            </li>
          </ul>
        </div>

        <div class="menu-section">
          <h3 class="section-title">Inventario</h3>
          <ul class="menu-list">
            <li>
              <a 
                routerLink="/productos" 
                class="menu-item"
                [class.active]="isActive('/productos')"
                routerLinkActive="active">
                <span class="menu-icon"></span>
                <span class="menu-label">Productos</span>
              </a>
            </li>
            <li>
              <a 
                routerLink="/movimientos" 
                class="menu-item"
                [class.active]="isActive('/movimientos')"
                routerLinkActive="active">
                <span class="menu-icon"></span>
                <span class="menu-label">Movimientos</span>
              </a>
            </li>
            <li>
              <a 
                routerLink="/bitacora" 
                class="menu-item"
                [class.active]="isActive('/bitacora')"
                routerLinkActive="active">
                <span class="menu-icon"></span>
                <span class="menu-label">Bitácora</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="toggle-btn" (click)="toggleCollapse()">
          {{ isCollapsed ? '→' : '←' }}
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      position: fixed;
      top: 60px;
      left: 0;
      bottom: 0;
      width: 250px;
      background: #2c3e50;
      color: white;
      transition: all 0.3s ease;
      overflow-y: auto;
      z-index: 999;
    }

    .sidebar.collapsed {
      width: 60px;
    }

    .sidebar-nav {
      padding: 1rem 0;
    }

    .menu-section {
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #bdc3c7;
      padding: 0 1rem;
      margin-bottom: 0.5rem;
      transition: all 0.3s ease;
    }

    .sidebar.collapsed .section-title {
      opacity: 0;
      height: 0;
      margin: 0;
      padding: 0;
    }

    .menu-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .menu-item {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      color: #ecf0f1;
      text-decoration: none;
      transition: all 0.3s ease;
      border-left: 3px solid transparent;
    }

    .menu-item:hover {
      background: #34495e;
      color: white;
    }

    .menu-item.active {
      background: #3498db;
      color: white;
      border-left-color: #2980b9;
    }

    .menu-icon {
      font-size: 1.2rem;
      margin-right: 0.75rem;
      min-width: 20px;
      text-align: center;
    }

    .menu-label {
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .sidebar.collapsed .menu-label {
      opacity: 0;
      width: 0;
      height: 0;
      overflow: hidden;
    }

    .sidebar-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 1rem;
      border-top: 1px solid #34495e;
    }

    .toggle-btn {
      background: #34495e;
      color: white;
      border: none;
      width: 100%;
      padding: 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .toggle-btn:hover {
      background: #3498db;
    }

    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
      }

      .sidebar.mobile-open {
        transform: translateX(0);
      }

      .sidebar.collapsed {
        width: 250px;
        transform: translateX(-100%);
      }

      .sidebar.collapsed.mobile-open {
        transform: translateX(0);
      }
    }
  `]
})
export class SidebarComponent {
  private router = inject(Router);

  isCollapsed = false;

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }
}
