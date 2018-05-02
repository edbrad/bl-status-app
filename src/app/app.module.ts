import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { enableProdMode } from '@angular/core';

// 3rd-party/open-source components
import { CollapseModule } from 'ngx-bootstrap';
import { ModalModule } from 'ngx-bootstrap/modal';
import { Daterangepicker } from 'ng2-daterangepicker';
import { ToastrModule } from 'ngx-toastr';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ChartsModule } from 'ng2-charts';
//import { FileSelectDirective } from 'ng2-file-upload';
import { FileUploadModule } from 'ng2-file-upload';
import { LoadingModule, ANIMATION_TYPES } from 'ngx-loading';
import { SelectModule } from 'ng2-select';
import { TabsModule } from 'ngx-bootstrap/tabs';

// custom services
import { AuthenticationService } from './auth/auth.service';
import { AuthGuard } from './auth/authguard';
import { DataService } from './data.service';
import { LoggingService } from './logging.service';

// custom components
import { routing } from './app.routing';
import { AppComponent } from './app.component';
import { NavComponent } from './nav/nav.component';
import { FooterComponent } from './footer/footer.component';
import { LoginComponent } from './auth/login.component';
import { HomeComponent } from './home/home.component';
import { SampleroomComponent } from './sampleroom/sampleroom.component';
import { PostalaccountingComponent } from './postalaccounting/postalaccounting.component';
import { PostalaccountingDetailsComponent } from './postalaccounting-details/postalaccounting-details.component'
import { DropshippingComponent } from './dropshipping/dropshipping.component';
import { AdminComponent } from './admin/admin.component';

// custom pipes/filters
import { AddCommasPipe } from './add-commas.pipe';
import { SampleroomDetailsComponent } from './sampleroom-details/sampleroom-details.component';

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
    AdminComponent,
    AddCommasPipe,
    //FileSelectDirective,
    PostalaccountingDetailsComponent,
    SampleroomDetailsComponent
  ],
  imports: [
    BrowserModule,
    CollapseModule,
    routing,
    FormsModule,
    HttpModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      timeOut: 5000,
      positionClass: 'toast-top-center',
      preventDuplicates: true,
    }),
    NgxDatatableModule,
    Daterangepicker,
    ChartsModule,
    FileUploadModule,
    ModalModule.forRoot(),
    LoadingModule.forRoot({
      animationType: ANIMATION_TYPES.threeBounce,
      backdropBackgroundColour: 'rgba(0,0,0,0.1)',
      backdropBorderRadius: '4px',
      fullScreenBackdrop: true,
      primaryColour: '#ffffff',
      secondaryColour: '#ffffff',
      tertiaryColour: '#ffffff'
  }),
    SelectModule,
    TabsModule.forRoot(),
  ],
  providers: [
    AuthGuard,
    AuthenticationService,
    DataService,
    LoggingService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
