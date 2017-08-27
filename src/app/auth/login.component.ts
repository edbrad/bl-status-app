import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthenticationService } from './auth.service';

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
    private authenticationService: AuthenticationService) { }

  ngOnInit() {
    // reset login status
    this.authenticationService.logout();

    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
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
          this.router.navigate([this.returnUrl]);
        }
        // login failed - display API error message
        else{
          this.message =  JSON.stringify(data.message);
        }
      },
      error => {
        this.loading = false;
      });
      this.loading = false;
  }
}
