declare var moment: any;  /** prevent TypeScript typings error when using non-TypeSCript Lib (momentJS) */
import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import { HttpParams } from '@angular/common/http';
import 'rxjs/Rx';
//
import { AuthenticationService } from './auth/auth.service';

@Injectable()
export class FileTransferService {

  constructor(private http: Http, private authenticationService: AuthenticationService) { }

  // bl-status API endpoint root URL
  urlRoot: string = 'http://172.16.248.19:8080/api'; // test

  /**
   * @method uploadFile
   * @description post a file to the server via API
   * @param formData file data to be uploaded
   * @param options http options
   * @param pattern the job pattern associated with this file
   * @param fileType Pallet Tags or Pallet Worksheet
   */
  uploadFile(formData, pattern, fileType, clientFilePath) {
    var user = this.authenticationService.getUsername();
    var clientFilePath = clientFilePath;
    var serverFilePath = "";
    var filePostDateTime = moment().format();
    var isReplacement = false;

    var fileParams = {
      pattern: pattern,
      file_type: fileType,
      user: user,
      client_file_path: clientFilePath,
      server_file_path: serverFilePath,
      file_post_date_time: filePostDateTime,
      is_replacement: isReplacement,
      replacement_count: 0,
      download_count: 0
    }

    return this.http.post(this.urlRoot + '/file-upload/',
      formData,
      {
        params: fileParams
      })
      .map((response: Response) => {
        return response;
      });
  }
}
