import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import 'rxjs/Rx';

@Injectable()
export class DataService {

  constructor(private http: Http) { }

  // API endpoint root URL
  urlRoot: string = 'http://172.16.248.19:8080/api'; // test

  apiTest() {
    const url = this.urlRoot + '/';
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response);
  }

  getAllStatuses() {
    const url = this.urlRoot + '/all-statuses/';
    // create an Observable for the HTTP/REST API call and transform (map) the response to a JSON array
    return this.http.get(url)
      .map((response: Response) => response.json());
  }
}
