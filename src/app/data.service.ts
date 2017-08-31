declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import 'rxjs/Rx';
//
import { AuthenticationService } from './auth/auth.service';

@Injectable()
export class DataService {

  constructor(private http: Http, private authenticationService: AuthenticationService) { }

  // bl-status API endpoint root URL
  urlRoot: string = 'http://172.16.248.19:8080/api'; // test
  // pyACCESS (Job Ticket) API endpoint root URL
  urlJTRoot: string = 'http://172.16.44.21'; // prod

  /**
   * @method apiTest
   * @description connect to bl-status API test endpoint
   */
  apiTest() {
    const url = this.urlRoot + '/';
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response);
  }
  /**
   * @method getAllStatuses
   * @description get all the status records/documents from the bl-status API
   */
  getAllStatuses() {
    const url = this.urlRoot + '/all-statuses/';
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response.json());
  }

  /**
   * @method getAJob
   * @description get job information for a single job from the pyACCESS (Job Ticket) API
   */
  getAJob(jobnum) {
    const url = this.urlJTRoot + '/api/jobnum-search?jobnum=' + jobnum;
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response.json());
  }

  /**
   * @method getClients
   * @description get all the clients from the pyACCESS (Job Ticket) API
   */
  getClients() {
    const url = this.urlJTRoot + '/api/companies';
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response.json());
  }

  /**
   * @method getJobDetails
   * @description get all the Job Details (patterns) for a given job from the pyACCESS (Job Ticket) API
   * @param jobnum provided Job Number
   */
  getJobDetails(jobnum) {
    const url = this.urlJTRoot + '/api/jobdetails?jobnum=' + jobnum;
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response.json());
  }

}
