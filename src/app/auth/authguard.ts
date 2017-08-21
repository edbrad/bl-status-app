import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthenticationService } from './auth.service';
import { User } from './user';
import 'rxjs/add/operator/first';
import { Observable } from "rxjs/Rx";
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class AuthGuard implements CanActivate {

    constructor(private router: Router, private authenticationService: AuthenticationService, private toastr: ToastrService) { }
    user: User;
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean>|boolean {
      if (localStorage.getItem('currentUser')) {
        this.user = JSON.parse(localStorage.getItem('currentUser'));
        return this.authenticationService.checkExp(this.user)
        .map(
        data => {
          console.log('expiration object: ' + JSON.stringify(data))
          if (data.expired  == false) {
            // logged in and token not expired, so return true
            console.log("token-okay!")
            return true;
          }
          else {
            // expired token so redirect to login page with the return url
            console.log("bad-token!")
            this.toastr.error('Session Expired - Re-Authentication Required!', 'bl-status: Authentication Service');
            this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
            return false;
          }
        },
        error => {
          //this.alertService.error(error);
          console.log('error');
        }).first();
      }
      else {
        // not logged in so redirect to login page with the return url
        this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }
    }
}
