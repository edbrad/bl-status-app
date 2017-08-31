import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
//
import { ToastrService } from 'ngx-toastr';
//
import { AuthenticationService } from './auth.service';
import { LoggingService } from '../logging.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  model: any = {};    // form data
  loading = false;    // button disable switch (during login)
  returnUrl: string;  // protected URL
  message: string;    // API messages

  logoImagePath: string = "../assets/EMS_Envelope_T.png";

  constructor(private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private logger: LoggingService,
    private toastr: ToastrService) { }

  ngOnInit() {
    // reset login status
    this.authenticationService.logout();

    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

    // log the event
    this.logger.addToLog("INFO", "Login Component activated.").subscribe((data => {
      const ack = data;
      if (!ack){
        this.toastr.error('Logging Error!', 'bl-status: Logging Service');
      }
    }));
  }

  /**
   * @method login
   * @description call the authentication service with the entered user name
   * and password from the login form
   */
  login() {
    this.loading = true;
    this.message = "";
    this.authenticationService.login(this.model.username, this.model.password)
      .subscribe(
      data => {
        // if login successful proceed to protected route
        if (data.success == true) {

          // log the event
          this.logger.addToLog("INFO", "Login successful: Username: " + this.model.username).subscribe((data => {
            const ack = data;
            if (!ack) {
              this.toastr.error('Logging Error!', 'bl-status: Logging Service');
            }
          }));

          this.router.navigate([this.returnUrl]);
        }
        // login failed - display API error message
        else{
          this.message =  JSON.stringify(data.message);
          // log the event
          this.logger.addToLog("ERROR", "Login Error: Username: " + this.model.username + " Error: " + this.message).subscribe((data => {
            const ack = data;
            if (!ack) {
              this.toastr.error('Logging Error!', 'bl-status: Logging Service');
            }
          }));
        }
      },
      error => {
        this.loading = false;
      });
      this.loading = false;
  }
}
