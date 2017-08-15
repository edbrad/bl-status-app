import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { HomeComponent } from './home/home.component';
import { SampleroomComponent } from './sampleroom/sampleroom.component';
import { PostalaccountingComponent } from './postalaccounting/postalaccounting.component';
import { DropshippingComponent } from './dropshipping/dropshipping.component';
import { AdminComponent } from './admin/admin.component';

const APP_ROUTES: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full'},
    { path: 'home', component: HomeComponent},
    { path: 'sampleroom', component: SampleroomComponent},
    { path: 'postalaccounting', component: PostalaccountingComponent},
    { path: 'dropshipping', component: DropshippingComponent},
    { path: 'sampleroom', component: SampleroomComponent},
    { path: 'admin', component: AdminComponent},
    { path: 'login', component: LoginComponent},
    // default route
    { path: '**', redirectTo: '/home', pathMatch: 'full'}
];

export const routing = RouterModule.forRoot(APP_ROUTES);
