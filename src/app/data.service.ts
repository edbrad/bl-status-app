declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
// Angular 2/4 native libraries
import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import 'rxjs/Rx';

// custom services
import { AuthenticationService } from './auth/auth.service';

@Injectable()
export class DataService {

  // component constructor
  constructor(private http: Http, private authenticationService: AuthenticationService) { }

  // bl-status API endpoint root URL
  public urlRoot: string = 'http://172.16.248.19:8080/api'; // test
  //public urlRoot: string = 'http://172.16.248.19:8080/api'; // prod

  // pyACCESS (Job Ticket MS ACCESS db access) API endpoint root URL
  public urlJTRoot: string = 'http://172.16.44.21'; // prod
  //public urlJTRoot: string = 'http://172.16.44.21'; // test

  /**
   * @method apiTest
   * @desc connect to bl-status API test endpoint
   */
  public apiTest() {
    const url = this.urlRoot + '/';
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response);
  }

  /**
   * @method getAllStatuses
   * @desc get all the status records/documents from the bl-status API
   */
  public getAllStatuses() {
    const url = this.urlRoot + '/all-statuses/';
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response.json());
  }

  /**
   * @method getAPattern
   * @desc get a single record/document by the pattern code (9999-99x) from the bl-status API
   * @param {string} pattern the given pattern
   */
  public getAPattern(pattern: string) {
    const url = this.urlRoot + '/find-one-by-pattern/?pattern=' + pattern;
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response.json());
  }

  /**
   * @method deletePalletPDF
   * @desc call API to delete Pallet Tag PDF file from server and update status
   * @param {string} pattern the given pattern that is associated with the given file
   * @param {string} file the given file name for the given pattern
   */
  public deletePalletPDF(pattern: string, fileName: string){
    //console.log("file-delete DS!");
    var headers = new Headers({ 'Content-Type': 'application/json' });
    var options = new RequestOptions({ headers: headers });
    const url = this.urlRoot + '/file-delete/';
    var data = {
      pattern: pattern,
      fileName: fileName,
      fileType: "Pallet Tags"
    };
    return this.http.post(url, data, options)
      .map((response: Response) => response.json());
  }

  /**
   * @method updateStatusByPattern
   * @desc generic update status data by pattern code
   * @param {string} pattern given pattern code
   * @param {object} update given data to be updated
   */
  public updateStatusByPattern(pattern: string, update: object){
    //console.log("update DS!");
    var headers = new Headers({ 'Content-Type': 'application/json' });
    var options = new RequestOptions({ headers: headers });
    const url = this.urlRoot + '/update-many-by-pattern/';
    var data = {
      update_pattern: pattern,
      update_data: update
    };
    return this.http.put(url, data, options)
      .map((response: Response) => response.json());
  }

  /**
   * @method deleteWorksheetPDF
   * @description call API to delete Pallet Worksheet PDF file from server and update status
   * @param {string} pattern the given pattern that is associated with the given file
   * @param {string} file the given file name for the given pattern
   */
  public deleteWorksheetPDF(pattern: string, fileName: string){
    //console.log("file-delete DS!");
    var headers = new Headers({ 'Content-Type': 'application/json' });
    var options = new RequestOptions({ headers: headers });
    const url = this.urlRoot + '/file-delete/';
    var data = {
      pattern: pattern,
      fileName: fileName,
      fileType: "Pallet Worksheet"
    };
    return this.http.post(url, data, options)
      .map((response: Response) => response.json());
  }

  /**
   * @method getAJob
   * @description get job information for a single job from the pyACCESS (Job Ticket) API
   * @param {string} jobnum the given EMS Job number
   */
  public getAJob(jobnum: string) {
    const url = this.urlJTRoot + '/api/jobnum-search?jobnum=' + jobnum;
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response.json());
  }

  /**
   * @method getClients
   * @description get all the clients from the pyACCESS (Job Ticket) API
   */
  public getClients() {
    const url = this.urlJTRoot + '/api/companies';
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response.json());
  }

  /**
   * @method getJobDetails
   * @description get all the Job Details (patterns) for a given job from the pyACCESS (Job Ticket) API
   * @param {string} jobnum provided Job Number
   */
  public getJobDetails(jobnum: string) {
    const url = this.urlJTRoot + '/api/jobdetails?jobnum=' + jobnum;
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response.json());
  }

}
