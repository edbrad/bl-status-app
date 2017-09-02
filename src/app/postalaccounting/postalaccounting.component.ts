import { Component, OnInit } from '@angular/core';
//
import { ToastrService } from 'ngx-toastr';
import { FileUploader } from 'ng2-file-upload/ng2-file-upload';
//
import { LoggingService } from '../logging.service';
import { FileTransferService } from '../fileTransfer.service';

@Component({
  selector: 'app-postalaccounting',
  templateUrl: './postalaccounting.component.html',
  styleUrls: ['./postalaccounting.component.css']
})
export class PostalaccountingComponent implements OnInit {

  urlRoot: string = 'http://172.16.248.19:8080/api'; // test

  public uploader: FileUploader = new FileUploader({url: this.urlRoot + "/fileupload/"});

  constructor(private logger: LoggingService,
    private fts: FileTransferService,
    private toastr: ToastrService) { }

  ngOnInit() {
    // log the event
    this.logger.addToLog("INFO", "Postal Accounting Component activated.").subscribe((data => {
      const ack = data;
      if (!ack){
        this.toastr.error('Logging Error!', 'bl-status: Logging Service');
      }
    }));
  }

  upload(){
    var formData = new FormData();
    var pattern = "1111-01A";
    var fileType = "Pallet Tags"
    var sourcePath = "Source File Path Goes Here..."
    var result = {};
    formData.append
    this.fts.uploadFile(formData, pattern, fileType, sourcePath).subscribe((data => {
      result = data;
      console.log("result: " + result);
    }));
  }

}
