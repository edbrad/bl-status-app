declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import 'rxjs/Rx';
//
import { AuthenticationService } from './auth/auth.service';

@Injectable()
export class LoggingService {

  constructor(private http: Http, private authenticationService: AuthenticationService) { }

  // bl-status API endpoint root URL
  urlRoot: string = 'http://172.16.248.19:8080/api'; // test
  //urlRoot: string = 'http://172.16.168.210:8080/api'; // test2

  /**
   * @method addToLog
   * @description post a log message to the database
   * @param level  logging level (DEBUG, ERROR, WARNING, INFO)
   * @param message log message
   */
  addToLog(level: string, message: string) {
    var user = this.authenticationService.getUsername();
    // if no user, set as Guest
    if (!user.replace(/\s/g, '').length) {
      user = "GUEST";
    }
    return this.http.post(this.urlRoot + '/logs/',
      {
        timeStamp: moment().format(),
        user: user,
        ipAddress: "", // populated by API
        level: level,
        message: message
      })
      .map((response: Response) => {
        return response.json();
      });
  }
}
