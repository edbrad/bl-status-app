import { Injectable } from '@angular/core';
import { Http, Headers, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map'
//
import { ToastrService } from 'ngx-toastr';
//
import { User } from './user'


@Injectable()
export class AuthenticationService {

  constructor(private http: Http,
    private toastr: ToastrService) { }

  // API endpoint root URL
  //urlRoot: string = 'http://172.16.248.19:8080/api'; // test
  //urlRoot: string = 'http://172.16.168.210:8080/api'; // test 2
  public urlRoot: string = 'http://bl-status-api.emsmail.com/api'; // prod

  loggedInUser: string = "";            // currently logged in user (name)
  loggedIn: boolean = false;            // current logged in status
  loggedInRoles: string[] = ['None'];   // the assinged role(s) of the current user

  /**
   * @description Log into the application by posting username/password to the API and retrieving
   * an authentication token
   * @param username
   * @param password
   */
  login(username: string, password: string) {
    return this.http.post(this.urlRoot + '/authenticate/', { username: username, password: password })
      .map((response: Response) => {
        // login successful if there's a jwt token in the response
        let user = response.json();
        if (user && user.token) {
          // store user details and jwt token in local storage to keep user logged in between page refreshes
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.loggedIn = true;
          this.loggedInUser = user.user.username;
          this.loggedInRoles = [];
          this.loggedInRoles = user.user.roles;
          console.log('loggedIn: ' + this.loggedIn);
          console.log('loggedInUser: ' + this.loggedInUser);
          console.log('loggedInRoles: ' + this.loggedInRoles);
          console.log('Authentication successfull: ' + JSON.stringify(user));
          this.toastr.success(this.loggedInUser + ' Successfully Logged In!', 'bl-status: Authentication Service');
        }
        else {
          console.log('Authentication failed: ' + JSON.stringify(user));
          this.toastr.error('Log In Error!', 'bl-status: Authentication Service');
          this.loggedIn = false;
        }
        // return an JSON object containing the user information w/ success/fail result data
        return user;
      });
  }

  /**
   * @description clear all user info from local browser and application storage to log user out
   */
  logout() {
    if (this.loggedIn == true) {
      this.toastr.warning('Logged Out!', 'bl-status: Authentication Service');

    }
    this.loggedIn = false;
    this.loggedInUser = "";
    this.loggedInRoles = [];
    localStorage.removeItem('currentUser');
  }

  isLoggedIn() {
    return this.loggedIn;
  }

  getUsername() {
    return this.loggedInUser
  }

  /**
   * @description verfy that the currently stored authentication token has not expired
   *
   */
  checkExp(user: User) {
    return this.http.post(this.urlRoot + '/check-token-exp/', { user: user })
      .map((response: Response) => {
        return response.json();
      });
  }
}
