import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { MainContainerComponent } from './layout/main-container/main-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, NavbarComponent, MainContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
