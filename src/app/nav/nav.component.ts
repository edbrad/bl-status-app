import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../auth/auth.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent implements OnInit {

  isCollapsed = true;

  loggedIn = false;

  logInText = "&nbsp;&nbsp Log In";

  constructor(private router: Router, private authenticationService: AuthenticationService) {
    console.log("logged in: " + this.loggedIn);
  }

  logout(){
    this.authenticationService.logout();
    this.router.navigate(['/home']);
  }


  ngOnInit() {
  }

}
