import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthenticationService } from './auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  model: any = {};
  loading = false;
  returnUrl: string;
  message: string;

  constructor(private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService) { }

  ngOnInit() {
    // reset login status
    this.authenticationService.logout();

    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  login() {
    this.loading = true;
    this.message = "";
    this.authenticationService.login(this.model.username, this.model.password)
      .subscribe(
      data => {
        console.log("data: " + JSON.stringify(data))
        if (data.success == true) {
          this.router.navigate([this.returnUrl]);
        }
        else{
          this.message =  JSON.stringify(data.message);
        }
      },
      error => {
        //this.alertService.error(error);
        this.loading = false;
      });
      this.loading = false;
  }
}
