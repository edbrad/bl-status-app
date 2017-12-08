declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
// Angular 2/4 native libraries
import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptions, ResponseContentType } from '@angular/http';
import 'rxjs/Rx';

// custom services
import { AuthenticationService } from './auth/auth.service';

@Injectable()
export class DataService {

  // component constructor
  constructor(private http: Http, private authenticationService: AuthenticationService) { }

  // bl-status API endpoint root URL
  //public urlRoot: string = 'http://172.16.248.19:8080/api'; // test
  public urlRoot: string = 'http://172.16.168.210:8080/api'; // test2
  //public urlRoot: string = 'http://bl-status-api.emsmail.com/api/'; // prod

  // pyACCESS (Job Ticket MS ACCESS db access) API endpoint root URL
  public urlJTRoot: string = 'http://172.16.44.21'; // prod
  //public urlJTRoot: string = 'http://172.16.44.21'; // test

  /**
   * @method apiTest
   * @desc connect to bl-status API test endpoint
   */
  public apiTest() {
    // set API url
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
    // set API url
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
    // set API url
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
    // set http headers
    var headers = new Headers({ 'Content-Type': 'application/json' });
    var options = new RequestOptions({ headers: headers });

    // set API url
    const url = this.urlRoot + '/file-delete/';

    // set http POST body data
    var data = {
      pattern: pattern,
      fileName: fileName,
      fileType: "Pallet Tags"
    };

    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
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
    // set http headers
    var headers = new Headers({ 'Content-Type': 'application/json' });
    var options = new RequestOptions({ headers: headers });

    // set API url
    const url = this.urlRoot + '/update-many-by-pattern/';

    // set http POST body data
    var data = {
      update_pattern: pattern,
      update_data: update
    };

    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
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
    // set http headers
    var headers = new Headers({ 'Content-Type': 'application/json' });
    var options = new RequestOptions({ headers: headers });

    // set API url
    const url = this.urlRoot + '/file-delete/';

    // set http POST body data
    var data = {
      pattern: pattern,
      fileName: fileName,
      fileType: "Pallet Worksheet"
    };

    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.post(url, data, options)
      .map((response: Response) => response.json());
  }

  /**
   * @method downloadFile
   * @desc download file (PDF) via the API
   * @param {string} filename the name of the file to be downloaded
   * @param {string} pattern the given pattern associated with the file
   */
  public downloadFile(filename: string, pattern: string, fileType: string){
    // set http headers
    let headers = new Headers({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    let options = new RequestOptions({ headers: headers });
    options.responseType = ResponseContentType.Blob;

    // set API url
    const url = this.urlRoot + '/file-download/';

    // set http POST body data
    var data = {
      file: filename,
      pattern: pattern,
      fileType: fileType
    };

    // create an Observable for the HTTP/REST API call and transform (map) the response (Binary)
    return this.http.post(url, data, options)
      .map((response: Response) => response);
  }

  /**
   * @method getLogs
   * @description retrieve log data from the API, based on date range
   * @param type
   * @param startDate
   * @param endDate
   */
  public getLogs(type: string, startDate: string, endDate: string) {
    // set API url
    const url = this.urlRoot + '/log-view/?logType=' + type + '&startDate=' + startDate + '&endDate=' + endDate;

    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    console.log("getLogs url: " + url)
    return this.http.get(url)
      .map((response: Response) => response.json());

  }

  /**
   * @method getAJob
   * @description get job information for a single job from the pyACCESS (Job Ticket) API
   * @param {string} jobnum the given EMS Job number
   */
  public getAJob(jobnum: string) {
    // set API url
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
    // set API url
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
    // set API url
    const url = this.urlJTRoot + '/api/jobdetails?jobnum=' + jobnum;

    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response.json());
  }

}
