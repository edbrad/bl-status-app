import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { CollapseModule } from 'ngx-bootstrap';

import { routing } from './app.routing';
import { AppComponent } from './app.component';
import { NavComponent } from './nav/nav.component';
import { FooterComponent } from './footer/footer.component';
import { LoginComponent } from './auth/login.component';
import { HomeComponent } from './home/home.component';
import { SampleroomComponent } from './sampleroom/sampleroom.component';
import { PostalaccountingComponent } from './postalaccounting/postalaccounting.component';
import { DropshippingComponent } from './dropshipping/dropshipping.component';
import { AdminComponent } from './admin/admin.component';

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    FooterComponent,
    LoginComponent,
    HomeComponent,
    SampleroomComponent,
    PostalaccountingComponent,
    DropshippingComponent,
    AdminComponent
  ],
  imports: [
    BrowserModule,
    CollapseModule,
    routing,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
